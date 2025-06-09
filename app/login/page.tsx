"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  // 初始化 Supabase 客户端
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const client = await getSupabaseClient();
        setSupabaseClient(client);
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        setError("初始化认证服务失败，请刷新页面重试");
      }
    };
    
    initSupabase();
    
    // 尝试恢复保存的邮箱账号
    const loadRememberedEmail = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        // 确保store API可用
        if (!window.electron.store) {
          console.error("Electron store API不可用，无法加载保存的账号");
          return;
        }
        
        try {
          const rememberedEmail = await window.electron.store.get('auth:rememberedEmail');
          if (rememberedEmail) {
            console.log("填充保存的账号:", rememberedEmail);
            setEmail(rememberedEmail);
          }
        } catch (err) {
          console.error("无法加载保存的账号:", err);
        }
      }
    };
    
    loadRememberedEmail();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supabaseClient) {
      setError("认证服务尚未初始化，请稍后再试");
      return;
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // 使用 Supabase 客户端登录
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
        options: {
          // 如果选择了"记住我"，设置会话有效期为30天
          expiresIn: rememberMe ? 60 * 60 * 24 * 30 : undefined
        }
      })
      
      if (error) {
        setError(error.message)
        toast({
          title: "登录失败",
          description: error.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      
      if (data.user) {
        // 如果在 Electron 环境中，额外保存会话到持久化存储
        if (typeof window !== 'undefined' && 
            window.electron && 
            rememberMe) {
            
          // 确保store API可用
          if (!window.electron.store) {
            console.error("Electron store API不可用，使用localStorage作为备用存储");
            // 使用浏览器本地存储作为降级方案
            try {
              // 保存email到localStorage
              localStorage.setItem('auth:rememberedEmail', email);
              // 简单加密密码（实际应用中应使用更安全的加密）
              localStorage.setItem('auth:credentials', JSON.stringify({
                email,
                password: btoa(password),
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
              }));
            } catch (err) {
              console.warn("无法使用localStorage作为备用存储:", err);
            }
          } else {
            try {
              // 获取完整的会话对象
              const { data: sessionData } = await supabaseClient.auth.getSession();
              
              if (sessionData && sessionData.session) {
                console.log("保存会话，用户:", data.user.email);
                
                // 手动从localStorage获取会话token
                const localStorageAuth = localStorage.getItem('supabase.auth.token');
                if (localStorageAuth) {
                  // 保存到electron store
                  window.electron.store.set('auth:supabase.auth.token', localStorageAuth);
                  console.log("会话token已保存到store");
                } else {
                  console.log("警告: 无法从localStorage获取会话token");
                }
                
                // 计算过期时间：30天后
                const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                const expiresAt = Date.now() + thirtyDaysInMs;
                
                // 直接保存凭据到store (包括加密密码)
                window.electron.store.set('auth:credentials', {
                  email,
                  password: btoa(password), // 简单编码密码，实际应用中应使用更安全的加密
                  expiresAt
                });
                console.log("用户凭据已保存，有效期30天");
              }
            } catch (err) {
              console.warn("无法保存会话到 Electron 存储:", err);
            }
          }
        }
        
        toast({
          title: "登录成功",
          description: "欢迎回来！",
        })
      
        // 确保路由跳转到仪表盘
        console.log("登录成功，准备跳转到仪表盘");
        setTimeout(() => {
          router.push("/dashboard");
        }, 100); // 添加短暂延时确保状态更新完成
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("登录过程中发生错误，请稍后再试")
      toast({
        title: "登录失败",
        description: "发生错误，请稍后再试",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">输入您的邮箱和密码登录四象限待办事项</CardDescription>
        </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">密码</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    忘记密码?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => 
                    setRememberMe(checked === true)
                  } 
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  记住密码30天
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading || !supabaseClient}>
                {isLoading ? "登录中..." : "登录"}
              </Button>
              <div className="text-center text-sm">
                还没有账号?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  注册
                </Link>
              </div>
            </CardFooter>
          </form>
      </Card>
    </div>
  )
}

