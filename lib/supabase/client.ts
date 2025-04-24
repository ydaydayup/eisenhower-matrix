import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// 使用单例模式确保只有一个 Supabase 客户端实例

// 添加缓存以避免重复创建客户端
let supabaseClientCache: any = null;

export const getSupabaseClient = () => {
  // 如果已经有缓存的客户端且在客户端环境，直接返回
  if (typeof window !== 'undefined' && supabaseClientCache) {
    return supabaseClientCache;
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
          detectSessionInUrl: true
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

// 导出单例实例
export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null

