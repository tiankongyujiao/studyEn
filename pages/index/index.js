const store = require('../../utils/store')

Page({
  data: {
    levels: store.LEVELS,
    counts: [0, 0, 0, 0],
    percents: [0, 0, 0, 0],
    total: 0,
    recentRows: [],
    reviewCells: [],
    flowUp: [0, 0, 0, 0],
    flowDown: [0, 0, 0, 0],
    flowRows: [],
    flowExpanded: false,
    activeTab: 0,
    synced: false,
    hasLocal: false
  },

  onTabTap: function (e) {
    var t = +e.currentTarget.dataset.tab
    if (t !== this.data.activeTab) this.setData({ activeTab: t })
  },

  toggleFlow: function () {
    this.setData({ flowExpanded: !this.data.flowExpanded })
  },

  onShow: function () {
    this.refresh()
    if (!store.isSynced() || !store.isLogsSynced()) this.sync()
  },

  onPullDownRefresh: function () {
    this.sync(true)
  },

  refresh: function () {
    var s = store.stats()
    var percents = s.counts.map(function (c) {
      return s.total > 0 ? Math.round(c * 100 / s.total) : 0
    })
    var r = store.recentStats()
    var recentRows = store.LEVELS.map(function (l, i) {
      return {
        id: l.id,
        name: l.name,
        color: l.color,
        today: r.today[i],
        week: r.week[i],
        half: r.half[i],
        month: r.month[i]
      }
    })
    var f = store.flowStats()
    var flowRows = f.pairs.map(function (p) {
      return {
        key: p.from + '-' + p.to,
        fromName: store.levelInfo(p.from).name,
        toName: store.levelInfo(p.to).name,
        up: p.to < p.from,
        counts: p.counts
      }
    })
    var labels = ['当天', '当周', '当前半月', '当月']
    var reviewCells = store.reviewStats().map(function (n, i) {
      return { num: n, label: labels[i] }
    })
    this.setData({
      counts: s.counts,
      percents: percents,
      total: s.total,
      recentRows: recentRows,
      reviewCells: reviewCells,
      flowUp: f.up,
      flowDown: f.down,
      flowRows: flowRows,
      synced: store.isSynced(),
      hasLocal: store.hasLocal()
    })
  },

  sync: function (fromPull) {
    var that = this
    var tasks = [store.loadWords()]
    if (!store.isLogsSynced()) {
      // 日志加载失败静默处理，流动卡显示 0 即可，不影响主流程
      tasks.push(store.loadLogs().catch(function () { return null }))
    }
    Promise.all(tasks)
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
  },

  goStat: function () {
    wx.navigateTo({ url: '/pages/stat/stat' })
  }
})
