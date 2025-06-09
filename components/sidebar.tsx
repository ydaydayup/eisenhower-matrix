"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CheckSquare, BarChart3, StickyNote, Menu, LogOut, Calendar, ChevronLeft, ChevronRight, Palette, GripVertical, Pin } from "lucide-react"
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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dynamic from "next/dynamic"
import React from "react"
import { useClient } from "@/lib/hooks/use-client"
import { usePinWindow } from "@/lib/hooks/use-pin-window"
import PinWindowButton from "@/components/PinWindowButton"

// 添加Electron类型定义
declare global {
  interface Window {
    electron?: {
      send: (channel: string, ...args: any[]) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      showNotification: (options: any) => void;
      togglePinWindow: () => void;
      setPinStatus: (isPinned: boolean) => void;
      isWindowPinned: () => Promise<boolean>;
      test?: () => string;
    };
  }
}

interface SidebarProps {
  user: { id: string; name: string; email: string } | null
}

// 定义图标映射
const IconMap = {
  CheckSquare,
  Calendar,
  StickyNote,
  BarChart3,
  // 确保所有图标都在这里列出
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Palette,
  GripVertical,
  Pin
};

// 定义侧边栏项目类型
interface SidebarItem {
  id: string;
  title: string;
  href: string;
  icon: keyof typeof IconMap; // 确保类型安全
}

// 定义可排序组件，将其移出主组件
const SortableItemComponent = ({ 
  id, 
  item,
  isCollapsed,
  isMobile,
  setIsOpen,
  pathname,
  setUserIntentionalNavigation
}: { 
  id: string, 
  item: SidebarItem,
  isCollapsed: boolean,
  isMobile: boolean,
  setIsOpen: (value: boolean) => void,
  pathname: string,
  setUserIntentionalNavigation: (value: boolean) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  
  // 安全地获取图标组件
  const IconComponent = IconMap[item.icon] || IconMap.StickyNote;
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <div 
        {...attributes} 
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing p-1 mr-1 -ml-1 rounded hover:bg-muted/80 flex items-center",
          isCollapsed && "hidden"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Link 
        href={item.href} 
        className="flex-1"
        onClick={() => {
          // 设置用户有意图的导航
          setUserIntentionalNavigation(true);
          
          // 如果是移动端，点击后关闭侧边栏
          if (isMobile) {
            setIsOpen(false)
          }
        }}
      >
        <Button
          variant={pathname === item.href ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start text-sm",
            pathname === item.href && "bg-muted font-medium",
            isCollapsed ? "px-2" : ""
          )}
        >
          <IconComponent className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
          <span className={cn(
            "transition-opacity duration-300 ease-in-out whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            {item.title}
          </span>
        </Button>
      </Link>
    </div>
  )
}

// 使用dynamic导入，禁用SSR
const SortableItem = dynamic(() => Promise.resolve(SortableItemComponent), { 
  ssr: false 
})

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { isPanelOpen, setIsPanelOpen } = useTheme()
  const [clientReady, setClientReady] = useState(false) // 添加客户端就绪状态
  const [userIntentionalNavigation, setUserIntentionalNavigation] = useState(false)
  // 检测是否在Electron环境
  const isClient = useClient()
  const isElectron = isClient && typeof window !== 'undefined' && !!window.electron
  // 引入窗口置顶功能
  const { isPinned, lastUpdate, togglePin, refreshStatus, isAvailable, setPinStatus } = usePinWindow()
  
  // 组件挂载时和窗口获得焦点时刷新状态
  useEffect(() => {
    // 组件挂载时请求一次状态
    if (isElectron && isAvailable) {
      refreshStatus();
    }
  }, [isElectron, isAvailable, refreshStatus]);
  
  // 主题按钮引用
  const themeButtonRef = useRef<HTMLButtonElement>(null)

  // 默认侧边栏项目
  const defaultSidebarItems: SidebarItem[] = [
    {
      id: 'todos',
      title: "待办事项",
      href: "/dashboard",
      icon: "CheckSquare",
    },
    {
      id: 'calendar',
      title: "日历视图",
      href: "/dashboard/calendar",
      icon: "Calendar",
    },
    {
      id: 'notes',
      title: "随手记",
      href: "/dashboard/notes",
      icon: "StickyNote",
    },
    {
      id: 'stats',
      title: "数据统计",
      href: "/dashboard/stats",
      icon: "BarChart3",
    },
  ]
  
  // 添加排序状态
  const [orderedItems, setOrderedItems] = useState<SidebarItem[]>(defaultSidebarItems)
  
  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // 客户端初始化
  useEffect(() => {
    setClientReady(true) // 标记客户端已就绪
    
    // 检测窗口大小并设置移动状态
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // 如果切换到移动设备，强制展开侧边栏
      if (mobile && isCollapsed) {
        setIsCollapsed(false)
      }
    }
    
    // 从localStorage读取状态
    try {
      const savedCollapsedState = localStorage.getItem('sidebar-collapsed')
      if (savedCollapsedState !== null) {
        setIsCollapsed(savedCollapsedState === 'true')
      }
      
      // 读取排序
      const savedOrder = localStorage.getItem('sidebar-order')
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder)
          // 确保解析出的数据包含有效的图标类型
          const validatedItems = parsedOrder.map((item: any) => {
            // 确保item.icon是IconMap中的有效键
            if (item && typeof item.icon === 'string' && item.icon in IconMap) {
              return item;
            }
            // 如果不是有效的图标，尝试从默认项中找到对应ID的项
            const defaultItem = defaultSidebarItems.find(def => def.id === item.id);
            if (defaultItem) {
              return {
                ...item,
                icon: defaultItem.icon // 使用默认项的图标
              };
            }
            // 最后的备选，使用第一个默认图标
            return {
              ...item,
              icon: 'StickyNote' as keyof typeof IconMap
            };
          });
          setOrderedItems(validatedItems)
        } catch (e) {
          console.error('解析本地排序数据失败:', e)
        }
      }
    } catch (error) {
      console.error('无法访问localStorage:', error)
    }
    
    // 初始检查并设置监听器
    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)
    
    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])
  
  // 用户加载后从后端加载排序
  useEffect(() => {
    // 如果客户端已就绪且已登录用户，尝试从后端加载排序
    if (clientReady && user) {
      loadSidebarOrderFromBackend()
        .catch(err => console.error('加载用户排序偏好失败:', err))
    }
  }, [user, clientReady])
  
  // 修改自动导航到第一个tab页的逻辑
  useEffect(() => {
    // 仅当客户端就绪、有用户登录且当前路径为主页或登录页时执行
    // 不在dashboard主页执行，因为可能是用户点击了待办事项tab
    const isHomeOrLogin = pathname === '/' || pathname === '/login';
    
    if (clientReady && user && isHomeOrLogin && !userIntentionalNavigation) {
      // 使用排序后的项目列表
      if (orderedItems.length > 0) {
        const firstItem = orderedItems[0]
        
        // 导航到第一个页面
        console.log('导航到排序中的第一个页面:', firstItem.href)
        router.push(firstItem.href)
      }
    }
  }, [clientReady, user, orderedItems, pathname, router, userIntentionalNavigation])

  // 保存折叠状态到localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    
    // 安全地访问localStorage - 确保只在客户端执行
    if (clientReady) {
      try {
        localStorage.setItem('sidebar-collapsed', String(newState))
      } catch (error) {
        console.error('无法保存到localStorage:', error)
      }
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

  // 修复静态渲染部分的图标渲染
  // 在客户端还未准备好时使用静态渲染
  const renderStaticItems = () => {
    return orderedItems.map((item) => (
      <div key={item.id} className="flex items-center">
        <Link 
          href={item.href} 
          className="flex-1"
        >
          <Button
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-sm",
              pathname === item.href && "bg-muted font-medium",
              isCollapsed ? "px-2" : ""
            )}
          >
            {(() => {
              const Icon = IconMap[item.icon] || IconMap.StickyNote;
              return <Icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />;
            })()}
            <span className={cn(
              "transition-opacity duration-300 ease-in-out whitespace-nowrap",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              {item.title}
            </span>
          </Button>
        </Link>
      </div>
    ));
  }

  // 修改SidebarContent组件
  const SidebarContent = () => {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-2 py-3 md:px-3 md:py-4">
          <h2 className={cn("text-base md:text-lg font-semibold", isCollapsed ? "hidden" : "block")}>AI提效</h2>
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
          {clientReady ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={orderedItems.map(item => item.id)} 
                strategy={verticalListSortingStrategy}
              >
                {orderedItems.map((item) => (
                  <SortableItem 
                    key={item.id}
                    id={item.id}
                    item={item}
                    isCollapsed={isCollapsed}
                    isMobile={isMobile}
                    setIsOpen={setIsOpen}
                    pathname={pathname}
                    setUserIntentionalNavigation={setUserIntentionalNavigation}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            renderStaticItems()
          )}
        </div>

        <div className="mt-auto px-2 py-3 md:px-3 md:py-4 space-y-2">
          {/* 钉在桌面按钮 - 仅在Electron环境显示 */}
          {renderPinButton()}
          
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
            <span className={cn(
              "transition-opacity duration-300 ease-in-out whitespace-nowrap",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              主题设置
            </span>
          </Button>
          
          <Button
            variant="outline"
            className={cn("w-full justify-start text-sm", isCollapsed ? "px-2" : "")}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />
            <span className={cn(
              "transition-opacity duration-300 ease-in-out whitespace-nowrap",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              退出登录
            </span>
          </Button>
        </div>
      </div>
    )
  }

  // 修改handleDragEnd保存部分
  const handleDragEnd = (event: any) => {
    const { active, over } = event
    
    if (active.id !== over.id) {
      setOrderedItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // 确保只在客户端执行localStorage操作
        if (clientReady) {
          try {
            localStorage.setItem('sidebar-order', JSON.stringify(newItems))
          } catch (error) {
            console.error('保存排序到localStorage失败:', error)
          }
        }
        
        // 调用保存函数，仅在登录时保存
        if (user) {
          saveSidebarOrderToBackend(newItems)
            .catch(err => console.error('保存排序失败:', err))
        }
        
        return newItems
      })
    }
  }

  // 修改保存排序到后端的函数，添加错误处理
  const saveSidebarOrderToBackend = async (items: SidebarItem[]) => {
    localStorage.setItem('sidebar-order', JSON.stringify(items));
    // try {
    //   const response = await fetch('/api/user/preferences', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       sidebarOrder: items.map(item => item.id)
    //     })
    //   });
    //
    //   const data = await response.json();
    //   localStorage.setItem('sidebar-order', JSON.stringify(items));
    //   // 检查是否需要使用本地缓存
    //   if (data.useLocalCache) {
    //     console.log('后端存储不可用，使用本地缓存:', data.message || '未知原因');
    //     // 保存到本地存储
    //     if (clientReady) {
    //       try {
    //         localStorage.setItem('sidebar-order', JSON.stringify(items));
    //         console.log('已保存排序到本地缓存');
    //       } catch (error) {
    //         console.error('保存到本地缓存失败:', error);
    //       }
    //     }
    //
    //     // 返回一个成功对象，因为已经保存到本地
    //     return { success: true, local: true };
    //   }
    //
    //   if (!response.ok && !data.success) {
    //     throw new Error(data.error || '保存失败');
    //   }
    //
    //   return data;
    // } catch (error) {
    //   console.error('保存排序到后端失败:', error);
    //   // 出错时也保存到本地
    //   if (clientReady) {
    //     try {
    //       localStorage.setItem('sidebar-order', JSON.stringify(items));
    //       console.log('保存到后端失败，已保存到本地缓存');
    //     } catch (localError) {
    //       console.error('保存到本地缓存也失败:', localError);
    //     }
    //   }
    //   return Promise.reject(error);
    // }
  };

  // 从后端加载排序的函数，增强错误处理和本地缓存备份
  const loadSidebarOrderFromBackend = async () => {
    return loadFromLocalStorage();
    // try {
    //   const response = await fetch(`/api/user/preferences`);
    //
    //   const data = await response.json();
    //
    //   // 检查是否需要使用本地缓存
    //   if (data.useLocalCache || !response.ok) {
    //     console.log('后端存储不可用，使用本地缓存:', data.message || data.error || '未知原因');
    //     return loadFromLocalStorage();
    //   }
    //
    //   // 如果没有设置或设置为空，也使用本地缓存
    //   if (!data.settings || !data.settings.sidebarOrder) {
    //     console.log('后端无保存的排序，使用本地缓存');
    //     return loadFromLocalStorage();
    //   }
    //
    //   // 将后端数据设置到state
    //   const orderIds = data.settings.sidebarOrder as string[];
    //   if (applyOrderToState(orderIds)) {
    //     console.log('成功从后端加载排序');
    //     return true;
    //   }
    //
    //   return false;
    // } catch (error) {
    //   console.error('从后端加载排序失败:', error);
    //   return loadFromLocalStorage();
    // }
  };
  
  // 添加从本地存储加载的函数
  const loadFromLocalStorage = (): boolean => {
    if (!clientReady) return false;
    
    try {
      const savedOrder = localStorage.getItem('sidebar-order');
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          // 确保解析出的数据包含有效的图标类型
          const validatedItems = parsedOrder.map((item: any) => {
            // 确保item.icon是IconMap中的有效键
            if (item && typeof item.icon === 'string' && item.icon in IconMap) {
              return item;
            }
            // 如果不是有效的图标，尝试从默认项中找到对应ID的项
            const defaultItem = defaultSidebarItems.find(def => def.id === item.id);
            if (defaultItem) {
              return {
                ...item,
                icon: defaultItem.icon // 使用默认项的图标
              };
            }
            // 最后的备选，使用第一个默认图标
            return {
              ...item,
              icon: 'StickyNote' as keyof typeof IconMap
            };
          });
          setOrderedItems(validatedItems);
          console.log('成功从本地缓存加载排序');
          return true;
        } catch (e) {
          console.error('解析本地排序数据失败:', e);
        }
      }
    } catch (error) {
      console.error('从本地存储加载失败:', error);
    }
    
    return false;
  };
  
  // 应用排序到状态的通用函数
  const applyOrderToState = (orderIds: string[]): boolean => {
    try {
      // 按照保存的顺序排列项目
      const orderedItems = orderIds
        .map(id => defaultSidebarItems.find(item => item.id === id))
        .filter(Boolean) as SidebarItem[];
      
      // 如果有新增的项目（不在保存的ID列表中），添加到末尾
      const missingItems = defaultSidebarItems.filter(
        item => !orderIds.includes(item.id)
      );
      
      if (missingItems.length > 0) {
        orderedItems.push(...missingItems);
      }
      
      // 如果结果有效，设置状态
      if (orderedItems.length > 0) {
        setOrderedItems(orderedItems);
        
        // 同时保存到本地存储作为缓存
        try {
          if (clientReady) {
            localStorage.setItem('sidebar-order', JSON.stringify(orderedItems));
          }
        } catch (error) {
          console.error('保存排序到localStorage失败:', error);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('应用排序状态失败:', error);
      return false;
    }
  };

  // 渲染钉在桌面按钮
  const renderPinButton = () => {
    // 确保环境条件满足
    if (!isElectron || !isAvailable) return null;
    
    return (
      <PinWindowButton
        variant="outline"
        className={cn("w-full justify-start text-sm", isCollapsed ? "px-2" : "")}
        isCollapsed={isCollapsed}
      />
    );
  };

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
      <aside className="left-0 top-0 bottom-0 h-screen z-20">
        <Collapsible.Root
          open={!isCollapsed}
          onOpenChange={(open) => {
            setIsCollapsed(!open)
            if (typeof window !== 'undefined') {
              localStorage.setItem('sidebar-collapsed', (!open).toString())
            }
          }}
          className={cn(
            "flex flex-col h-full bg-card shadow-md border-r border-border transition-all duration-300 ease-in-out",
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

