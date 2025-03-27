"use client"

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import "react-big-calendar/lib/css/react-big-calendar.css"
import { getSupabaseClient } from '@/lib/supabase/client'
import { useToast } from "@/components/ui/use-toast"
import { Task, updateTask, getUserTasks, createTask } from "@/lib/tasks"
import { getUserTags } from "@/lib/tags"
import TaskEditModal from '@/components/TaskEditModal'
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight, Calendar, PlusCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from '@/lib/utils'

import "./calendar.css"

const locales = {
  'zh-CN': zhCN,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// 自定义格式化函数
const formats = {
  monthHeaderFormat: (date: Date) => format(date, 'yyyy年MM月'),
  dayHeaderFormat: (date: Date) => format(date, 'yyyy年MM月dd日'),
  dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
    `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'yyyy年MM月dd日')}`,
  weekdayFormat: (date: Date) => {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return weekdays[date.getDay()]
  },
  eventTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => {
    return `${format(start, 'HH:mm')}`;
  },
  timeGutterFormat: (date: Date) => format(date, 'HH:mm'),
}

interface Event {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
}

interface DateRange {
  start: Date
  end: Date
}

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'day'>('month')
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [taskForm, setTaskForm] = useState({
    title: "",
    quadrant: 1 as 1 | 2 | 3 | 4,
    due_date: "",
    tags: [] as string[],
    notes: "",
  })

  // 获取用户数据
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error('No user found')
          return
        }
        
        setUser(user)
        
        // 获取用户标签
        const userTags = await getUserTags(user.id)
        setTags(userTags)
        
        // 获取用户任务
        const userTasks = await getUserTasks(user.id)
        
        // 将任务转换为日历事件格式 - 只显示未完成的任务
        const calendarEvents = userTasks
          .filter(task => task.due_date && !task.completed) // 只处理有截止日期且未完成的任务
          .map(task => {
            // 确保日期格式正确
            const dueDate = new Date(task.due_date as string)
            
            return {
              id: task.id,
              title: task.title,
              start: dueDate,
              end: dueDate,
              allDay: false, // 改为false以支持时间显示
              resource: task,
              quadrant: task.quadrant // 添加象限信息用于样式
            }
          })

        setEvents(calendarEvents)
      } catch (error) {
        console.error('Error loading user data:', error)
        toast({
          title: "加载失败",
          description: "无法加载数据，请稍后再试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [toast])

  // 重置任务表单
  const resetTaskForm = () => {
    // 如果是日视图，预设当前选中的日期
    const defaultDate = view === 'day' ? format(date, 'yyyy-MM-dd') : ''
    
    setTaskForm({
      title: "",
      quadrant: 1,
      due_date: defaultDate,
      tags: [],
      notes: "",
    })
  }

  // 添加新任务
  const addTask = async () => {
    if (!user || taskForm.title.trim() === "") return

    try {
      const newTaskData = {
        user_id: user.id,
        title: taskForm.title,
        quadrant: taskForm.quadrant,
        due_date: taskForm.due_date || null,
        tags: taskForm.tags,
        notes: taskForm.notes,
        completed: false,
      }

      const createdTask = await createTask(newTaskData)
      if (createdTask && createdTask.due_date) {
        // 添加新任务到日历事件中
        const dueDate = new Date(createdTask.due_date)
        const newEvent = {
          id: createdTask.id,
          title: createdTask.title,
          start: dueDate,
          end: dueDate,
          allDay: false,
          resource: createdTask,
          quadrant: createdTask.quadrant
        }
        
        setEvents([...events, newEvent])
        resetTaskForm()
        setIsCreating(false)
        
        toast({
          title: "添加成功",
          description: "任务已添加到日历",
        })
      }
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        title: "添加失败",
        description: "无法添加任务，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 处理任务选择
  const handleSelectEvent = (event: any) => {
    const task = event.resource as Task
    console.log("选中的任务:", task);
    console.log("选中的标签:", task.tags);
    
    // 清空编辑状态，避免混淆
    setSelectedTask(null);
    setTaskForm({
      title: "",
      quadrant: 1,
      due_date: "",
      tags: [],
      notes: "",
    });
    
    // 延迟设置新状态以确保先清空
    setTimeout(() => {
      setSelectedTask(task);
      setTaskForm({
        title: task.title,
        quadrant: task.quadrant,
        due_date: task.due_date || "",
        tags: task.tags || [],
        notes: task.notes || "",
      });
      setIsEditing(true);
    }, 10);
  }

  // 处理日期单元格点击
  const handleSelectSlot = (slotInfo: any) => {
    // 切换到日视图并设置日期
    setDate(slotInfo.start)
    setView('day')
  }

  // 处理日期导航
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
    if (action === 'TODAY') {
      setDate(new Date())
    } else if (action === 'PREV') {
      const newDate = new Date(date)
      if (view === 'month') {
        newDate.setMonth(date.getMonth() - 1)
      } else {
        newDate.setDate(date.getDate() - 1)
      }
      setDate(newDate)
    } else if (action === 'NEXT') {
      const newDate = new Date(date)
      if (view === 'month') {
        newDate.setMonth(date.getMonth() + 1)
      } else {
        newDate.setDate(date.getDate() + 1)
      }
      setDate(newDate)
    } else if (action instanceof Date) {
      setDate(action)
    }
  }

  // 处理任务更新
  const handleSaveTask = async () => {
    if (!selectedTask || taskForm.title.trim() === "") return

    try {
      console.log("保存任务前:", taskForm);
      console.log("截止日期:", taskForm.due_date);
      
      const updatedTask = await updateTask(selectedTask.id, {
        title: taskForm.title,
        quadrant: taskForm.quadrant,
        due_date: taskForm.due_date || null,
        tags: taskForm.tags,
        notes: taskForm.notes,
      })

      if (updatedTask) {
        console.log("更新后的任务:", updatedTask);
        console.log("更新后的日期:", updatedTask.due_date);
        
        // 如果任务已完成，从日历中移除
        if (updatedTask.completed) {
          setEvents(events.filter(event => event.id !== updatedTask.id))
        } else {
          // 否则更新日历事件
          setEvents(events.map(event => 
            event.id === updatedTask.id 
              ? {
                  id: updatedTask.id,
                  title: updatedTask.title,
                  start: new Date(updatedTask.due_date as string),
                  end: new Date(updatedTask.due_date as string),
                  allDay: false,
                  resource: updatedTask,
                  quadrant: updatedTask.quadrant
                }
              : event
          ))
        }

        toast({
          title: "更新成功",
          description: "任务已更新",
        })
      }
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "更新失败",
        description: "无法更新任务，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setSelectedTask(null)
      setIsEditing(false)
    }
  }

  // 根据象限获取事件样式
  const eventStyleGetter = (event: any) => {
    const quadrantColors = {
      1: { backgroundColor: '#ef4444', borderColor: '#b91c1c' }, // 紧急且重要 - 红色
      2: { backgroundColor: '#3b82f6', borderColor: '#1d4ed8' }, // 重要不紧急 - 蓝色
      3: { backgroundColor: '#f97316', borderColor: '#c2410c' }, // 紧急不重要 - 橙色
      4: { backgroundColor: '#10b981', borderColor: '#047857' }  // 不紧急不重要 - 绿色
    }
    
    const quadrant = event.quadrant || 1
    
    return {
      style: {
        backgroundColor: quadrantColors[quadrant as 1|2|3|4].backgroundColor,
        borderColor: quadrantColors[quadrant as 1|2|3|4].borderColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'flex',
        fontWeight: '500',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        overflow: 'visible',
        whiteSpace: 'nowrap'
      }
    }
  }

  return (
    <div className="container mx-auto p-2 md:p-4 max-w-6xl">
      {isLoading ? (
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">加载中...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h1 className="text-xl md:text-2xl font-bold mb-2 sm:mb-0">日历视图</h1>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleNavigate('TODAY')}
                >
                  今天
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => handleNavigate('PREV')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => handleNavigate('NEXT')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                  onClick={() => setView('month')}
                >
                  <Calendar className="mr-1 h-4 w-4" />
                  月视图
                </Button>
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                  onClick={() => setView('day')}
                >
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  日视图
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              {view === 'month' 
                ? format(date, 'yyyy年MM月')
                : format(date, 'yyyy年MM月dd日')}
            </h2>
            
            <Button 
              onClick={() => {
                resetTaskForm();
                setIsCreating(true);
              }} 
              className="whitespace-nowrap"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> 添加任务
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-1 md:p-4">
              <div 
                className={cn(
                  "big-calendar-container", 
                  view === 'day' ? 'day-view' : 'month-view'
                )}
              >
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: view === 'day' ? 600 : 550 }}
                  view={view}
                  date={date}
                  onView={() => {}}
                  onNavigate={() => {}}
                  formats={formats}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  popup
                  components={{
                    month: {
                      dateHeader: ({ date, label }) => {
                        const isToday = new Date().toDateString() === date.toDateString()
                        return (
                          <div 
                            className={cn(
                              "text-sm py-1 text-center font-medium", 
                              isToday && "bg-primary text-primary-foreground rounded-sm"
                            )}
                          >
                            {date.getDate()}
                          </div>
                        )
                      }
                    },
                    toolbar: () => null // 隐藏默认工具栏
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* 任务编辑模态框 */}
          <TaskEditModal
            open={isEditing}
            task={selectedTask}
            onOpenChange={(open) => {
              if (!open) {
                setIsEditing(false)
                setSelectedTask(null)
              }
            }}
            onSave={handleSaveTask}
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            tags={tags}
          />
          
          {/* 新建任务模态框 */}
          <TaskEditModal
            open={isCreating}
            task={null}
            onOpenChange={(open) => {
              if (!open) {
                setIsCreating(false)
                resetTaskForm()
              }
            }}
            onSave={addTask}
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            tags={tags}
          />
        </>
      )}
    </div>
  )
} 