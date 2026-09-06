/**
 * preload — 渲染进程安全桥
 * 暴露 window.canvasDesktop：应用内更新 API + 运行时版本信息。
 * contextIsolation 默认开启，仅经 contextBridge 暴露白名单方法。
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('canvasDesktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  // ---- 应用内更新 ----
  getUpdateState: () => ipcRenderer.invoke('canvas:update-state'),
  checkUpdate: () => ipcRenderer.invoke('canvas:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('canvas:update-download'),
  applyUpdate: () => ipcRenderer.invoke('canvas:update-apply'),
  /** 订阅更新下载进度（0-100）；返回取消订阅函数 */
  onUpdateProgress: (cb) => {
    const listener = (_event, percent) => cb(percent)
    ipcRenderer.on('canvas:update-progress', listener)
    return () => ipcRenderer.removeListener('canvas:update-progress', listener)
  },
})
