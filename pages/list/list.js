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
    hideMeaning: false
  },

  onLoad: function (options) {
    this.shown = PAGE_SIZE
    this.submittingFlag = false
    var level = parseInt(options.level, 10)
    this.setData({
      current: level >= 1 && level <= 4 ? level : 0,
      hideMeaning: wx.getStorageSync('list_hide_meaning') === true
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
    var list = store.query(this.data.keyword, this.data.current)
    var s = store.stats()
    var shown = list.slice(0, this.shown)
    this.setData({
      items: shown.map(function (w) {
        var info = store.levelInfo(w.level)
        return Object.assign({}, w, {
          levelName: info.name,
          levelColor: info.color,
          levelBg: info.bg,
          timeText: formatTime(w.updatedAt || w.createdAt)
        })
      }),
      matched: list.length,
      shownCount: shown.length,
      hasMore: shown.length < list.length,
      tabCounts: [s.total].concat(s.counts)
    })
  },

  onSearch: function (e) {
    this.setData({ keyword: e.detail.value })
    this.filter(true)
  },

  clearSearch: function () {
    this.setData({ keyword: '' })
    this.filter(true)
  },

  toggleMeaning: function () {
    var v = !this.data.hideMeaning
    this.setData({ hideMeaning: v })
    wx.setStorageSync('list_hide_meaning', v)
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
