import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === "development"
// 读取环境变量中的配置，如果未设置则默认为false
const DEV_AUTO_DASHBOARD = process.env.NEXT_PUBLIC_DEV_AUTO_DASHBOARD === "true" ? true : false

export default async function Home() {
  try {
    // 开发环境下，仅当DEV_AUTO_DASHBOARD为true时才自动重定向到仪表盘
    if (isDevelopment && DEV_AUTO_DASHBOARD) {
      console.log("[DEV] 开发环境：自动重定向到仪表盘")
      return redirect("/dashboard")
    }
    
    // 生产环境正常流程：使用服务器端 Supabase 客户端
    const supabase = await createClient()

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

