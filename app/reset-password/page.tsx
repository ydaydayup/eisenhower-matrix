"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updatePassword } from "@/lib/auth"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // 检查URL中是否包含重置密码所需的参数
    const checkSession = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        toast({
          title: "无效的重置链接",
          description: "请重新请求密码重置链接",
          variant: "destructive",
        })
        router.push("/forgot-password")
        return
      }

      setIsValid(true)
    }

    checkSession()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "两次输入的密码不一致",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "密码过短",
        description: "密码长度至少为6位",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const success = await updatePassword(newPassword)

      if (success) {
        toast({
          title: "密码重置成功",
          description: "您的密码已成功重置，请使用新密码登录",
        })
        router.push("/login")
      } else {
        toast({
          title: "重置失败",
          description: "密码重置失败，请稍后再试",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "重置失败",
        description: "密码重置失败，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">无效的重置链接</CardTitle>
            <CardDescription className="text-center">此链接无效或已过期，请重新请求密码重置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push("/forgot-password")}>
              返回重置密码页面
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">重置密码</CardTitle>
          <CardDescription className="text-center">请输入您的新密码</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "重置中..." : "重置密码"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

