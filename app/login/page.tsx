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
import { supabase } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 开发环境测试账号
const DEV_ACCOUNTS = [
  { email: "test@example.com", password: "password123", name: "测试用户" },
  { email: "admin@example.com", password: "admin123", name: "管理员" },
]

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === "development"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  // 开发环境下启用的自动登录功能
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(false)
  
  // 尝试自动登录
  useEffect(() => {
    // 仅在开发环境且启用自动登录时执行
    if (isDevelopment && autoLoginEnabled) {
      const devLogin = async () => {
        const testAccount = DEV_ACCOUNTS[0]
        setEmail(testAccount.email)
        setPassword(testAccount.password)
        
        try {
          await loginWithCredentials(testAccount.email, testAccount.password)
        } catch (error) {
          console.error("自动登录失败:", error)
          setAutoLoginEnabled(false) // 关闭自动登录防止循环
        }
      }
      
      devLogin()
    }
  }, [autoLoginEnabled])
  
  // 执行登录
  const loginWithCredentials = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 确保supabase实例正确初始化
      if (!supabase || !supabase.auth) {
        console.error("Supabase客户端未正确初始化")
        setError("系统错误：认证服务未初始化")
        setIsLoading(false)
        return
      }
      
      console.log("开始登录流程...", loginEmail)
      
      // 执行登录
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      
      if (loginError) {
        console.error("登录错误:", loginError)
        setError(loginError.message)
        toast({
          title: "登录失败",
          description: loginError.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      
      if (!data.user || !data.session) {
        console.error("登录成功但缺少用户或会话数据")
        setError("登录成功但无法获取用户信息")
        setIsLoading(false)
        return
      }
      
      console.log("登录成功，用户ID:", data.user.id)
      
      // 安全地访问会话属性
      if (data.session.expires_at) {
        console.log("会话过期时间:", new Date(data.session.expires_at * 1000).toLocaleString())
      }
      console.log("Token类型:", data.session.token_type)
      
      // 确保会话被正确设置
      const { error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error("获取会话失败:", sessionError)
      }
      
      // 显示成功提示
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      })
      
      // 等待一小段时间确保cookie已设置
      setIsLoading(true)
      setTimeout(() => {
        console.log("正在跳转到仪表板...")
        
        // 使用window.location而不是router.push来确保页面完全刷新
        window.location.href = "/dashboard"
      }, 1000)
      
    } catch (err) {
      console.error("登录过程中发生异常:", err)
      setError("登录过程中发生错误，请稍后再试")
      toast({
        title: "登录失败",
        description: "发生错误，请稍后再试",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithCredentials(email, password)
  }
  
  // 使用测试账号登录的处理函数
  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setEmail(account.email)
    setPassword(account.password)
    await loginWithCredentials(account.email, account.password)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">输入您的邮箱和密码登录四象限待办事项</CardDescription>
        </CardHeader>
        
        {isDevelopment && (
          <div className="px-6 pb-2">
            <Tabs defaultValue="normal">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="normal">正常登录</TabsTrigger>
                <TabsTrigger value="dev">开发测试</TabsTrigger>
              </TabsList>
              
              <TabsContent value="normal">
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
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
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
              </TabsContent>
              
              <TabsContent value="dev">
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    选择一个测试账号直接登录 (仅开发环境有效)
                  </div>
                  
                  <div className="space-y-2">
                    {DEV_ACCOUNTS.map((account, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleDevLogin(account)}
                        disabled={isLoading}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground">{account.email}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => setAutoLoginEnabled(true)}
                    disabled={isLoading || autoLoginEnabled}
                  >
                    自动登录 (无需点击)
                  </Button>
                </CardContent>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {!isDevelopment && (
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
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
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
        )}
      </Card>
    </div>
  )
}

