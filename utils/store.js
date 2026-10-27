// 数据层：云端数据库是唯一可信数据源，本地 storage 只作启动加速缓存
var LEVELS = [
  { id: 1, name: '会默写', color: '#07c160', bg: '#e6f7ee' },
  { id: 2, name: '会认', color: '#1485ee', bg: '#e8f2fd' },
  { id: 3, name: '模棱两可', color: '#ff976a', bg: '#fff3ec' },
  { id: 4, name: '完全不会', color: '#909399', bg: '#f0f1f2' }
]

var COLLECTION = 'words'
var CACHE_KEY = 'words_cache'
var LOG_COLLECTION = 'logs'
var LOGS_CACHE_KEY = 'logs_cache'
var FETCH_PAGE = 20
var FETCH_CONCURRENCY = 10
var IMPORT_CONCURRENCY = 20

var words = []
var localLoaded = false
var synced = false
var logs = []
var logsLocalLoaded = false
var logsSynced = false

function levelInfo(id) {
  for (var i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i].id === id) return LEVELS[i]
  }
  return LEVELS[3]
}

function normalize(w) {
  return String(w == null ? '' : w).trim().toLowerCase()
}

function db() {
  return wx.cloud.database().collection(COLLECTION)
}

function logDb() {
  return wx.cloud.database().collection(LOG_COLLECTION)
}

function persist() {
  try {
    wx.setStorageSync(CACHE_KEY, words)
  } catch (e) {
    // 缓存写入失败（如超 1MB）可忽略，云端仍是完整数据
  }
  // 写过缓存后内存数组即等同于缓存，防止后续 ensureLocal 用旧缓存覆盖掉未落盘的修改
  localLoaded = true
}

function ensureLocal() {
  if (!localLoaded) {
    try {
      words = wx.getStorageSync(CACHE_KEY) || []
    } catch (e) {
      words = []
    }
    localLoaded = true
  }
  return words
}

// 分页拉取全部单词。小程序端 get() 单次硬上限 20 条且超出会静默截断（不报错），
// 所以必须先 count() 拿总数，再按 20 条/页分批并行拉取。
// 次序加 _id 是因为批量导入的单词 createdAt 相同，只用 createdAt 排序时分页会不稳定。
async function fetchAll() {
  var total = (await db().count()).total
  var pages = Math.ceil(total / FETCH_PAGE)
  var all = []
  for (var b = 0; b < pages; b += FETCH_CONCURRENCY) {
    var requests = []
    var end = Math.min(b + FETCH_CONCURRENCY, pages)
    for (var i = b; i < end; i++) {
      requests.push(
        db().orderBy('createdAt', 'desc').orderBy('_id', 'asc')
          .skip(i * FETCH_PAGE).limit(FETCH_PAGE).get()
      )
    }
    var results = await Promise.all(requests)
    results.forEach(function (r) { all = all.concat(r.data) })
  }
  var seen = {}
  var unique = []
  all.forEach(function (d) {
    if (!seen[d._id]) { seen[d._id] = true; unique.push(d) }
  })
  return unique
}

async function loadWords() {
  var data = await fetchAll()
  words = data.map(function (d) {
    return {
      _id: d._id,
      word: d.word,
      wordLower: d.wordLower,
      meaning: d.meaning || '',
      level: d.level,
      reviewCount: d.reviewCount || 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }
  })
  localLoaded = true
  synced = true
  persist()
  return words
}

// ---------- 分类移动日志（独立 logs 集合）----------

function persistLogs() {
  try {
    wx.setStorageSync(LOGS_CACHE_KEY, logs)
  } catch (e) {
    // 同 words：缓存写失败可忽略，云端是完整数据
  }
  logsLocalLoaded = true
}

function ensureLogsLocal() {
  if (!logsLocalLoaded) {
    try {
      logs = wx.getStorageSync(LOGS_CACHE_KEY) || []
    } catch (e) {
      logs = []
    }
    logsLocalLoaded = true
  }
  return logs
}

async function fetchLogs() {
  var total = (await logDb().count()).total
  var pages = Math.ceil(total / FETCH_PAGE)
  var all = []
  for (var b = 0; b < pages; b += FETCH_CONCURRENCY) {
    var requests = []
    var end = Math.min(b + FETCH_CONCURRENCY, pages)
    for (var i = b; i < end; i++) {
      requests.push(logDb().orderBy('ts', 'desc').skip(i * FETCH_PAGE).limit(FETCH_PAGE).get())
    }
    var results = await Promise.all(requests)
    results.forEach(function (r) { all = all.concat(r.data) })
  }
  var seen = {}
  var unique = []
  all.forEach(function (d) {
    if (!seen[d._id]) { seen[d._id] = true; unique.push(d) }
  })
  return unique
}

async function loadLogs() {
  var data = await fetchLogs()
  logs = data.map(function (d) {
    return { _id: d._id, type: d.type || 'move', wordLower: d.wordLower, from: d.from, to: d.to, ts: d.ts }
  })
  logsLocalLoaded = true
  logsSynced = true
  persistLogs()
  return logs
}

// 记一笔移动日志。fire-and-forget：logs 集合未创建等问题不能影响移动本身
function logMove(wordLower, from, to) {
  var doc = { wordLower: wordLower, from: from, to: to, ts: Date.now() }
  logDb().add({ data: doc })
    .then(function (res) {
      logs.push(Object.assign({ _id: res._id }, doc))
      persistLogs()
    })
    .catch(function (e) {
      console.warn('移动日志写入失败（logs 集合可能未创建）', e)
    })
}

// 四窗口（当天 + 7/15/30 天）分类流动，按"净变化"统计：
// 窗口内同一单词移走又移回的往返对冲清零（含绕路回原点），
// 每个词每窗口最多计一笔——首条日志的 from → 末条日志的 to
// 当天按自然日（今天 0 点起），其余为滚动窗口
function flowStats() {
  ensureLogsLocal()
  var day = 24 * 3600 * 1000
  var now = Date.now()
  var cutoffs = [startOfToday(), now - 7 * day, now - 15 * day, now - 30 * day]
  var up = [0, 0, 0, 0]
  var down = [0, 0, 0, 0]
  var pairMap = {}

  var valid = []
  logs.forEach(function (l) {
    if (!l || !l.ts || !l.from || !l.to || l.from === l.to) return
    valid.push(l)
  })
  valid.sort(function (a, b) { return a.ts - b.ts })

  cutoffs.forEach(function (cutoff, wi) {
    var net = {}
    valid.forEach(function (l) {
      if (l.ts < cutoff) return
      var n = net[l.wordLower]
      if (n) {
        n.to = l.to
      } else {
        net[l.wordLower] = { from: l.from, to: l.to }
      }
    })
    for (var w in net) {
      var n = net[w]
      if (n.from === n.to) continue
      var key = n.from + '-' + n.to
      if (!pairMap[key]) pairMap[key] = { from: n.from, to: n.to, counts: [0, 0, 0, 0] }
      pairMap[key].counts[wi]++
      if (n.to < n.from) up[wi]++
      else down[wi]++
    }
  })

  var pairs = []
  for (var k in pairMap) pairs.push(pairMap[k])
  // 晋级（to < from）行排在退步行之前，组内按近一月数量降序
  pairs.sort(function (a, b) {
    var aUp = a.to < a.from
    var bUp = b.to < b.from
    if (aUp !== bUp) return aUp ? -1 : 1
    return b.counts[3] - a.counts[3]
  })
  return { up: up, down: down, pairs: pairs }
}

// 记一笔复习日志。fire-and-forget：写失败不影响复习计数本身
function logReview(wordLower) {
  var doc = { type: 'review', wordLower: wordLower, ts: Date.now() }
  logDb().add({ data: doc })
    .then(function (res) {
      logs.push(Object.assign({ _id: res._id }, doc))
      persistLogs()
    })
    .catch(function (e) {
      console.warn('复习日志写入失败（logs 集合可能未创建）', e)
    })
}

// 四窗口（当天 + 7/15/30 天）复习次数。旧数据无复习日志，从启用起开始积累
function reviewStats() {
  ensureLogsLocal()
  var day = 24 * 3600 * 1000
  var now = Date.now()
  var cutoffs = [startOfToday(), now - 7 * day, now - 15 * day, now - 30 * day]
  var counts = [0, 0, 0, 0]
  logs.forEach(function (l) {
    if (!l || l.type !== 'review' || !l.ts) return
    for (var wi = 0; wi < 4; wi++) {
      if (l.ts >= cutoffs[wi]) counts[wi]++
    }
  })
  return counts
}

function isSynced() {
  return synced
}

function isLogsSynced() {
  return logsSynced
}

function hasLocal() {
  ensureLocal()
  return words.length > 0
}

function stats() {
  ensureLocal()
  var counts = [0, 0, 0, 0]
  words.forEach(function (w) {
    if (w.level >= 1 && w.level <= 4) counts[w.level - 1]++
  })
  return { total: words.length, counts: counts }
}

function query(keyword, level) {
  ensureLocal()
  var k = normalize(keyword)
  var kw = String(keyword || '').trim()
  return words.filter(function (w) {
    if (level !== 0 && w.level !== level) return false
    if (!k) return true
    if (w.wordLower.indexOf(k) >= 0) return true
    return !!kw && (w.meaning || '').indexOf(kw) >= 0
  })
}

// 当天 0 点（本地时区）的时间戳，用于"当天"自然日窗口
function startOfToday() {
  var d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// 最近录入统计：当天 + 7/15/30 天滚动窗口 × 当前分类
// 当天按自然日（今天 0 点起），其余为滚动窗口
function recentStats() {
  ensureLocal()
  var day = 24 * 3600 * 1000
  var now = Date.now()
  var todayStart = startOfToday()
  var today = [0, 0, 0, 0]
  var week = [0, 0, 0, 0]
  var half = [0, 0, 0, 0]
  var month = [0, 0, 0, 0]
  words.forEach(function (w) {
    var lv = w.level
    if (lv < 1 || lv > 4) return
    var ts = w.createdAt || 0
    var age = now - ts
    if (ts >= todayStart) today[lv - 1]++
    if (age <= 30 * day) month[lv - 1]++
    if (age <= 15 * day) half[lv - 1]++
    if (age <= 7 * day) week[lv - 1]++
  })
  return { today: today, week: week, half: half, month: month }
}

function findConflict(key, excludeId) {
  for (var i = 0; i < words.length; i++) {
    if (words[i]._id !== excludeId && words[i].wordLower === key) return words[i]
  }
  return null
}

async function addWord(input) {
  var word = String(input.word || '').trim()
  var key = normalize(word)
  if (!key) return { ok: false, error: 'empty' }
  var conflict = findConflict(key)
  if (conflict) return { ok: false, conflict: conflict }
  var now = Date.now()
  var doc = {
    word: word,
    wordLower: key,
    meaning: String(input.meaning || '').trim(),
    level: input.level,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now
  }
  var res = await db().add({ data: doc })
  var rec = Object.assign({ _id: res._id }, doc)
  words.unshift(rec)
  persist()
  return { ok: true, record: rec }
}

async function updateWord(id, patch) {
  var rec = null
  for (var i = 0; i < words.length; i++) {
    if (words[i]._id === id) { rec = words[i]; break }
  }
  if (!rec) return { ok: false, error: 'notfound' }
  var word = patch.word !== undefined ? String(patch.word).trim() : rec.word
  var key = normalize(word)
  if (!key) return { ok: false, error: 'empty' }
  var conflict = findConflict(key, id)
  if (conflict) return { ok: false, conflict: conflict }
  var data = {
    word: word,
    wordLower: key,
    meaning: patch.meaning !== undefined ? String(patch.meaning).trim() : rec.meaning,
    level: patch.level !== undefined ? patch.level : rec.level,
    updatedAt: Date.now()
  }
  await db().doc(id).update({ data: data })
  var oldLevel = rec.level
  Object.assign(rec, data)
  if (data.level !== oldLevel) {
    logMove(rec.wordLower, oldLevel, data.level)
  }
  persist()
  return { ok: true, record: rec }
}

async function moveWord(id, level) {
  return updateWord(id, { level: level })
}

async function deleteWord(id) {
  await db().doc(id).remove()
  words = words.filter(function (w) { return w._id !== id })
  persist()
  return { ok: true }
}

// 会默写单词记一次复习，次数 +1
async function reviewWord(id) {
  var rec = null
  for (var i = 0; i < words.length; i++) {
    if (words[i]._id === id) { rec = words[i]; break }
  }
  if (!rec) return { ok: false, error: 'notfound' }
  var count = (rec.reviewCount || 0) + 1
  await db().doc(id).update({ data: { reviewCount: count } })
  rec.reviewCount = count
  logReview(rec.wordLower)
  persist()
  return { ok: true, count: count }
}

// 解析批量粘贴文本：按换行/逗号/分号切段，段内"英文 中文"拆出释义
function parseImportText(text) {
  var items = []
  var invalid = []
  String(text || '').split(/[\n\r\t,，;；]+/).forEach(function (raw) {
    var seg = raw.trim()
    if (!seg) return
    var word = seg
    var meaning = ''
    var m = seg.match(/^(.+?)[\s]*([一-鿿·]+)$/)
    if (m) {
      word = m[1].trim()
      meaning = m[2].trim()
    }
    if (!/[a-zA-Z]/.test(word) || /[一-鿿]/.test(word)) {
      invalid.push(seg)
      return
    }
    items.push({ word: word, meaning: meaning })
  })
  return { items: items, invalid: invalid }
}

async function importWords(items, level) {
  var existing = {}
  words.forEach(function (w) { existing[w.wordLower] = true })
  var seen = {}
  var toAdd = []
  var skipped = []
  items.forEach(function (it) {
    var word = String(it.word || '').trim()
    var key = normalize(word)
    if (!key) return
    if (existing[key] || seen[key]) {
      skipped.push(word)
      return
    }
    seen[key] = true
    var now = Date.now()
    toAdd.push({
      word: word,
      wordLower: key,
      meaning: String(it.meaning || '').trim(),
      level: level,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now
    })
  })
  var added = 0
  var failed = []
  for (var i = 0; i < toAdd.length; i += IMPORT_CONCURRENCY) {
    var chunk = toAdd.slice(i, i + IMPORT_CONCURRENCY)
    var results = await Promise.all(chunk.map(function (d) {
      return db().add({ data: d })
        .then(function (r) { return r._id })
        .catch(function () { return null })
    }))
    results.forEach(function (id, idx) {
      if (id) {
        words.push(Object.assign({ _id: id }, chunk[idx]))
        added++
      } else {
        failed.push(chunk[idx].word)
      }
    })
  }
  words.sort(function (a, b) { return b.createdAt - a.createdAt })
  persist()
  return { added: added, skipped: skipped, failed: failed }
}

module.exports = {
  LEVELS: LEVELS,
  levelInfo: levelInfo,
  normalize: normalize,
  ensureLocal: ensureLocal,
  loadWords: loadWords,
  loadLogs: loadLogs,
  isSynced: isSynced,
  isLogsSynced: isLogsSynced,
  flowStats: flowStats,
  reviewStats: reviewStats,
  hasLocal: hasLocal,
  all: ensureLocal,
  stats: stats,
  query: query,
  recentStats: recentStats,
  addWord: addWord,
  updateWord: updateWord,
  moveWord: moveWord,
  deleteWord: deleteWord,
  reviewWord: reviewWord,
  parseImportText: parseImportText,
  importWords: importWords
}
