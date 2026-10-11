const store = require('../../utils/store')

Page({
  data: {
    levels: store.LEVELS,
    level: 1,
    text: '',
    preview: null,
    importing: false
  },

  onShow: function () {
    if (!store.isSynced()) {
      wx.showLoading({ title: '加载词库', mask: true })
      store.loadWords()
        .then(function () { wx.hideLoading() })
        .catch(function () {
          wx.hideLoading()
          wx.showToast({ title: '云端加载失败，无法查重', icon: 'none', duration: 2500 })
        })
    }
  },

  onText: function (e) {
    this.setData({ text: e.detail.value, preview: null })
  },

  pickLevel: function (e) {
    this.setData({ level: +e.currentTarget.dataset.level, preview: null })
  },

  doParse: function () {
    if (!String(this.data.text || '').trim()) {
      wx.showToast({ title: '先粘贴一些单词', icon: 'none' })
      return
    }
    var parsed = store.parseImportText(this.data.text)
    var map = {}
    store.all().forEach(function (w) { map[w.wordLower] = true })
    var seen = {}
    var items = []
    var dupCount = 0
    parsed.items.forEach(function (it) {
      var key = store.normalize(it.word)
      var dup = map[key] || seen[key]
      seen[key] = true
      if (dup) dupCount++
      items.push({ word: it.word, meaning: it.meaning, dup: !!dup })
    })
    this.setData({
      preview: {
        shown: items.slice(0, 100),
        hidden: Math.max(0, items.length - 100),
        invalid: parsed.invalid,
        invalidText: parsed.invalid.slice(0, 5).join('、'),
        dupCount: dupCount,
        newCount: items.length - dupCount
      }
    })
  },

  doImport: function () {
    if (this.data.importing) return
    var p = this.data.preview
    if (!p || p.newCount === 0) return
    var that = this
    this.setData({ importing: true })
    wx.showLoading({ title: '导入中…', mask: true })
    // importWords 内部会再次查重，已存在的自动跳过，所以直接传全量解析结果
    var items = store.parseImportText(this.data.text).items
    store.importWords(items, this.data.level)
      .then(function (res) {
        wx.hideLoading()
        that.setData({ importing: false, text: '', preview: null })
        wx.showModal({
          title: '导入完成',
          content: '新增 ' + res.added + ' 个' +
            (res.skipped.length ? '，跳过已存在 ' + res.skipped.length + ' 个' : '') +
            (res.failed.length ? '，失败 ' + res.failed.length + ' 个（可重新导入重试）' : ''),
          showCancel: false,
          success: function () {
            if (res.added > 0) wx.navigateBack()
          }
        })
      })
      .catch(function () {
        wx.hideLoading()
        that.setData({ importing: false })
        wx.showToast({ title: '导入失败，请重试', icon: 'none' })
      })
  }
})
