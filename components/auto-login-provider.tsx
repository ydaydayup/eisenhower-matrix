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
    console.log("AutoLoginProvider 组件挂载");
    // 检查window对象
    if (typeof window !== 'undefined') {
      console.log("window 对象存在");
      console.log("electron 对象:", window.electron ? "存在" : "不存在");
      if (window.electron) {
        console.log("electron API包含:", Object.keys(window.electron));
        console.log("store API:", window.electron.store ? "存在" : "不存在");
        console.log("auth API:", window.electron.auth ? "存在" : "不存在");
      }
    }
  }, []);
  
  // 调试信息
  useEffect(() => {
    // 安全检查，确保Electron环境存在
    if (isElectron()) {
      // TypeScript需要再次检查electron对象是否存在
      if (window.electron) {
        console.log('AutoLoginProvider 已加载', { 
          isLoading, 
          isAuthenticated,
          pathname,
          isElectron: true,
          hasAuthAPI: window.electron.auth !== undefined,
          hasStore: window.electron.store !== undefined
        });
        
        // 检查当前路径
        console.log("当前路径:", pathname);
        if (pathname === '/' || pathname === '/login') {
          if (isAuthenticated) {
            console.log("已验证登录状态但仍在登录页，可能需要手动跳转");
          }
        }
        
        // 检查store API是否存在
        if (window.electron.store) {
          // 检查存储的会话
          window.electron.store.get('auth:supabase.auth.token')
            .then(token => {
              if (token) {
                console.log("存在保存的会话token");
              } else {
                console.log("没有找到保存的会话token");
              }
            })
            .catch(err => console.error("获取token出错:", err));
            
          // 检查是否有保存的凭据  
          window.electron.store.get('auth:credentials')
            .then(creds => {
              if (creds) {
                console.log("存在保存的凭据，邮箱:", creds.email);
              } else {
                console.log("没有找到保存的凭据");
              }
            })
            .catch(err => console.error("获取凭据出错:", err));
        } else {
          console.error("Electron store API不可用，记住密码功能将不能正常工作");
        }
      }
    }
  }, [isLoading, isAuthenticated, pathname]);
  
  // 我们只初始化自动登录逻辑，不阻止渲染
  return <>{children}</>;
} 