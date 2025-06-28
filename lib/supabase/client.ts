import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// 使用单例模式确保只有一个 Supabase 客户端实例

// 添加缓存以避免重复创建客户端
let supabaseClientCache: any = null;

// 检查是否在 Electron 环境中运行
const isElectron = () => {
  return typeof window !== 'undefined' && 
    ((window.process && window.process.type === 'renderer') || 
    /electron/i.test(navigator.userAgent));
};

// 为 Electron 环境创建自定义存储
const createElectronStorage = () => {
  // 使用 Electron 的 localStorage，但添加持久化支持
  return {
    getItem: (key: string) => {
      const item = localStorage.getItem(key);
      return item === null ? null : item;
    },
    setItem: async (key: string, value: string) => {
      // 保存到 localStorage
      localStorage.setItem(key, value);
      
      // 如果在 Electron 环境中，尝试使用 electron-store 或类似机制持久化
      if (isElectron() && window.electron && window.electron.store) {
        try {
          // 使用 electron 对象通过 preload 脚本暴露的 store API
          window.electron.store.set(`auth:${key}`, value);
        } catch (e) {
          console.warn('无法持久化存储认证信息:', e);
        }
      }
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
      
      // 同样清除持久化存储
      if (isElectron() && window.electron && window.electron.store) {
        try {
          window.electron.store.delete(`auth:${key}`);
        } catch (e) {
          console.warn('无法从持久化存储中删除认证信息:', e);
        }
      }
    }
  };
};

// 在 Electron 环境中恢复会话
const restoreElectronSession = async () => {
  if (!isElectron() || !window.electron || !window.electron.store) {
    return false;
  }
  
  try {
    console.log("尝试从Electron存储恢复会话...");
    const supabaseSession = await window.electron.store.get('auth:supabase.auth.token');
    
    if (supabaseSession) {
      // 检查localStorage是否已有会话
      const currentSession = localStorage.getItem('supabase.auth.token');
      if (currentSession) {
        // 如果localStorage已有会话，可能不需要恢复
        try {
          // 解析确认是否是有效的JSON
          const sessionObj = JSON.parse(currentSession);
          if (sessionObj && sessionObj.access_token) {
            console.log("浏览器已有会话，无需从Electron恢复");
            return true;
          }
        } catch (e) {
          // 如果解析错误，可能是无效会话，继续恢复
          console.log("浏览器会话无效，将从Electron恢复");
        }
      }
      
      // 从Electron存储恢复到localStorage
      localStorage.setItem('supabase.auth.token', supabaseSession);
      console.log("成功从Electron恢复会话");
      return true;
    } else {
      console.log("Electron中没有保存的会话");
    }
  } catch (e) {
    console.warn('无法恢复持久化的认证会话:', e);
  }
  return false;
};

export const getSupabaseClient = async () => {
  // 如果已经有缓存的客户端且在客户端环境，直接返回
  if (typeof window !== 'undefined' && supabaseClientCache) {
    return supabaseClientCache;
  }
  
  // 在 Electron 环境中尝试恢复会话
  if (isElectron()) {
    await restoreElectronSession();
  }
  
  try {
    // 创建新的客户端
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
        global: {
          fetch: (...args) => {
            // 添加网络状态检查
            if (typeof window !== 'undefined' && !navigator.onLine) {
              console.error('网络连接已断开，无法发送请求到Supabase');
              return Promise.reject(new Error('Network connection is offline'));
            }
            
            return fetch(...args);
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
    
    // 在客户端环境中缓存客户端实例
    if (typeof window !== 'undefined') {
      supabaseClientCache = client;
      
      // 监听在线状态变化
      window.addEventListener('online', () => {
        console.log('网络连接已恢复，Supabase连接将自动重新建立');
      });
      
      window.addEventListener('offline', () => {
        console.warn('网络连接已断开，Supabase操作将会失败，请检查您的网络连接');
      });
    }
    
    return client;
  } catch (error) {
    console.error('创建Supabase客户端时出错:', error);
    throw error;
  }
}

// 创建一个非异步的客户端实例，用于直接导出
// 注意：这个方法在服务器端会返回null，在客户端会返回一个立即可用的客户端实例
const createNonAsyncClient = () => {
  // 在服务器端，返回null
  if (typeof window === 'undefined') {
    return null;
  }
  
  // 在客户端，创建一个立即可用的客户端实例
  try {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  } catch (error) {
    console.error('创建即时Supabase客户端时出错:', error);
    return null;
  }
};

// 导出单例实例 - 使用非异步方法创建
export const supabase = createNonAsyncClient();

// 初始化客户端并恢复会话
if (typeof window !== 'undefined') {
  // 在后台异步初始化完整客户端
  getSupabaseClient().then(client => {
    // 更新缓存
    supabaseClientCache = client;
  }).catch(error => {
    console.error('初始化Supabase客户端失败:', error);
  });
}

