"use client"

import { supabase } from "./supabase/client"

// 会话类型
export type Session = {
  id: string
  name: string
  email: string
}

// 获取当前会话 (客户端版本)
export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    console.log("No session found:", error)
    return null
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // 即使没有找到profile，也返回基本用户信息
      return {
        id: session.user.id,
        name: session.user.email?.split("@")[0] || "",
        email: session.user.email || "",
      }
    }

    return {
      id: session.user.id,
      name: profile?.name || session.user.email?.split("@")[0] || "",
      email: session.user.email || "",
    }
  } catch (err) {
    console.error("Error in getSession:", err)
    // 出错时返回基本用户信息
    return {
      id: session.user.id,
      name: session.user.email?.split("@")[0] || "",
      email: session.user.email || "",
    }
  }
}

// 获取用户会话（客户端版本）
export const getUserSession = async (): Promise<Session | null> => {
  return getSession()
}

// 退出登录
export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut()
  // 强制刷新页面以确保会话状态更新
  window.location.href = "/login"
}

// 重置密码
export const resetPassword = async (email: string): Promise<boolean> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    console.error("Reset password error:", error)
    return false
  }

  return true
}

// 更新密码
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error("Update password error:", error)
    return false
  }

  return true
}

