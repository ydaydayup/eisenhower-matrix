// 使用ES模块语法导入所有需要的模块
import path from 'path';
import { app, BrowserWindow, Menu, protocol, session, shell, ipcMain } from 'electron';
import { createHandler } from 'next-electron-rsc';
import Store from 'electron-store';

// 创建持久化存储实例
const store = new Store({
  name: 'eisenhower-matrix',
  clearInvalidConfig: true
});

// 简化认证存储配置，增加兼容性
const authStore = new Store({
  name: 'eisenhower-auth',
  clearInvalidConfig: true,
  encryptionKey: 'auth-secure-key', // 实际应用中应使用更安全的密钥
});

// 在导入后立即注册协议，确保在app启动前执行
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  },
  {
    scheme: 'http',
    privileges: {
      standard: true, 
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
]);

console.log("==========================================");
console.log("==========================================");

let mainWindow;
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
process.env['ELECTRON_ENABLE_LOGGING'] = 'true';

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));


// ⬇ Next.js handler ⬇

// change to your path, make sure it's added to Electron Builder files
const appPath = app.getAppPath();
const dev = process.env.NODE_ENV === 'development';
const dir = path.join(appPath, '.next', 'standalone');

const { createInterceptor, localhostUrl } = createHandler({
    dev,
    dir,
    protocol,
    debug: true,
    // ... and other Nex.js server options https://nextjs.org/docs/pages/building-your-application/configuring/custom-server
    turbo: true, // optional
});

let stopIntercept;

// ⬆ Next.js handler ⬆

// 设置IPC处理程序，用于与渲染进程通信
ipcMain.handle('electron-store-get', async (event, key) => {
  console.log(`IPC: 收到获取请求 - ${key}`);
  try {
    if (key.startsWith('auth:')) {
      const value = authStore.get(key);
      console.log(`IPC: 获取认证存储值 - ${key} - ${value ? "成功" : "未找到"}`);
      return value;
    }
    const value = store.get(key);
    console.log(`IPC: 获取常规存储值 - ${key} - ${value ? "成功" : "未找到"}`);
    return value;
  } catch (error) {
    console.error(`IPC: 获取存储值出错 - ${key}`, error);
    return null;
  }
});

ipcMain.on('electron-store-set', (event, key, val) => {
  console.log(`IPC: 收到设置请求 - ${key}`);
  try {
    if (key.startsWith('auth:')) {
      authStore.set(key, val);
      console.log(`IPC: 设置认证存储值成功 - ${key}`);
    } else {
      store.set(key, val);
      console.log(`IPC: 设置常规存储值成功 - ${key}`);
    }
  } catch (error) {
    console.error(`IPC: 设置存储值出错 - ${key}`, error);
  }
});

ipcMain.on('electron-store-delete', (event, key) => {
  console.log(`IPC: 收到删除请求 - ${key}`);
  try {
    if (key.startsWith('auth:')) {
      authStore.delete(key);
      console.log(`IPC: 删除认证存储值成功 - ${key}`);
    } else {
      store.delete(key);
      console.log(`IPC: 删除常规存储值成功 - ${key}`);
    }
  } catch (error) {
    console.error(`IPC: 删除存储值出错 - ${key}`, error);
  }
});

ipcMain.on('electron-store-clear', () => {
  console.log("IPC: 收到清空存储请求");
  try {
    store.clear();
    console.log("IPC: 清空常规存储成功");
  } catch (error) {
    console.error("IPC: 清空存储出错", error);
  }
});

// 添加专门的认证凭据处理
ipcMain.handle('auth-store-credentials', async (event, credentials) => {
  if (!credentials) {
    return authStore.get('auth:credentials');
  }
  
  const { email, password, expiresAt } = credentials;
  
  // 只保存email和过期时间，不保存密码
  authStore.set('auth:credentials', { 
    email, 
    expiresAt
  });
  
  return true;
});

ipcMain.handle('auth-check-expiry', async () => {
  const credentials = authStore.get('auth:credentials');
  if (!credentials) return false;
  
  const now = Date.now();
  if (now > credentials.expiresAt) {
    // 已过期，删除凭据
    authStore.delete('auth:credentials');
    return false;
  }
  
  return true;
});

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // 禁用沙箱以允许预加载脚本正常工作
            preload: path.resolve(app.getAppPath(), 'preload.cjs'), // 使用绝对路径
            enableRemoteModule: false,
            devTools: true,
        },
    });

    // 调试预加载脚本路径
    console.log("预加载脚本路径:", path.resolve(app.getAppPath(), 'preload.cjs'));

    // 禁用硬编码缓存，确保每次重启都能加载最新的preload脚本
    mainWindow.webContents.session.clearCache();
    mainWindow.webContents.session.clearStorageData({
        storages: ['appcache', 'shadercache', 'localstorage']
    });

    // ⬇ Next.js handler ⬇

    stopIntercept = await createInterceptor({ session: mainWindow.webContents.session });

    // ⬆ Next.js handler ⬆

    mainWindow.once('ready-to-show', () => mainWindow.webContents.openDevTools());

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopIntercept?.();
    });

    // Should be last, after all listeners and menu

    await app.whenReady();

    await mainWindow.loadURL(localhostUrl + '/');

    console.log('[APP] Loaded', localhostUrl);
};

// 确保在app ready之前注册协议
app.on('ready', createWindow);

app.on('window-all-closed', () => app.quit()); // if (process.platform !== 'darwin')

app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && !mainWindow && createWindow());