import path from 'path';
import { app,dialog, BrowserWindow, Menu, protocol,Notification, session, ipcMain } from 'electron';
import { createHandler } from 'next-electron-rsc';
// Register protocols before app is ready

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
const port= 55535;
const { createInterceptor, localhostUrl } = createHandler({
    dev,
    dir,
    protocol,
    // debug: dev,
    debug: dev,
    port ,
    // ... and other Nex.js server options https://nextjs.org/docs/pages/building-your-application/configuring/custom-server
    turbo: true, // optional
});

let stopIntercept;

// ⬆ Next.js handler ⬆
const createWindow = async () => {
    // 根据环境选择正确的预加载脚本路径
    let preloadPath;

    // 尝试多个可能的路径
    // const possiblePaths = [
    //     path.join(app.getAppPath(), 'preload', 'preload.js'),
    //     path.join(process.resourcesPath, 'app', 'preload', 'preload.js'),
    //     path.join(process.resourcesPath, 'preload', 'preload.js'),
    //     path.join(__dirname, 'preload', 'preload.js'),
    //     path.join(__dirname, '..', 'preload', 'preload.js')
    // ];
    //
    // // 检查哪个路径存在
    // for (const testPath of possiblePaths) {
    //     try {
    //         if (existsSync(testPath)) {
    //             preloadPath = testPath;
    //             console.log('找到预加载脚本:', testPath);
    //             break;
    //         }
    //     } catch (err) {
    //         console.error('检查路径失败:', testPath, err);
    //     }
    // }

    if (!preloadPath) {
        console.error('警告: 未找到预加载脚本，将使用默认路径');
        preloadPath = path.join(app.getAppPath(), 'preload', 'preload.js');
    }

    console.log('应用路径:', app.getAppPath());
    // console.log('当前目录:', __dirname);
    console.log('资源路径:', process.resourcesPath);
    console.log('最终预加载脚本路径:', preloadPath);

    mainWindow = new BrowserWindow({
        width: 1600,
        height: 800,
        frame: true, // 使用原生标题栏
        titleBarStyle: 'default', // 使用默认标题栏样式
        titleBarOverlay: {
            color: '#ffffff',
            symbolColor: '#444444',
            height: 30
        },
        icon: path.join(app.getAppPath(), 'public', 'icons', 'icon-512x512.png'),
        webPreferences: {
            contextIsolation: true, // protect against prototype pollution
            devTools: true,
            preload: preloadPath, // 使用动态确定的预加载脚本路径
            nodeIntegration: false, // 禁用Node集成，增强安全性
        },
    });
    // mainWindow.webContents.openDevTools();
    // 隐藏菜单栏
    mainWindow.setMenuBarVisibility(false);

    // 设置窗口始终置顶 - 初始状态为不置顶
    mainWindow.setAlwaysOnTop(false);

    // 存储全局状态
    global.appState = {
        isAlwaysOnTop: false,
        lastUpdate: Date.now()
    };

    // 创建系统托盘
    createTray();

    // 存储主窗口引用，以便在其他地方使用
    global.mainWindow = mainWindow;

    // ⬇ Next.js handler ⬇
    try {
        stopIntercept = await createInterceptor({ session: mainWindow.webContents.session });
    } catch (error) {
        console.error('创建拦截器失败:', error.message);
        stopIntercept = () => {};
    }
    // ⬆ Next.js handler ⬆
    if (dev) {
        mainWindow.once('ready-to-show', () => mainWindow.webContents.openDevTools());
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        global.mainWindow = null;
        stopIntercept?.();
    });

    // Should be last, after all listeners and menu

    await app.whenReady();

    try {
        await mainWindow.loadURL(localhostUrl + '/');
        console.log('[APP] Loaded', localhostUrl);
    } catch (error) {
        console.error('加载URL失败:', error.message);
        // 显示错误信息页面
        mainWindow.loadURL(`data:text/html,<html><body><h2>加载失败</h2><p>${error.message}</p></body></html>`);
    }
};

// 创建系统托盘图标和菜单
function createTray() {
    try {
        // 加载应用图标 - 使用 icon-512x512.png 而不是 icon-64x64.png
        const iconPath = path.join(app.getAppPath(), 'public', 'icons', 'icon-512x512.png');
        const icon = nativeImage.createFromPath(iconPath);

        // 创建托盘图标
        tray = new Tray(icon);
        tray.setToolTip('AI提效'); // 更改为"AI提效"

        // 更新托盘菜单
        updateTrayMenu();

        // 托盘图标点击事件 - 显示/隐藏应用窗口
        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        });
    } catch (error) {
        console.error('创建系统托盘失败:', error);
    }
}

// 更新托盘菜单
function updateTrayMenu() {
    if (!tray) return;

    const template = [
        {
            label: global.appState.isAlwaysOnTop ? '取消钉在桌面' : '钉在桌面',
            click: () => {
                togglePinWindow();
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => app.quit()
        }
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);
}

// 切换窗口置顶状态
function togglePinWindow() {
    if (!mainWindow) return;

    // 记录切换前的状态
    const previousState = global.appState.isAlwaysOnTop;

    // 切换置顶状态
    global.appState.isAlwaysOnTop = !global.appState.isAlwaysOnTop;
    global.appState.lastUpdate = Date.now();

    // 使用更高级别的置顶模式，确保应用置顶于所有窗口，包括终端
    try {
        // 先尝试取消置顶，然后再设置新状态，避免状态不一致
        mainWindow.setAlwaysOnTop(false);

        // 如果需要置顶，则设置置顶
        if (global.appState.isAlwaysOnTop) {
            mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
        }

        // 检查是否设置成功
        const actualState = mainWindow.isAlwaysOnTop();

        // 确保状态一致
        if (actualState !== global.appState.isAlwaysOnTop) {
            global.appState.isAlwaysOnTop = actualState;
            global.appState.lastUpdate = Date.now(); // 更新时间戳以触发UI更新
        }
    } catch (err) {
        console.error('设置窗口置顶状态失败:', err);
    }

    // 更新托盘菜单以反映状态变化
    updateTrayMenu();

    // 广播状态变化到所有渲染进程
    broadcastPinStatus();

    // 延迟再次广播，确保状态已正确同步
    setTimeout(() => {
        broadcastPinStatus();
    }, 200);
}

// 广播置顶状态到所有渲染进程
function broadcastPinStatus() {
    const stateData = {
        isPinned: global.appState.isAlwaysOnTop,
        timestamp: global.appState.lastUpdate
    };

    // 确保所有BrowserWindow都收到通知
    const windows = BrowserWindow.getAllWindows();

    windows.forEach((win) => {
        if (win && !win.isDestroyed()) {
            try {
                // 发送旧通道消息保持兼容性
                win.webContents.send('pin-window-status', global.appState.isAlwaysOnTop);

                // 发送新的状态同步消息，包含更多信息
                win.webContents.send('pin-window-state-sync', stateData);
            } catch (err) {
                console.error('无法发送置顶状态到窗口:', err);
            }
        }
    });
}

// 应用启动时定期广播状态(每500ms)，确保UI始终反映最新状态
function startStatusBroadcast() {
    // 初次启动时立即广播一次
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        broadcastPinStatus();
    }

    // 设置定期广播
    setInterval(() => {
        if (global.mainWindow && !global.mainWindow.isDestroyed()) {
            // 先检查状态是否与实际一致
            try {
                const actualState = mainWindow.isAlwaysOnTop();
                if (global.appState.isAlwaysOnTop !== actualState) {
                    // 状态不一致，更新并广播
                    global.appState.isAlwaysOnTop = actualState;
                    global.appState.lastUpdate = Date.now();
                }
            } catch (err) {
                console.error('检查窗口置顶状态失败:', err);
            }

            // 无论如何都广播当前状态
            broadcastPinStatus();
        }
    }, 500);
}

// 添加切换置顶状态的方法 - 用于IPC通信
ipcMain.on('toggle-pin-window', () => {
    togglePinWindow();
});

// 添加获取置顶状态的方法
ipcMain.on('get-pin-status', (event) => {
    // 发送当前置顶状态到渲染进程
    if (event.sender && !event.sender.isDestroyed()) {
        const stateData = {
            isPinned: global.appState.isAlwaysOnTop,
            timestamp: global.appState.lastUpdate
        };

        event.sender.send('pin-window-status', global.appState.isAlwaysOnTop);
        event.sender.send('pin-window-state-sync', stateData);
        console.log('已发送窗口置顶状态:', global.appState.isAlwaysOnTop, '时间:', new Date().toISOString());
    }
});

// 查询置顶状态
ipcMain.handle('is-window-pinned', () => {
    if (!mainWindow) {
        return false;
    }

    try {
        // 直接查询窗口的实际状态，而不是依赖缓存的状态
        const actualState = mainWindow.isAlwaysOnTop();

        // 如果缓存状态与实际状态不一致，更新缓存
        if (global.appState.isAlwaysOnTop !== actualState) {
            global.appState.isAlwaysOnTop = actualState;
            global.appState.lastUpdate = Date.now();

            // 广播更新后的状态
            broadcastPinStatus();
        }

        return actualState;
    } catch (err) {
        console.error('查询窗口置顶状态失败:', err);
        // 出错时返回缓存的状态
        return global.appState.isAlwaysOnTop;
    }
});

// 设置置顶状态 - 直接设置而不是切换
ipcMain.on('set-pin-status', (event, isPinned) => {
    if (!mainWindow) return;

    // 确保输入是布尔值
    const newPinState = !!isPinned;

    // 记录旧状态用于日志
    const oldState = global.appState.isAlwaysOnTop;

    // 仅在状态实际改变时更新
    if (oldState !== newPinState) {
        // 直接设置状态
        global.appState.isAlwaysOnTop = newPinState;
        global.appState.lastUpdate = Date.now();

        // 应用置顶设置 - 使用更可靠的方法
        try {
            // 先尝试取消置顶，然后再设置新状态，避免状态不一致
            mainWindow.setAlwaysOnTop(false);

            // 如果需要置顶，则设置置顶
            if (newPinState) {
                mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
            }

            // 检查是否设置成功
            const actualState = mainWindow.isAlwaysOnTop();

            // 确保状态一致
            if (actualState !== newPinState) {
                global.appState.isAlwaysOnTop = actualState;
                global.appState.lastUpdate = Date.now(); // 更新时间戳以触发UI更新
            }
        } catch (err) {
            console.error('设置窗口置顶状态失败:', err);
        }

        // 更新托盘菜单
        updateTrayMenu();

        // 广播状态变化
        broadcastPinStatus();

        // 延迟再次广播，确保状态已正确同步
        setTimeout(() => {
            broadcastPinStatus();
        }, 200);
    }

    // 确认状态已设置
    setTimeout(() => {
        const actualState = mainWindow.isAlwaysOnTop();
        if (global.appState.isAlwaysOnTop !== actualState) {
            // 修正状态不一致
            global.appState.isAlwaysOnTop = actualState;
            global.appState.lastUpdate = Date.now(); // 更新时间戳以触发UI更新
            broadcastPinStatus();
        }
    }, 100);
});

// 确保在app ready之前注册协议
app.on('ready', () => {
    createWindow();

    // 启动状态广播
    startStatusBroadcast();

    // 添加窗口控制事件监听
    ipcMain.on('window-control', (event, command) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;

        switch (command) {
            case 'minimize':
                win.minimize();
                break;
            case 'maximize':
                if (win.isMaximized()) {
                    win.unmaximize();
                } else {
                    win.maximize();
                }
                break;
            case 'close':
                win.close();
                break;
        }
    });

    // 添加打开DevTools的消息处理
    ipcMain.on('open-dev-tools', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.openDevTools();
            console.log('已打开DevTools');
        }
    });

    // 添加系统通知功能
    ipcMain.on('show-notification', (event, options) => {
        const { title, body, urgency } = options;

        try {

            // 创建通知
            const notification = new Notification({
                title: title || '待办提醒',
                body: body || '您有一个待办事项需要处理',
                urgency: urgency || 'normal', // 可以是 'normal', 'critical', 或 'low'
                silent: false, // 是否有声音
                icon: path.join(app.getAppPath(), 'public', 'icons', 'icon-512x512.png')
            });

            // 点击通知时聚焦应用
            notification.on('click', () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                }
            });

            // 显示通知
            notification.show();

            console.log('系统通知已发送:', title);
        } catch (error) {
            console.error('发送系统通知失败:', error);

            // 备用方案：如果Notification不可用，尝试使用dialog模块显示消息
            try {
                dialog.showMessageBox({
                    type: 'info',
                    title: title || '待办提醒',
                    message: body || '您有一个待办事项需要处理',
                    buttons: ['确定']
                });
            } catch (dialogError) {
                console.error('显示对话框也失败:', dialogError);
            }
        }
    });

    // 添加检查窗口是否最大化的方法
    ipcMain.handle('window-is-maximized', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return false;
        return win.isMaximized();
    });
});

app.on('window-all-closed', () => app.quit()); // if (process.platform !== 'darwin')

app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && !mainWindow && createWindow());
