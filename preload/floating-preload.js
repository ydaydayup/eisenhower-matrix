// 悬浮窗预加载脚本
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 关闭悬浮窗
  closeFloatingWindow: () => ipcRenderer.invoke('closeFloatingWindow'),
  
  // 最小化悬浮窗
  minimizeFloatingWindow: () => ipcRenderer.invoke('minimizeFloatingWindow'),
  
  // 设置点击穿透
  setIgnoreMouseEvents: (ignore, options) => 
    ipcRenderer.invoke('setIgnoreMouseEvents', ignore, options),
  
  // 保存窗口位置
  saveWindowPosition: (position) => 
    ipcRenderer.invoke('saveWindowPosition', position),
  
  // 设置窗口透明度
  setOpacity: (opacity) => 
    ipcRenderer.invoke('setOpacity', opacity),
  
  // 打开主窗口
  openMainWindow: () => 
    ipcRenderer.invoke('openMainWindow'),
    
  // 添加拖拽相关API
  startDrag: () => {
    ipcRenderer.invoke('startDrag');
  }
}); 