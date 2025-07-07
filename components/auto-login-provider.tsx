'use client';
import { ReactNode, useEffect } from 'react';
import { useAutoLogin } from '@/hooks/use-auto-login';
import { usePathname } from 'next/navigation';
interface AutoLoginProviderProps {
  children: ReactNode;
}
/**
 * 检查Electron环境
 */
const isElectron = () => {
  return typeof window !== 'undefined' && window.electron !== undefined;
};
/**
 * 自动登录提供者组件
 * 在应用启动时检查是否有保存的凭据，如果有则尝试自动登录
 */
export function AutoLoginProvider({ children }: AutoLoginProviderProps) {
  const { isLoading, isAuthenticated } = useAutoLogin();
  const pathname = usePathname();
  // 添加启动时的调试信息
  useEffect(() => {
    // 检查window对象
    if (typeof window !== 'undefined') {
      if (window.electron) {
        // 这里可能之前有console.log被删除了，留下了多余的括号
      }
    }
  }, []);
  // 调试信息
  useEffect(() => {
    // 安全检查，确保Electron环境存在
    if (isElectron()) {
      // TypeScript需要再次检查electron对象是否存在
      if (window.electron) {
        // 检查当前路径
        if (pathname === '/' || pathname === '/login') {
          if (isAuthenticated) {
          }
        }
        // 检查store API是否存在
        if (window.electron.store) {
          // 检查存储的会话
          window.electron.store.get('auth:supabase.auth.token')
            .then(token => {
              if (token) {
              } else {
              }
            })
            .catch(err => {
              // 处理错误
            });
          // 检查是否有保存的凭据  
          window.electron.store.get('auth:credentials')
            .then(creds => {
              if (creds) {
              } else {
              }
            })
            .catch(err => {
              // 处理错误
            });
        } else {
        }
      }
    }
  }, [isLoading, isAuthenticated, pathname]);
  // 我们只初始化自动登录逻辑，不阻止渲染
  return <>{children}</>;
} 