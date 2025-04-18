import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 缓存客户端实例
let cachedClient: any = null;

// 强制从环境变量获取正确的URL和密钥
const getSupabaseConfig = () => {
  // 确保环境变量在客户端可用
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase环境变量缺失');
    throw new Error('Supabase环境变量缺失，无法初始化客户端');
  }
  
  return { supabaseUrl, supabaseAnonKey };
};

export const getSupabaseClient = () => {
  // 服务端不创建客户端
  if (typeof window === 'undefined') {
    console.warn('在服务端环境尝试创建Supabase客户端');
    return null;
  }
  
  // 使用缓存的实例
  if (cachedClient) {
    // 验证客户端是否有效
    if (typeof cachedClient.auth?.getSession === 'function') {
      return cachedClient;
    } else {
      console.warn('缓存的Supabase客户端无效，将重新创建');
      cachedClient = null;
    }
  }
  
  try {
    // 获取配置
    const config = getSupabaseConfig();
    
    // 创建新的客户端实例，使用增强的会话持久化选项
    cachedClient = createBrowserClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,      // 确保会话持久化
          autoRefreshToken: true,    // 自动刷新token
          storageKey: 'supabase-auth-token', // 指定存储键名
          storage: window.localStorage, // 显式使用localStorage
          detectSessionInUrl: true,  // 检测URL中的会话信息
          flowType: 'pkce',          // 使用更安全的PKCE流程
        },
        global: {
          fetch: (...args) => fetch(...args),
        },
        // 添加重试逻辑
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        db: {
          schema: 'public',
        },
      }
    );
    
    // 验证客户端是否已正确初始化
    if (!cachedClient || typeof cachedClient.auth?.getSession !== 'function') {
      throw new Error('Supabase客户端初始化失败');
    }

    // 监听认证状态变化，用于调试
    const { data: authListener } = cachedClient.auth.onAuthStateChange(
      (event: string, session: any) => {
        console.log(`认证状态变化: ${event}`, session ? '用户已登录' : '用户未登录');
      }
    );
    
    console.log('Supabase客户端成功初始化');
    return cachedClient;
  } catch (error) {
    console.error('创建Supabase客户端失败:', error);
    // 重置缓存以便下次尝试
    cachedClient = null;
    // 如果在开发环境，抛出错误以便更容易发现问题
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    return null;
  }
};

// 清除客户端缓存，用于排查问题或登出时
export const clearSupabaseClientCache = () => {
  cachedClient = null;
  console.log('已清除Supabase客户端缓存');
};

// 导出单例实例
export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null;

