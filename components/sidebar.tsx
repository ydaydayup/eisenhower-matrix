"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckSquare, BarChart3, StickyNote, Menu, LogOut, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { logoutUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import * as Collapsible from '@radix-ui/react-collapsible'

interface SidebarProps {
  user: { id: string; name: string; email: string } | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // 检测是否为移动设备
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])

  // 退出登录
  const handleLogout = async () => {
    try {
      await logoutUser()
      toast({
        title: "已退出登录",
        description: "您已成功退出登录",
      })
      // 退出登录后会自动跳转到登录页面
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "退出失败",
        description: "退出登录时发生错误，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 侧边栏项目
  const sidebarItems = [
    {
      title: "待办事项",
      href: "/dashboard",
      icon: CheckSquare,
    },
    {
      title: "日历视图",
      href: "/dashboard/calendar",
      icon: Calendar,
    },
    {
      title: "备忘录",
      href: "/dashboard/notes",
      icon: StickyNote,
    },
    {
      title: "数据统计",
      href: "/dashboard/stats",
      icon: BarChart3,
    },
  ]

  // 侧边栏内容
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 py-3 md:px-3 md:py-4">
        <h2 className={cn("text-base md:text-lg font-semibold", isCollapsed ? "hidden" : "block")}>提速管理</h2>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      {user && !isCollapsed && (
        <div className="mb-3 px-3 text-xs md:text-sm text-muted-foreground">欢迎, {user.name}</div>
      )}
      <div className="space-y-1 px-2">
        {sidebarItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
            <Button
              variant={pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-sm",
                pathname === item.href && "bg-muted font-medium",
                isCollapsed && "px-2"
              )}
            >
              <item.icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
              {!isCollapsed && item.title}
            </Button>
          </Link>
        ))}
      </div>
      <div className="mt-auto px-2 py-3 md:px-3 md:py-4">
        <Button
          variant="outline"
          className={cn("w-full justify-start text-sm", isCollapsed && "px-2")}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
          {!isCollapsed && "退出登录"}
        </Button>
      </div>
    </div>
  )

  // 移动端侧边栏
  if (isMobile) {
    return (
      <>
        <div className="flex h-14 md:h-16 items-center border-b px-2 md:px-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-2 z-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-[280px] p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <h1 className="text-base md:text-lg font-semibold truncate">四象限管理系统</h1>
        </div>
      </>
    )
  }

  // 桌面端侧边栏
  return (
    <div className={cn(
      "hidden md:flex h-screen flex-col border-r transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-64"
    )}>
      <SidebarContent />
    </div>
  )
}

