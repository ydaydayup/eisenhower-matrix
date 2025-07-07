const { contextBridge, ipcRenderer } = require('electron');
// 调试信息
try {
  // 添加窗口控制API
  contextBridge.exposeInMainWorld('windowControls', {
    minimize: () => ipcRenderer.send('window-control', 'minimize'),
    maximize: () => ipcRenderer.send('window-control', 'maximize'),
    close: () => ipcRenderer.send('window-control', 'close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  });
  // 添加electron通信API
  contextBridge.exposeInMainWorld('electron', {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    receive: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    // 添加持久化存储API
    store: {
      get: (key) => ipcRenderer.invoke('electron-store-get', key),
      set: (key, val) => ipcRenderer.send('electron-store-set', key, val),
      delete: (key) => ipcRenderer.send('electron-store-delete', key),
      clear: () => ipcRenderer.send('electron-store-clear')
    },
    // 添加专门的认证API
    auth: {
      // 保存认证凭据，只保存email和过期时间
      storeCredentials: (credentials) => ipcRenderer.invoke('auth-store-credentials', credentials),
      // 获取保存的认证凭据
      getCredentials: () => ipcRenderer.invoke('auth-store-credentials', null),
      // 检查认证是否过期
      checkExpiry: () => ipcRenderer.invoke('auth-check-expiry')
    }
  });
} catch (error) {
} 