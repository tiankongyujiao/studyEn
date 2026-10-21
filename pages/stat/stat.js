const students = require('../../utils/students')

// 常用语模板：{names} 会被已选学生替换，改这里即可增删常用语
var PHRASES = [
  { key: 'dictation', label: '默写', text: '今日默写全对：\n✨{names}✨\n表扬以上同学[表情]' },
  { key: 'names', label: '仅姓名', text: '{names}' }
]

var byId = {}
students.forEach(function (s) { byId[s.id] = s })

Page({
  data: {
    students: students,
    selectedIds: [],
    selected: {},
    selectedCount: 0,
    mode: 'name',
    phraseIndex: 0,
    phraseLabels: PHRASES.map(function (p) { return p.label }),
    phraseLabel: PHRASES[0].label,
    message: ''
  },

  onLoad: function () {
    this.setData({ message: this.buildMessage() })
  },

  renderNames: function () {
    var mode = this.data.mode
    return this.data.selectedIds.map(function (id) {
      var s = byId[id]
      if (!s) return ''
      return mode === 'id' ? String(s.id) : s.name
    }).filter(function (x) { return x }).join('、')
  },

  buildMessage: function () {
    var tpl = PHRASES[this.data.phraseIndex].text
    return tpl.replace('{names}', this.renderNames())
  },

  refresh: function () {
    this.setData({ message: this.buildMessage() })
  },

  onCardTap: function (e) {
    var id = +e.currentTarget.dataset.id
    var ids = this.data.selectedIds.slice()
    var sel = Object.assign({}, this.data.selected)
    var i = ids.indexOf(id)
    if (i >= 0) {
      ids.splice(i, 1)
      delete sel[id]
    } else {
      ids.push(id)
      sel[id] = true
    }
    this.setData({ selectedIds: ids, selected: sel, selectedCount: ids.length })
    this.refresh()
  },

  onPhraseChange: function (e) {
    var idx = +e.detail.value
    this.setData({ phraseIndex: idx, phraseLabel: PHRASES[idx].label })
    this.refresh()
  },

  onModeChange: function (e) {
    this.setData({ mode: e.detail.value ? 'id' : 'name' })
    this.refresh()
  },

  onSort: function () {
    var ids = this.data.selectedIds.slice().sort(function (a, b) { return a - b })
    this.setData({ selectedIds: ids })
    this.refresh()
  },

  onClear: function () {
    this.setData({ selectedIds: [], selected: {}, selectedCount: 0 })
    this.refresh()
  },

  onMessageInput: function (e) {
    this.setData({ message: e.detail.value })
  },

  onClearEditor: function () {
    this.setData({ message: '' })
  },

  onCopy: function () {
    var text = this.data.message
    if (!String(text).trim()) {
      wx.showToast({ title: '内容为空', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: text })
  }
})
