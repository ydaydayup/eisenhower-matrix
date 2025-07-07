"use client"
import { supabase, getSupabaseClient } from "./supabase/client"
// 会话类型
export type Session = {
  id: string
  name: string
  email: string
}
// 获取当前会话 (客户端版本)
export const getSession = async (): Promise<Session | null> => {
  try {
    // 确保有可用的客户端
    const client = supabase || await getSupabaseClient()
    if (!client) {
      return null
    }
    const {
      data: { session },
      error,
    } = await client.auth.getSession()
    if (error) {
      return null
    }
    if (!session) {
      return null
    }
    try {
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("name")
        .eq("id", session.user.id)
        .single()
      if (profileError) {
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
      // 出错时返回基本用户信息
      return {
        id: session.user.id,
        name: session.user.email?.split("@")[0] || "",
        email: session.user.email || "",
      }
    }
  } catch (error) {
    return null
  }
}
// 获取用户会话（客户端版本）
export const getUserSession = async (): Promise<Session | null> => {
  return getSession()
}
// 退出登录
export const logoutUser = async (): Promise<void> => {
  try {
    const client = supabase || await getSupabaseClient()
    if (!client) {
      window.location.href = "/login"
      return
    }
    // 获取当前用户email，用于记住账号
    let rememberedEmail = "";
    try {
      const { data } = await client.auth.getSession();
      if (data.session && data.session.user && data.session.user.email) {
        rememberedEmail = data.session.user.email;
      }
    } catch(e) {
    }
    // 先清除本地存储
    localStorage.removeItem('supabase.auth.token')
    // 然后调用API登出
    await client.auth.signOut()
    // 如果在 Electron 环境中，清除持久化存储
    if (typeof window !== 'undefined' && window.electron) {
      // 确保store API可用
      if (!window.electron.store) {
        // 继续登出流程
        window.location.href = "/login";
        return;
      }
      try {
        // 清除认证会话数据
        window.electron.store.delete('auth:supabase.auth.token')
        // 获取当前保存的凭据
        const currentCredentials = await window.electron.store.get('auth:credentials');
        // 如果需要记住账号，则保留email但删除密码和过期时间
        if (currentCredentials && currentCredentials.email) {
          window.electron.store.set('auth:rememberedEmail', currentCredentials.email);
        } else if (rememberedEmail) {
          window.electron.store.set('auth:rememberedEmail', rememberedEmail);
        }
        // 清除敏感凭据
        window.electron.store.delete('auth:credentials')
        // 最后刷新页面
        setTimeout(() => {
          window.location.href = "/login"
        }, 300)
      } catch (e) {
        window.location.href = "/login"
      }
    } else {
      // 强制刷新页面以确保会话状态更新
      window.location.href = "/login"
    }
  } catch (error) {
    // 无论如何都重定向到登录页
    localStorage.removeItem('supabase.auth.token')
    window.location.href = "/login"
  }
}
// 重置密码
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const client = supabase || await getSupabaseClient()
    if (!client) {
      return false
    }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      return false
    }
    return true
  } catch (error) {
    return false
  }
}
// 更新密码
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  try {
    const client = supabase || await getSupabaseClient()
    if (!client) {
      return false
    }
    const { error } = await client.auth.updateUser({
      password: newPassword,
    })
    if (error) {
      return false
    }
    return true
  } catch (error) {
    return false
  }
}
