"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addDays, subDays, isToday, startOfWeek, endOfWeek, getDay,
  addWeeks, subWeeks, getHours, getMinutes, parseISO } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Task } from "@/lib/tasks"
import { Badge } from "@/components/ui/badge"
interface CalendarProps {
  tasks: Task[]
  onSelectDate: (date: Date) => void
  onEditTask: (task: Task) => void
}
export default function Calendar({ tasks, onSelectDate, onEditTask }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "day">("month")
  // 获取月视图的日期数组（包括前后月份的日期以填满网格）
  const getDaysForMonthView = (date: Date) => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // 从周日开始
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }
  // 获取特定日期的任务，按时间排序
  const getTasksForDate = (date: Date) => {
    return tasks
      .filter(task => {
        if (!task.due_date) return false
        if (task.completed) return false // 过滤掉已完成的任务
        const taskDate = new Date(task.due_date)
        return isSameDay(taskDate, date)
      })
      .sort((a, b) => {
        if (!a.due_date || !b.due_date) return 0
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
  }
  // 获取任务的时间字符串 (HH:MM)
  const getTaskTime = (taskDate: string) => {
    try {
      const date = parseISO(taskDate)
      const hours = getHours(date)
      const minutes = getMinutes(date)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch (e) {
      return ""
    }
  }
  // 切换到上个月/下个月
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  // 切换到前一天/后一天
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  // 切换到前一周/后一周
  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1))
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1))
  // 切换到今天
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }
  // 选择日期
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    // 如果选择的日期不在当前显示的月份，更新当前月份
    if (!isSameMonth(date, currentDate)) {
      setCurrentDate(date)
    }
    // 直接切换到日视图，不调用onSelectDate避免弹出任务创建窗口
    setViewMode("day")
  }
  // 星期几的表头
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]
  // 获取任务象限的颜色
  const getQuadrantColor = (quadrant: number) => {
    switch (quadrant) {
      case 1: return "bg-red-400";
      case 2: return "bg-blue-400";
      case 3: return "bg-amber-400";
      case 4: return "bg-emerald-400";
      default: return "bg-primary";
    }
  }
  return (
    <div className="glass-card border-0 rounded-2xl overflow-hidden">
      {/* 日历头部 */}
      <div className="p-4 md:p-6 border-b border-gray-100/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {viewMode === "month" 
                ? format(currentDate, "yyyy年 M月", { locale: zhCN })
                : format(selectedDate, "yyyy年 M月 d日", { locale: zhCN })
              }
            </h3>
            <div className="glass-morphism rounded-full p-1 flex">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-full text-xs transition-all",
                  viewMode === "month" 
                    ? "bg-primary text-primary-foreground shadow" 
                    : "text-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("month")}
              >
                月
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-full text-xs transition-all",
                  viewMode === "day" 
                    ? "bg-primary text-primary-foreground shadow" 
                    : "text-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("day")}
              >
                日
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-lg hover:bg-white/40 hover:text-primary h-8 text-xs"
              onClick={goToToday}
            >
              今天
            </Button>
            {viewMode === "month" ? (
              <>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={goToPreviousDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* 月视图 */}
      {viewMode === "month" && (
        <div className="month-view-container">
          {/* 星期几表头 */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day, index) => (
              <div key={index} className="weekday-header">
                {day}
              </div>
            ))}
          </div>
          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysForMonthView(currentDate).map((date, i) => {
              const dayTasks = getTasksForDate(date)
              const isSelected = isSameDay(date, selectedDate)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isTodayDate = isToday(date)
              return (
                <button
                  key={i}
                  onClick={() => handleSelectDate(date)}
                  className={cn(
                    "calendar-cell",
                    !isCurrentMonth && "opacity-40",
                    isSelected && "ring-2 ring-primary bg-background/50",
                  )}
                >
                  <div className="flex flex-col h-full w-full p-1">
                    <div className="flex justify-center">
                      <span className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full text-sm",
                        isTodayDate && "bg-primary text-primary-foreground font-medium"
                      )}>
                        {format(date, "d")}
                      </span>
                    </div>
                    {/* 任务列表预览 */}
                    {dayTasks.length > 0 && (
                      <div className="mt-1 px-1 flex-grow">
                        {dayTasks.slice(0, 3).map((task, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "mb-1 truncate text-xs rounded-sm px-1 py-0.5 cursor-pointer",
                              getQuadrantColor(task.quadrant).replace("bg-", "bg-opacity-20 bg-"),
                              task.completed && "opacity-50 line-through"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditTask(task)
                            }}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-primary font-medium px-1">
                            +{dayTasks.length - 3}项
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {/* 日视图 */}
      {viewMode === "day" && (
        <div className="p-4 md:p-6">
          {/* 日期显示 */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* 当前日期大显示 */}
            <div className="flex-shrink-0">
              <div className="glass-morphism rounded-xl p-3 w-full md:w-52">
                <div className="flex flex-col items-center">
                  <div className="text-sm text-gray-500 font-medium">
                    {format(selectedDate, "EEEE", { locale: zhCN })}
                  </div>
                  <div className={cn(
                    "h-20 w-20 flex items-center justify-center rounded-full my-3",
                    isToday(selectedDate) 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background/40"
                  )}>
                    <span className="text-4xl font-bold">{format(selectedDate, "d")}</span>
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {format(selectedDate, "yyyy年 M月", { locale: zhCN })}
                  </div>
                  {/* 快速日期导航 */}
                  <div className="mt-4 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goToPreviousDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="text-xs h-7 rounded-lg hover:text-primary" onClick={goToToday}>
                      今天
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goToNextDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* 当天任务列表 */}
            <div className="flex-1 glass-morphism rounded-xl p-4 min-h-[400px]">
              <h4 className="font-medium text-gray-700 flex items-center mb-4">
                <span className="text-lg">待办任务</span>
                <Badge variant="outline" className="ml-2 bg-white/50">
                  {getTasksForDate(selectedDate).length}项
                </Badge>
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1.5">
                {getTasksForDate(selectedDate).length > 0 ? (
                  getTasksForDate(selectedDate).map((task, idx) => (
                    <div 
                      key={task.id}
                      className={cn(
                        "task-item p-3 group transition-all cursor-pointer",
                        task.completed && "task-item-completed opacity-70"
                      )}
                      onClick={() => onEditTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        {/* 时间显示 */}
                        {task.due_date && (
                          <div className="flex-shrink-0 w-12 text-sm font-medium text-gray-500">
                            {getTaskTime(task.due_date)}
                          </div>
                        )}
                        {/* 任务指示点 */}
                        <div className={cn(
                          "h-3 w-3 rounded-full flex-shrink-0",
                          getQuadrantColor(task.quadrant)
                        )} />
                        {/* 任务内容 */}
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "font-medium break-words",
                            task.completed && "line-through text-gray-400"
                          )}>
                            {task.title}
                          </p>
                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.tags.map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0 h-5 bg-white/70 text-gray-600 hover:bg-white"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-400">这一天没有任务安排</p>
                    <p className="text-sm text-gray-400 mt-1">享受悠闲的一天吧</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 