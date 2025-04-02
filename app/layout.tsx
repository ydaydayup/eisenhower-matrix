import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Todo应用",
  description: "一个简洁高效的待办事项管理应用",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  }
}

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
        {/* 装饰性背景元素 */}
        <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-indigo-50/80 to-purple-50/80" />
        <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-100/30 to-purple-100/30 blur-3xl" />
        <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-100/30 to-pink-100/30 blur-3xl" />
        
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