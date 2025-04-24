import { app, BrowserWindow, protocol } from 'electron';
import { createHandler } from 'next-electron-rsc';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appPath = app.getAppPath();
const isDev = process.env.NODE_ENV === 'development';

const { createInterceptor } = createHandler({
    standaloneDir: path.join(appPath, '.next', 'standalone'),
    localhostUrl: 'http://localhost:3000',
    protocol,
});

function createWindow() {
    // 创建浏览器窗口
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 在开发环境中加载 localhost URL，在生产环境中加载本地文件
    const startUrl = isDev 
        ? 'http://localhost:3000' 
        : 'app://localhost';

    mainWindow.loadURL(startUrl);

    // 在开发环境下打开开发者工具
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // 正确调用 createInterceptor，传入 session
    if (!isDev) {
        createInterceptor({ session: mainWindow.webContents.session });
    }
}

// Electron 应用准备就绪时创建窗口
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});