App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请在开发者工具「详情-基础库版本」中切换到较新版本')
      return
    }
    // env 不传则默认使用第一个创建的云环境
    wx.cloud.init({ 
      env: 'cloud1-d9g4g8uj3725706c6',
      traceUser: true 
    })
  }
})
