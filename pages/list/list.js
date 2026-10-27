const store = require('../../utils/store')
const dict = require('../../utils/dict')

var TABS = [{ id: 0, name: '全部' }].concat(store.LEVELS)
var PAGE_SIZE = 100
var SUGGEST_LIMIT = 6
var SUGGEST_EXISTING = 3

// 输入联想：优先展示已录入的同前缀单词（顺便防重复），不足的部分用内置词表补足
function buildSuggestions(value) {
  var v = String(value || '').trim().toLowerCase()
  if (!v) return []
  var seen = {}
  var out = []
  var all = store.all()
  for (var i = 0; i < all.length; i++) {
    var w = all[i]
    if (w.wordLower === v) return []
    if (out.length >= SUGGEST_EXISTING || seen[w.wordLower]) continue
    if (w.wordLower.indexOf(v) !== 0) continue
    seen[w.wordLower] = true
    out.push(w.word)
  }
  var rest = dict.suggest(v, SUGGEST_LIMIT * 3)
  for (var j = 0; j < rest.length && out.length < SUGGEST_LIMIT; j++) {
    if (rest[j] === v || seen[rest[j]]) continue
    seen[rest[j]] = true
    out.push(rest[j])
  }
  return out
}

function formatTime(ts) {
  if (!ts) return ''
  var d = new Date(ts)
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  return d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '-' + md : md
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function dayKey(ts) {
  var d = new Date(ts)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

// 分组键按录入时间生成，零填充保证字符串排序即时间排序
function groupKeyOf(ts, mode) {
  var d = new Date(ts)
  if (mode === 'year') return '' + d.getFullYear()
  if (mode === 'month') return d.getFullYear() + '-' + pad2(d.getMonth() + 1)
  return dayKey(ts)
}

function groupLabelOf(key, mode) {
  var now = new Date()
  if (mode === 'year') return key + ' 年'
  var p = key.split('-')
  var y = +p[0]
  var yPrefix = y === now.getFullYear() ? '' : y + '年'
  if (mode === 'month') return yPrefix + (+p[1]) + '月'
  if (mode === 'day') {
    var t = new Date()
    t.setHours(0, 0, 0, 0)
    var today = t.getTime()
    if (key === dayKey(today)) return '今天'
    if (key === dayKey(today - 86400000)) return '昨天'
    return yPrefix + (+p[1]) + '月' + (+p[2]) + '日'
  }
  return key
}

function cmpId(a, b) {
  return a._id < b._id ? -1 : a._id > b._id ? 1 : 0
}

function cmpTimeDesc(a, b) {
  return b.createdAt - a.createdAt || cmpId(a, b)
}

// 排序四档：时间/复习次数 × 倒序/正序；次数并列时按录入时间倒序
var SORTERS = {
  'time-desc': cmpTimeDesc,
  'time-asc': function (a, b) { return a.createdAt - b.createdAt || cmpId(a, b) },
  'count-desc': function (a, b) { return (b.reviewCount || 0) - (a.reviewCount || 0) || cmpTimeDesc(a, b) },
  'count-asc': function (a, b) { return (a.reviewCount || 0) - (b.reviewCount || 0) || cmpTimeDesc(a, b) }
}

function mapItem(w) {
  var info = store.levelInfo(w.level)
  return Object.assign({}, w, {
    levelName: info.name,
    levelColor: info.color,
    levelBg: info.bg,
    timeText: formatTime(w.updatedAt || w.createdAt)
  })
}

Page({
  data: {
    tabs: TABS,
    levels: store.LEVELS,
    current: 0,
    keyword: '',
    items: [],
    matched: 0,
    shownCount: 0,
    tabCounts: [0, 0, 0, 0, 0],
    showForm: false,
    editingId: '',
    formTitle: '新增单词',
    formWord: '',
    formMeaning: '',
    formLevel: 1,
    wordFocus: false,
    suggestions: [],
    displayMode: 'both',
    sortMode: 'time-desc',
    groupBy: '',
    expandAll: true,
    groupOpen: {},
    groups: [],
    showDrawer: false
  },

  onLoad: function (options) {
    this.shown = PAGE_SIZE
    this.submittingFlag = false
    var level = parseInt(options.level, 10)
    var mode = wx.getStorageSync('list_display_mode')
    if (['en', 'zh', 'both'].indexOf(mode) < 0) {
      // 旧版"隐藏释义"开关迁移：隐藏过释义的对应"只显示英文"
      mode = wx.getStorageSync('list_hide_meaning') === true ? 'en' : 'both'
      try { wx.removeStorageSync('list_hide_meaning') } catch (e) {}
    }
    var view = {}
    try { view = wx.getStorageSync('list_view_settings') || {} } catch (e) {}
    var sortMode = ['time-desc', 'time-asc', 'count-desc', 'count-asc'].indexOf(view.sort) >= 0 ? view.sort : 'time-desc'
    var groupBy = ['', 'day', 'month', 'year'].indexOf(view.group) >= 0 ? view.group : ''
    this.setData({
      current: level >= 1 && level <= 4 ? level : 0,
      displayMode: mode,
      sortMode: sortMode,
      groupBy: groupBy,
      expandAll: typeof view.expandAll === 'boolean' ? view.expandAll : true
    })
    if (options.add === '1') {
      this.setData({ current: 0 })
      this.openForm(null)
    }
  },

  onShow: function () {
    if (!store.isSynced()) {
      var that = this
      wx.showLoading({ title: '加载中', mask: true })
      store.loadWords()
        .then(function () {
          wx.hideLoading()
          that.filter()
        })
        .catch(function () {
          wx.hideLoading()
          wx.showToast({ title: '云端加载失败，请检查网络', icon: 'none' })
          that.filter()
        })
    } else {
      this.filter()
    }
  },

  onPullDownRefresh: function () {
    var that = this
    store.loadWords()
      .then(function () {
        wx.stopPullDownRefresh()
        that.filter()
      })
      .catch(function () {
        wx.stopPullDownRefresh()
        wx.showToast({ title: '刷新失败', icon: 'none' })
      })
  },

  onReachBottom: function () {
    if (this.shown < this.data.matched) {
      this.shown += PAGE_SIZE
      this.filter()
    }
  },

  filter: function (reset) {
    if (reset) this.shown = PAGE_SIZE
    var d = this.data
    var sorter = SORTERS[d.sortMode] || SORTERS['time-desc']
    var list = store.query(d.keyword, d.current).slice().sort(sorter)
    var s = store.stats()
    var shown = list.slice(0, this.shown)
    var mapped = shown.map(mapItem)
    var groups = []
    if (d.groupBy) {
      // 组头总数按完整过滤结果统计，不受分页截断影响
      var totals = {}
      list.forEach(function (w) {
        var k = groupKeyOf(w.createdAt || 0, d.groupBy)
        totals[k] = (totals[k] || 0) + 1
      })
      var byKey = {}
      var order = []
      mapped.forEach(function (m) {
        var k = groupKeyOf(m.createdAt || 0, d.groupBy)
        var g = byKey[k]
        if (!g) {
          g = byKey[k] = { key: k, label: groupLabelOf(k, d.groupBy), open: false, count: totals[k], items: [] }
          order.push(k)
        }
        g.items.push(m)
      })
      // 组按日期排，方向跟随排序的正/倒，与排序字段无关
      var desc = d.sortMode.indexOf('-desc') >= 0
      order.sort(desc
        ? function (a, b) { return a < b ? 1 : a > b ? -1 : 0 }
        : function (a, b) { return a < b ? -1 : a > b ? 1 : 0 })
      groups = order.map(function (k) {
        var g = byKey[k]
        g.open = d.groupOpen[k] !== undefined ? d.groupOpen[k] : d.expandAll
        return g
      })
    }
    this.setData({
      items: mapped,
      groups: groups,
      matched: list.length,
      shownCount: shown.length,
      hasMore: shown.length < list.length,
      tabCounts: [s.total].concat(s.counts)
    })
  },

  persistView: function () {
    try {
      wx.setStorageSync('list_view_settings', {
        sort: this.data.sortMode,
        group: this.data.groupBy,
        expandAll: this.data.expandAll
      })
    } catch (e) {}
  },

  openDrawer: function () {
    this.setData({ showDrawer: true })
  },

  closeDrawer: function () {
    this.setData({ showDrawer: false })
  },

  pickSort: function (e) {
    var v = e.currentTarget.dataset.value
    if (v === this.data.sortMode) return
    this.setData({ sortMode: v })
    this.filter(true)
    this.persistView()
  },

  pickGroup: function (e) {
    var v = e.currentTarget.dataset.value
    // 再点一次已选中的分组 = 取消，回平铺
    var next = v === this.data.groupBy ? '' : v
    if (next === this.data.groupBy) return
    this.setData({ groupBy: next, groupOpen: {} })
    this.filter(true)
    this.persistView()
  },

  toggleExpandAll: function () {
    var v = !this.data.expandAll
    this.setData({ expandAll: v, groupOpen: {} })
    if (this.data.groupBy) {
      var groups = this.data.groups.map(function (g) {
        return Object.assign({}, g, { open: v })
      })
      this.setData({ groups: groups })
    }
    this.persistView()
  },

  toggleGroup: function (e) {
    var i = +e.currentTarget.dataset.index
    var g = this.data.groups[i]
    if (!g) return
    var go = Object.assign({}, this.data.groupOpen)
    var patch = {}
    if (g.open && this.data.expandAll) {
      // 手动收起任一组 → "全部展开"自动取消；其余组保持展开，逐组记录覆盖态
      this.data.groups.forEach(function (x) { go[x.key] = x.open })
      go[g.key] = false
      patch.expandAll = false
    } else {
      go[g.key] = !g.open
    }
    patch.groupOpen = go
    patch['groups[' + i + '].open'] = !g.open
    this.setData(patch)
  },

  onSearch: function (e) {
    this.setData({ keyword: e.detail.value })
    this.filter(true)
  },

  clearSearch: function () {
    this.setData({ keyword: '' })
    this.filter(true)
  },

  setDisplayMode: function (e) {
    var m = e.currentTarget.dataset.mode
    if (m === this.data.displayMode) return
    this.setData({ displayMode: m })
    wx.setStorageSync('list_display_mode', m)
  },

  switchTab: function (e) {
    var id = +e.currentTarget.dataset.id
    if (id === this.data.current) return
    this.setData({ current: id })
    this.filter(true)
  },

  onItemTap: function (e) {
    var id = e.currentTarget.dataset.id
    var rec = null
    store.all().forEach(function (w) {
      if (w._id === id) rec = w
    })
    if (!rec) return
    var that = this
    var canReview = rec.level === 1
    var actions = canReview
      ? ['记一次复习', '修改', '移动分类', '删除']
      : ['修改', '移动分类', '删除']
    wx.showActionSheet({
      itemList: actions,
      success: function (res) {
        var i = res.tapIndex
        if (canReview) {
          if (i === 0) {
            that.doReview(rec)
            return
          }
          i--
        }
        if (i === 0) that.openForm(rec)
        else if (i === 1) that.pickMove(rec)
        else if (i === 2) that.confirmDelete(rec)
      }
    })
  },

  doReview: function (rec) {
    var that = this
    store.reviewWord(rec._id)
      .then(function (r) {
        if (r.ok) {
          wx.showToast({ title: '已复习 ' + r.count + ' 次', icon: 'none' })
          that.filter()
        } else {
          wx.showToast({ title: '记录失败', icon: 'none' })
        }
      })
      .catch(function () {
        wx.showToast({ title: '记录失败', icon: 'none' })
      })
  },

  pickMove: function (rec) {
    var others = store.LEVELS.filter(function (l) { return l.id !== rec.level })
    var that = this
    wx.showActionSheet({
      itemList: others.map(function (l) { return '移到「' + l.name + '」' }),
      success: function (res) {
        var target = others[res.tapIndex]
        store.moveWord(rec._id, target.id)
          .then(function () {
            wx.showToast({ title: '已移到「' + target.name + '」', icon: 'none' })
            that.filter()
          })
          .catch(function () {
            wx.showToast({ title: '移动失败', icon: 'none' })
          })
      }
    })
  },

  confirmDelete: function (rec) {
    var that = this
    wx.showModal({
      title: '删除单词',
      content: '确定删除「' + rec.word + '」吗？',
      confirmColor: '#ee0a24',
      success: function (res) {
        if (!res.confirm) return
        store.deleteWord(rec._id)
          .then(function () {
            wx.showToast({ title: '已删除', icon: 'none' })
            that.filter()
          })
          .catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      }
    })
  },

  onFabTap: function () {
    this.openForm(null)
  },

  noop: function () {},

  openForm: function (rec) {
    if (rec) {
      this.setData({
        showForm: true,
        editingId: rec._id,
        formTitle: '修改单词',
        formWord: rec.word,
        formMeaning: rec.meaning || '',
        formLevel: rec.level,
        wordFocus: false,
        suggestions: []
      })
    } else {
      var level = this.data.current >= 1 && this.data.current <= 4 ? this.data.current : 1
      this.setData({
        showForm: true,
        editingId: '',
        formTitle: '新增单词',
        formWord: '',
        formMeaning: '',
        formLevel: level,
        wordFocus: true,
        suggestions: []
      })
    }
  },

  closeForm: function () {
    this.setData({ showForm: false, suggestions: [] })
    this.submittingFlag = false
  },

  onFormWord: function (e) {
    var v = e.detail.value
    this.setData({ formWord: v, suggestions: buildSuggestions(v) })
  },

  pickSuggestion: function (e) {
    this.setData({ formWord: e.currentTarget.dataset.word, suggestions: [] })
  },

  onFormMeaning: function (e) {
    this.setData({ formMeaning: e.detail.value })
  },

  pickFormLevel: function (e) {
    this.setData({ formLevel: +e.currentTarget.dataset.level })
  },

  submitForm: function () {
    if (this.submittingFlag) return
    var d = this.data
    var word = (d.formWord || '').trim()
    if (!word) {
      wx.showToast({ title: '请输入单词', icon: 'none' })
      return
    }
    this.submittingFlag = true
    var that = this
    var p = d.editingId
      ? store.updateWord(d.editingId, { word: word, meaning: d.formMeaning, level: d.formLevel })
      : store.addWord({ word: word, meaning: d.formMeaning, level: d.formLevel })
    p.then(function (res) {
      that.submittingFlag = false
      if (res.ok) {
        wx.showToast({ title: d.editingId ? '已保存' : '已添加', icon: 'success' })
        if (d.editingId) {
          that.closeForm()
        } else {
          // 连续录入：清空字段、保持弹层、重新聚焦
          that.setData({ formWord: '', formMeaning: '', wordFocus: false, suggestions: [] })
          setTimeout(function () { that.setData({ wordFocus: true }) }, 80)
        }
        that.filter()
      } else if (res.conflict) {
        that.handleConflict(res.conflict, word, d.formLevel)
      } else {
        wx.showToast({ title: '请输入单词', icon: 'none' })
      }
    }).catch(function () {
      that.submittingFlag = false
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    })
  },

  handleConflict: function (conflict, word, level) {
    var that = this
    var fromName = store.levelInfo(conflict.level).name
    var toName = store.levelInfo(level).name
    wx.showModal({
      title: '「' + word + '」已存在',
      content: '它现在的分类是「' + fromName + '」。要把它移动到「' + toName + '」吗？',
      success: function (m) {
        if (!m.confirm) return
        store.moveWord(conflict._id, level)
          .then(function () {
            wx.showToast({ title: '已移动', icon: 'success' })
            that.closeForm()
            that.filter()
          })
          .catch(function () {
            wx.showToast({ title: '移动失败', icon: 'none' })
          })
      }
    })
  }
})
