import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  try {
    // 使用服务器端 Supabase 客户端
    const supabase = createClient()

    // 获取会话
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // 根据会话状态重定向
    if (!session) {
      return redirect("/login")
    } else {
      return redirect("/dashboard")
    }
  } catch (error) {
    console.error("Error in home page:", error)
    // 发生错误时重定向到登录页面
    return redirect("/login")
  }
}

