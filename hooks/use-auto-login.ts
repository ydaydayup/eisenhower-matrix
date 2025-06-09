import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';

// 检查是否在Electron环境 (基本检查)
const isElectron = () => {
  return typeof window !== 'undefined' && 
    window.electron !== undefined;
};

// 检查是否在Electron环境并且auth API可用
const isElectronWithAuth = () => {
  return typeof window !== 'undefined' && 
    window.electron !== undefined &&
    window.electron.auth !== undefined;
};

/**
 * 处理自动登录逻辑的Hook
 * 在应用启动时检查是否有保存的凭据，如果有且未过期则自动登录
 */
export function useAutoLogin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkAndLogin = async () => {
      try {
        // 检查是否在基本Electron环境
        if (!isElectron()) {
          console.log("不在Electron环境");
          setIsLoading(false);
          return;
        }
        
        // 确保window.electron存在 (TypeScript安全检查)
        if (!window.electron) {
          setIsLoading(false);
          return;
        }
        
        // 检查store API是否可用
        if (!window.electron.store) {
          console.error("Electron store API不可用，记住密码功能将不能正常工作");
          setIsLoading(false);
          return;
        }
        
        // 初始化Supabase客户端
        const client = await getSupabaseClient();
        
        // 检查是否已经登录 - 更严格的检查
        const { data } = await client.auth.getSession();
        if (data.session && data.session.user) {
          console.log("已经登录，无需自动登录", data.session.user.email);
          setIsAuthenticated(true);
          
          // 如果已登录但停留在登录页面，强制跳转到仪表盘
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '/login') {
            console.log("检测到已登录但在登录页面，强制跳转到仪表盘");
            router.push('/dashboard');
          }
          
          setIsLoading(false);
          return;
        } else {
          console.log("未登录，尝试自动登录");
        }

        // 尝试恢复会话
        try {
          // 获取保存的会话token
          const storedSession = await window.electron.store.get('auth:supabase.auth.token');
          if (!storedSession) {
            console.log("没有找到保存的会话token");
            setIsLoading(false);
            return;
          }
          
          console.log("找到保存的token，尝试恢复会话");
          
          // 保存到localStorage以恢复会话
          localStorage.setItem('supabase.auth.token', storedSession);
          
          // 重新初始化客户端以使用新token
          const refreshedClient = await getSupabaseClient();
          
          // 再次检查会话
          const { data: sessionData } = await refreshedClient.auth.getSession();
          if (sessionData.session && sessionData.session.user) {
            console.log("成功恢复会话", sessionData.session.user.email);
            setIsAuthenticated(true);
            toast({
              title: "自动登录成功",
              description: "您已使用保存的凭据登录",
            });
            
            // 如果当前在登录页，自动跳转到仪表盘
            const currentPath = window.location.pathname;
            if (currentPath === '/login') {
              router.push('/dashboard');
            }
            setIsLoading(false);
            return;
          } else {
            console.log("会话token无效，清除并尝试获取凭据");
            // 清除无效token
            localStorage.removeItem('supabase.auth.token');
            window.electron.store.delete('auth:supabase.auth.token');
          }
        } catch (e) {
          console.error("恢复会话失败:", e);
        }

        // 获取凭据尝试登录
        let credentials = null;
        
        // 尝试从store直接获取凭据
        try {
          credentials = await window.electron.store.get('auth:credentials');
          if (credentials && credentials.email && credentials.expiresAt) {
            // 验证凭据是否过期
            const now = Date.now();
            if (now > credentials.expiresAt) {
              console.log("凭据已过期");
              window.electron.store.delete('auth:credentials');
              setIsLoading(false);
              return;
            }
            
            console.log("找到有效凭据，尝试重新登录:", credentials.email);
            
            // 使用保存的凭据重新登录
            if (credentials.password) {
              try {
                // 解码密码
                const decodedPassword = atob(credentials.password);
                
                // 使用保存的密码登录
                const { data, error } = await client.auth.signInWithPassword({
                  email: credentials.email,
                  password: decodedPassword,
                  options: {
                    // 保持记住我状态
                    expiresIn: 60 * 60 * 24 * 30 // 30天
                  }
                });
                
                if (error) {
                  console.error("使用保存的凭据登录失败:", error.message);
                  setIsLoading(false);
                  return;
                }
                
                if (data && data.user) {
                  console.log("使用保存的凭据登录成功");
                  
                  // 更新会话token，保持一致性
                  const { data: sessionData } = await client.auth.getSession();
                  if (sessionData && sessionData.session) {
                    const localStorageAuth = localStorage.getItem('supabase.auth.token');
                    if (localStorageAuth) {
                      window.electron.store.set('auth:supabase.auth.token', localStorageAuth);
                    }
                  }
                  
                  setIsAuthenticated(true);
                  toast({
                    title: "自动登录成功",
                    description: "已使用保存的凭据登录",
                  });
                  
                  // 如果当前在登录页，自动跳转到仪表盘
                  const currentPath = window.location.pathname;
                  if (currentPath === '/login') {
                    router.push('/dashboard');
                  }
                  setIsLoading(false);
                  return;
                }
              } catch (e) {
                console.error("自动登录密码解析或登录出错:", e);
              }
            }
          } else {
            console.log("没有找到有效凭据");
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("获取凭据时出错:", e);
          setIsLoading(false);
          return;
        }
        
        // 如果我们有登录凭据，但无法通过会话token登录，可以在这里添加提示用户输入密码的逻辑
        console.log("找到凭据但无法自动登录，可能需要重新登录");
        
      } catch (err) {
        console.error("自动登录错误:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAndLogin();
  }, [router, toast]);
  
  return { isLoading, isAuthenticated };
} 