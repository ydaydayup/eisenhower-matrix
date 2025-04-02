import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "智能待办清单",
  description: "一个现代化的待办事项管理应用",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  }
}

// 在服务器端无法使用usePathname，我们将判断逻辑移到ThemeSwitcher组件中
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} relative min-h-screen overflow-x-hidden`}>
        {/* 装饰性背景元素 - 使用主题色变量 */}
        <div className="fixed inset-0 z-[-1] bg-background" />
        <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Toaster />
          <main className="relative z-10">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'