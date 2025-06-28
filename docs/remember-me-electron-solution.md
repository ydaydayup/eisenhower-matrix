# Electron 应用中"记住我30天"功能解决方案

## 问题描述

在 Electron 桌面应用中，"记住我30天"功能无法正常工作，用户每次重启应用后都需要重新登录，即使已勾选"记住我30天"选项。

## 原因分析

问题的根本原因在于 Electron 应用中的会话存储机制与普通 Web 应用不同：

1. **存储隔离**：Electron 应用中的 localStorage 在应用重启后可能会被清除或重置
2. **缺乏持久化**：Supabase 默认使用浏览器的 localStorage 存储会话信息，但这在 Electron 环境中不足以实现跨会话持久化
3. **上下文切换**：Electron 的主进程和渲染进程之间需要特殊的通信机制来保存和恢复会话数据

## 解决方案

我们实现了一个完整的解决方案，通过以下步骤解决这个问题：

### 1. 添加持久化存储

使用 `electron-store` 库实现加密的持久化存储：

```bash
npm install electron-store --save
```

### 2. 扩展预加载脚本

在 `preload.cjs` 中添加存储 API：

```js
contextBridge.exposeInMainWorld('electron', {
  // 现有 API...
  store: {
    get: (key) => ipcRenderer.invoke('electron-store-get', key),
    set: (key, val) => ipcRenderer.send('electron-store-set', key, val),
    delete: (key) => ipcRenderer.send('electron-store-delete', key),
    clear: () => ipcRenderer.send('electron-store-clear')
  }
});
```

### 3. 配置主进程

在 `main.js` 中设置 electron-store 和 IPC 处理程序：

```js
import Store from 'electron-store';

// 创建持久化存储实例
const store = new Store({
  name: 'eisenhower-matrix-auth',
  encryptionKey: 'your-encryption-key',
});

// 设置IPC处理程序
ipcMain.handle('electron-store-get', async (event, key) => {
  return store.get(key);
});

ipcMain.on('electron-store-set', (event, key, val) => {
  store.set(key, val);
});
```

### 4. 自定义 Supabase 存储适配器

在 `lib/supabase/client.ts` 中创建自定义存储适配器：

```ts
// 为 Electron 环境创建自定义存储
const createElectronStorage = () => {
  return {
    getItem: (key: string) => {
      const item = localStorage.getItem(key);
      return item === null ? null : item;
    },
    setItem: async (key: string, value: string) => {
      localStorage.setItem(key, value);
      
      // 同时保存到 Electron 持久化存储
      if (isElectron() && window.electron?.store) {
        window.electron.store.set(`auth:${key}`, value);
      }
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
      
      if (isElectron() && window.electron?.store) {
        window.electron.store.delete(`auth:${key}`);
      }
    }
  };
};
```

### 5. 实现会话恢复逻辑

在应用启动时从持久化存储恢复会话：

```ts
// 在 Electron 启动时恢复会话
const restoreElectronSession = async () => {
  if (isElectron() && window.electron?.store) {
    const supabaseSession = await window.electron.store.get('auth:supabase.auth.token');
    if (supabaseSession) {
      localStorage.setItem('supabase.auth.token', supabaseSession);
      return true;
    }
  }
  return false;
};
```

### 6. 配置 Supabase 客户端

使用自定义存储适配器初始化 Supabase 客户端：

```ts
const client = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // 在 Electron 环境中使用自定义存储
      storage: isElectron() ? createElectronStorage() : undefined
    },
    // 其他配置...
  }
);
```

### 7. 修改登录处理逻辑

更新登录页面，在用户成功登录时额外保存会话到 Electron 存储：

```ts
if (data.user) {
  // 如果在 Electron 环境中，额外保存会话到持久化存储
  if (typeof window !== 'undefined' && 
      window.electron && 
      window.electron.store && 
      rememberMe) {
    try {
      // 保存登录状态到 Electron 存储
      const session = localStorage.getItem('supabase.auth.token');
      if (session) {
        window.electron.store.set('auth:supabase.auth.token', session);
      }
    } catch (err) {
      console.warn("无法保存会话到 Electron 存储:", err);
    }
  }
  
  // 继续处理登录成功...
}
```

## 安全考虑

1. **加密存储**：electron-store 使用加密密钥保护敏感的认证信息
2. **进程隔离**：通过 IPC 通信确保渲染进程无法直接访问主进程的存储
3. **最小权限**：只存储必要的会话信息，避免存储完整的用户凭据

## 测试验证

要验证此功能是否正常工作，请执行以下测试：

1. 启动 Electron 应用
2. 登录并勾选"记住我30天"选项
3. 完全关闭应用
4. 重新启动应用
5. 验证是否自动登录，无需重新输入凭据

## 结论

通过实现自定义的持久化存储机制，我们解决了 Electron 环境中"记住我30天"功能不生效的问题。这个解决方案既保持了良好的用户体验，又确保了认证信息的安全性，使用户可以在桌面应用中享受与 Web 应用相同的便捷登录体验。 