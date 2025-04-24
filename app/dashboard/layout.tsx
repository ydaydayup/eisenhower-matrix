import type React from "react"
import {Sidebar} from "@/components/sidebar"
import {redirect} from "next/navigation"
import {createClient} from "@/lib/supabase/server"
import PWAInstallButton from "@/components/pwa-install-button"
import DevBypassTest from "./dev-bypass-test"

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === "development"
// 读取环境变量中的配置，如果未设置则默认为false
const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" ? true : false

// 开发环境下的测试用户
const DEV_TEST_USER = {
    id: "dev-test-user-id",
    name: "开发测试用户",
    email: "dev@example.com",
}

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode
}) {


    try {
        // 生产环境正常流程：使用服务器端 Supabase 客户端
        const supabase = await createClient()

        // 获取会话
        const {
            data: {session},
        } = await supabase.auth.getSession()

        // 如果没有会话，重定向到登录页面
        if (!session) {
            // 使用 redirect 函数重定向到登录页面
            console.log("[AUTH] 未发现有效会话，重定向到登录页面")
            return redirect("/login")
        }

        // 获取用户资料
        const {data: profile} = await supabase.from("profiles").select("name").eq("id", session.user.id).single()

        const user = {
            id: session.user.id,
            name: profile?.name || session.user.email?.split("@")[0] || "",
            email: session.user.email || "",
        }

        // 正常渲染仪表板布局
        return (
            <div className="flex flex-col md:flex-row h-screen">
                <Sidebar user={user}/>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">
                    {children}
                    <PWAInstallButton/>
                </div>
            </div>
        )
    } catch (error) {
        console.error("Error in dashboard layout:", error)
        // 发生错误时重定向到登录页面
        return redirect("/login")
    }
}

