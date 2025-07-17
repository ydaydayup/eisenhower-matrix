// 主窗口预加载脚本
const { contextBridge, ipcRenderer } = require('electron');
// 确保脚本在错误时不会完全失败
try {
  // 暴露安全的 API 到渲染进程
  contextBridge.exposeInMainWorld('electron', {
    // 发送消息到主进程
    send: (channel, ...args) => {
      // 白名单通道 - 移除悬浮窗相关通道
      const validChannels = ['show-notification', 'window-control', 'toggle-pin-window', 'get-pin-status', 'open-dev-tools', 'set-pin-status'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      } else {
      }
    },
    // 接收来自主进程的消息
    receive: (channel, func) => {
      // 白名单通道 - 移除悬浮窗相关通道
      const validChannels = ['pin-window-status', 'pin-window-state-sync'];
      if (validChannels.includes(channel)) {
        // 删除旧的监听器，避免重复
        ipcRenderer.removeAllListeners(channel);
        // 添加新的监听器
        ipcRenderer.on(channel, (event, ...args) => {
          func(...args);
        });
      } else {
      }
    },
    // 调用主进程函数并等待结果
    invoke: async (channel, ...args) => {
      // 白名单通道
      const validChannels = ['window-is-maximized', 'is-window-pinned'];
      if (validChannels.includes(channel)) {
        try {
          return await ipcRenderer.invoke(channel, ...args);
        } catch (err) {
          throw err;
        }
      }
      return null;
    },
    // 发送通知的便捷方法
    showNotification: (options) => {
      ipcRenderer.send('show-notification', options);
    },
    // 窗口置顶控制
    togglePinWindow: () => {
      ipcRenderer.send('toggle-pin-window');
    },
    // 设置窗口置顶状态
    setPinStatus: (isPinned) => {
      ipcRenderer.send('set-pin-status', isPinned);
    },
    // 获取窗口置顶状态
    isWindowPinned: async () => {
      try {
        return await ipcRenderer.invoke('is-window-pinned');
      } catch (err) {
        throw err;
      }
    },
    // 添加一个测试方法，用于确认API是否正确暴露
    test: () => {
      return 'API工作正常';
    }
  });
} catch (error) {
} 