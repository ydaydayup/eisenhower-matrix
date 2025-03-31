"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckSquare, BarChart3, StickyNote, Menu, LogOut, Calendar, ChevronLeft, ChevronRight, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect, useRef } from "react"
import { logoutUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import * as Collapsible from '@radix-ui/react-collapsible'
import { useTheme } from "@/components/theme-provider"
import { ThemeSwitcher } from "@/components/theme-provider"

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
  const { isPanelOpen, setIsPanelOpen } = useTheme()
  
  // 主题按钮引用
  const themeButtonRef = useRef<HTMLButtonElement>(null)

  // 检测是否为移动设备并从本地存储中加载collapsed状态
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // 如果切换到移动设备，强制展开侧边栏
      if (mobile && isCollapsed) {
        setIsCollapsed(false)
      }
    }

    // 从localStorage读取折叠状态 - 使用try-catch避免服务器渲染问题
    try {
      if (typeof window !== 'undefined') {
        const savedCollapsedState = localStorage.getItem('sidebar-collapsed')
        if (savedCollapsedState !== null) {
          setIsCollapsed(savedCollapsedState === 'true')
        }
      }
    } catch (error) {
      console.error('无法访问localStorage:', error)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])  // 移除isCollapsed依赖，避免循环重渲染

  // 保存折叠状态到localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    
    // 安全地访问localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-collapsed', String(newState))
      }
    } catch (error) {
      console.error('无法保存到localStorage:', error)
    }
  }

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
  const SidebarContent = () => {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-2 py-3 md:px-3 md:py-4">
          <h2 className={cn("text-base md:text-lg font-semibold", isCollapsed ? "hidden" : "block")}>AI提速</h2>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {user && !isCollapsed && (
          <div className="mb-3 px-3 text-xs md:text-sm text-muted-foreground">欢迎, {user.name}</div>
        )}
        <div className="space-y-1 px-2">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={(e) => {
              // 如果是移动端，点击后关闭侧边栏
              if (isMobile) {
                setIsOpen(false);
              }
            }}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-sm",
                  pathname === item.href && "bg-muted font-medium",
                  isCollapsed ? "px-2" : ""
                )}
              >
                <item.icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
                {!isCollapsed && <span>{item.title}</span>}
              </Button>
            </Link>
          ))}
        </div>

        <div className="mt-auto px-2 py-3 md:px-3 md:py-4 space-y-2">
          {/* 主题设置按钮 */}
          <Button
            ref={themeButtonRef}
            variant="outline"
            className={cn("w-full justify-start text-sm", isCollapsed ? "px-2" : "")}
            onClick={() => {
              // 直接切换面板状态，不使用延迟
              setIsPanelOpen(!isPanelOpen);
            }}
          >
            <Palette className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
            {!isCollapsed && <span>主题设置</span>}
          </Button>
          
          <Button
            variant="outline"
            className={cn("w-full justify-start text-sm", isCollapsed ? "px-2" : "")}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
            {!isCollapsed && <span>退出登录</span>}
          </Button>
        </div>
      </div>
    )
  }

  // 移动端侧边栏
  if (isMobile) {
    return (
      <>
        <div className="flex h-14 md:h-16 items-center border-b px-2 md:px-4 sticky top-0 bg-background z-10">
          <Sheet open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            // 如果打开了侧边栏但在移动设备上，确保侧边栏展开
            if (open && isMobile) {
              setIsCollapsed(false);
            }
          }}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-2 z-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-[280px] p-0 overflow-y-auto">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <h1 className="text-base md:text-lg font-semibold truncate">四象限管理系统</h1>
        </div>
        
        {/* 传递主题按钮引用 */}
        <ThemeSwitcher buttonRef={themeButtonRef} />
      </>
    )
  }

  // 桌面端侧边栏
  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 h-screen z-20">
        <Collapsible.Root
          open={!isCollapsed}
          onOpenChange={(open) => {
            setIsCollapsed(!open)
            if (typeof window !== 'undefined') {
              localStorage.setItem('sidebar-collapsed', (!open).toString())
            }
          }}
          className={cn(
            "flex flex-col h-full bg-card shadow-md border-r border-border transition-all duration-300",
            isCollapsed ? "w-[60px]" : "w-[230px]"
          )}
        >
          <SidebarContent />
        </Collapsible.Root>
      </aside>
      
      {/* 传递主题按钮引用 */}
      <ThemeSwitcher buttonRef={themeButtonRef} />
    </>
  )
}

