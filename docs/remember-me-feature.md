# "记住我30天" 功能技术方案

## 概述

本文档描述了在四象限待办事项应用中实现"记住我30天"功能的技术方案。该功能允许用户在登录时选择是否将其会话保持30天，无需重新输入密码。特别针对 Electron 桌面应用环境进行了优化，确保在应用重启后仍能保持登录状态。

## 实现方案

### 1. 用户界面实现

在登录页面添加"记住我30天"复选框选项：

```tsx
<div className="flex items-center space-x-2">
  <Checkbox 
    id="remember-me" 
    checked={rememberMe} 
    onCheckedChange={(checked) => setRememberMe(checked === true)}
  />
  <Label htmlFor="remember-me" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    记住我30天
  </Label>
</div>
```

### 2. 会话持久化实现

#### 2.1 Web 环境

利用 Supabase Auth 的 `expiresIn` 选项来控制会话有效期：

```tsx
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email,
  password,
  options: {
    // 如果选择了"记住我"，设置会话有效期为30天（以秒为单位）
    expiresIn: rememberMe ? 60 * 60 * 24 * 30 : undefined
  }
})
```

当用户选择"记住我30天"时，将会话有效期设置为30天（2,592,000秒）。如果未选择，则使用 Supabase 的默认会话有效期（通常为1小时）。

#### 2.2 Electron 环境

在 Electron 环境中，我们使用 `electron-store` 库来实现会话的持久化存储：

1. **预加载脚本 (preload.cjs)**

   ```js
   // 添加持久化存储API
   contextBridge.exposeInMainWorld('electron', {
     // 其他 API...
     store: {
       get: (key) => ipcRenderer.invoke('electron-store-get', key),
       set: (key, val) => ipcRenderer.send('electron-store-set', key, val),
       delete: (key) => ipcRenderer.send('electron-store-delete', key),
       clear: () => ipcRenderer.send('electron-store-clear')
     }
   });
   ```

2. **主进程 (main.js)**

   ```js
   import Store from 'electron-store';

   // 创建持久化存储实例
   const store = new Store({
     name: 'eisenhower-matrix-auth',
     encryptionKey: 'your-encryption-key', // 使用环境变量或其他安全方式存储
   });

   // 设置IPC处理程序
   ipcMain.handle('electron-store-get', async (event, key) => {
     return store.get(key);
   });

   ipcMain.on('electron-store-set', (event, key, val) => {
     store.set(key, val);
   });
   ```

3. **自定义存储适配器**

   ```tsx
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

4. **会话恢复逻辑**

   ```tsx
   // 在 Electron 启动时恢复会话
   const restoreElectronSession = async () => {
     if (isElectron() && window.electron?.store) {
       const supabaseSession = await window.electron.store.get('auth:supabase.auth.token');
       if (supabaseSession) {
         localStorage.setItem('supabase.auth.token', supabaseSession);
       }
     }
   };
   ```

### 3. 技术细节

#### 会话存储

Supabase Auth 使用以下机制存储会话信息：

1. **浏览器本地存储**：默认情况下，会话信息存储在浏览器的 localStorage 中
2. **Cookie**：同时也会设置相关 cookie 用于 SSR（服务器端渲染）
3. **Electron 持久化存储**：在 Electron 环境中，会话信息会额外保存到 electron-store 中

#### 安全考虑

1. **会话令牌**：Supabase 使用 JWT（JSON Web Token）作为会话令牌
2. **自动刷新**：令牌会在后台自动刷新，无需用户干预
3. **过期处理**：当令牌过期时，用户将被重定向到登录页面
4. **加密存储**：在 Electron 环境中，会话信息使用 electron-store 加密存储

#### 配置依赖

该功能依赖于 Supabase 客户端的以下配置：

```tsx
{
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: isElectron() ? createElectronStorage() : undefined
  }
}
```

## 用户体验

1. **首次登录**：用户勾选"记住我30天"后登录，系统将保持用户登录状态30天
2. **后续访问**：30天内再次访问网站或打开桌面应用时，用户将自动登录，无需重新输入凭据
3. **手动登出**：用户手动登出后，记住我功能失效，需要重新登录
4. **会话过期**：30天后会话自动过期，用户需要重新登录
5. **跨平台体验**：在 Web 和桌面应用中提供一致的体验

## 兼容性和限制

1. **浏览器支持**：支持所有现代浏览器
2. **隐私模式**：在浏览器隐私/无痕模式下可能无法正常工作
3. **多设备**：此功能仅在用户登录的特定设备和浏览器上有效
4. **Electron 支持**：在 Electron 应用中通过 electron-store 实现持久化

## 未来改进

1. **记住用户名**：可以考虑增加记住用户名（邮箱）的功能
2. **自定义有效期**：允许用户选择不同的记住时长（7天、30天、90天等）
3. **设备管理**：添加已登录设备管理功能，允许用户查看和撤销特定设备的访问权限
4. **生物识别认证**：在支持的设备上，集成指纹或面部识别登录 