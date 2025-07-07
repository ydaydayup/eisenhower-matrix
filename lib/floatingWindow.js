// 悬浮窗管理模块
const { BrowserWindow, screen, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
// 存储悬浮窗配置的文件路径
const CONFIG_PATH = path.join(app.getPath('userData'), 'floating-window-config.json');
// 悬浮窗实例
let floatingWindow = null;
// 默认配置
const defaultConfig = {
  width: 300,
  height: 400,
  x: null,
  y: null,
  opacity: 0.9,
  alwaysOnTop: true,
  visible: false,
};
// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...defaultConfig, ...config };
    }
  } catch (error) {
  }
  return defaultConfig;
}
// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
  }
}
// 创建悬浮窗
function createFloatingWindow(mainWindow) {
  // 如果悬浮窗已经存在，则直接显示
  if (floatingWindow) {
    floatingWindow.show();
    return floatingWindow;
  }
  // 加载配置
  const config = loadConfig();
  // 获取屏幕尺寸
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  // 如果没有保存位置，则默认放在屏幕右下角
  const x = config.x !== null ? config.x : screenWidth - config.width - 20;
  const y = config.y !== null ? config.y : screenHeight - config.height - 20;
  // 创建浏览器窗口
  floatingWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: false,
    movable: true, // 确保窗口可移动
    titleBarStyle: 'hidden', // 隐藏默认标题栏
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#555555',
      height: 30
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'floating-preload.js'),
    },
    show: false, // 先不显示，等加载完成后再显示
  });
  // 设置窗口透明度
  floatingWindow.setOpacity(config.opacity);
  // 加载悬浮窗HTML
  const dev = process.env.NODE_ENV === 'development';
  const floatingUrl = dev 
    ? 'http://localhost:3000/floating-todo.html' 
    : `file://${path.join(app.getAppPath(), 'public', 'floating-todo.html')}`;
  floatingWindow.loadURL(floatingUrl);
  // 保存全局引用
  global.floatingWindow = floatingWindow;
  // 窗口准备好时显示
  floatingWindow.once('ready-to-show', () => {
    if (config.visible) {
      floatingWindow.show();
    }
  });
  // 窗口关闭时保存配置
  floatingWindow.on('close', () => {
    const bounds = floatingWindow.getBounds();
    const updatedConfig = {
      ...config,
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      visible: false,
    };
    saveConfig(updatedConfig);
  });
  // 窗口关闭时清除引用
  floatingWindow.on('closed', () => {
    floatingWindow = null;
    global.floatingWindow = null;
  });
  // 窗口移动时保存位置
  floatingWindow.on('moved', () => {
    const bounds = floatingWindow.getBounds();
    const updatedConfig = {
      ...config,
      x: bounds.x,
      y: bounds.y,
    };
    saveConfig(updatedConfig);
  });
  // 窗口大小改变时保存尺寸
  floatingWindow.on('resize', () => {
    const bounds = floatingWindow.getBounds();
    const updatedConfig = {
      ...config,
      width: bounds.width,
      height: bounds.height,
    };
    saveConfig(updatedConfig);
  });
  return floatingWindow;
}
// 切换悬浮窗显示状态
function toggleFloatingWindow(mainWindow) {
  if (floatingWindow) {
    if (floatingWindow.isVisible()) {
      floatingWindow.hide();
      // 更新配置
      const config = loadConfig();
      saveConfig({ ...config, visible: false });
      // 通知主窗口悬浮窗状态
      if (mainWindow) {
        mainWindow.webContents.send('floating-window-status', false);
      }
    } else {
      floatingWindow.show();
      // 更新配置
      const config = loadConfig();
      saveConfig({ ...config, visible: true });
      // 通知主窗口悬浮窗状态
      if (mainWindow) {
        mainWindow.webContents.send('floating-window-status', true);
      }
    }
  } else {
    createFloatingWindow(mainWindow);
    // 更新配置
    const config = loadConfig();
    saveConfig({ ...config, visible: true });
    // 显示悬浮窗
    if (floatingWindow) {
      floatingWindow.show();
      // 通知主窗口悬浮窗状态
      if (mainWindow) {
        mainWindow.webContents.send('floating-window-status', true);
      }
    }
  }
}
// 设置 IPC 通信
function setupIPC() {
  // 关闭悬浮窗
  ipcMain.handle('closeFloatingWindow', () => {
    if (floatingWindow) {
      floatingWindow.hide();
      // 更新配置
      const config = loadConfig();
      saveConfig({ ...config, visible: false });
    }
  });
  // 最小化悬浮窗
  ipcMain.handle('minimizeFloatingWindow', () => {
    if (floatingWindow) {
      floatingWindow.minimize();
    }
  });
  // 设置悬浮窗位置
  ipcMain.handle('saveWindowPosition', (event, position) => {
    if (floatingWindow) {
      floatingWindow.setPosition(position.x, position.y);
    }
  });
  // 设置悬浮窗透明度
  ipcMain.handle('setOpacity', (event, opacity) => {
    if (floatingWindow) {
      floatingWindow.setOpacity(opacity);
      // 更新配置
      const config = loadConfig();
      saveConfig({ ...config, opacity });
    }
  });
  // 打开主窗口
  ipcMain.handle('openMainWindow', (event) => {
    if (global.mainWindow) {
      global.mainWindow.show();
      global.mainWindow.focus();
    }
  });
  // 设置点击穿透
  ipcMain.handle('setIgnoreMouseEvents', (event, ignore, options) => {
    if (floatingWindow) {
      floatingWindow.setIgnoreMouseEvents(ignore, options);
    }
  });
  // 开始拖拽
  ipcMain.handle('startDrag', (event) => {
    if (floatingWindow) {
      floatingWindow.webContents.executeJavaScript(`
        document.onmousemove = null;
        document.onmouseup = null;
      `);
      floatingWindow.startWindowDrag();
    }
  });
}
// 导出模块
module.exports = {
  createFloatingWindow,
  toggleFloatingWindow,
  setupIPC,
  loadConfig,
  saveConfig,
}; 