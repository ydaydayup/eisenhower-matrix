"use client"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { resetPassword } from "@/lib/auth"
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: "请输入邮箱",
        description: "请输入您的注册邮箱",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      const success = await resetPassword(email)
      if (success) {
        setIsSubmitted(true)
        toast({
          title: "重置链接已发送",
          description: "请检查您的邮箱，点击链接重置密码",
        })
      } else {
        toast({
          title: "发送失败",
          description: "无法发送重置链接，请稍后再试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "发送失败",
        description: "发生错误，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">找回密码</CardTitle>
          <CardDescription className="text-center">
            {isSubmitted ? "重置链接已发送" : "请输入您的注册邮箱获取重置链接"}
          </CardDescription>
        </CardHeader>
        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "发送中..." : "发送重置链接"}
              </Button>
              <div className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline">
                  返回登录
                </Link>
              </div>
            </CardContent>
          </form>
        ) : (
          <CardContent className="space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-md text-center">
              <p className="font-medium">重置链接已发送</p>
              <p className="text-sm mt-1">请检查您的邮箱 {email}，点击链接重置密码</p>
            </div>
            <div className="text-center">
              <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
                返回登录
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
