const store = require('../../utils/store')

Page({
  data: {
    levels: store.LEVELS,
    counts: [0, 0, 0, 0],
    percents: [0, 0, 0, 0],
    total: 0,
    synced: false,
    hasLocal: false
  },

  onShow: function () {
    this.refresh()
    if (!store.isSynced()) this.sync()
  },

  onPullDownRefresh: function () {
    this.sync(true)
  },

  refresh: function () {
    var s = store.stats()
    var percents = s.counts.map(function (c) {
      return s.total > 0 ? Math.round(c * 100 / s.total) : 0
    })
    this.setData({
      counts: s.counts,
      percents: percents,
      total: s.total,
      synced: store.isSynced(),
      hasLocal: store.hasLocal()
    })
  },

  sync: function (fromPull) {
    var that = this
    store.loadWords()
      .then(function () {
        if (fromPull) wx.stopPullDownRefresh()
        that.refresh()
      })
      .catch(function () {
        if (fromPull) wx.stopPullDownRefresh()
        that.refresh()
        wx.showToast({ title: '云端加载失败，请检查云开发配置', icon: 'none', duration: 2500 })
      })
  },

  goList: function (e) {
    wx.navigateTo({ url: '/pages/list/list?level=' + e.currentTarget.dataset.level })
  },

  goAdd: function () {
    wx.navigateTo({ url: '/pages/list/list?add=1' })
  },

  goImport: function () {
    wx.navigateTo({ url: '/pages/import/import' })
  }
})
