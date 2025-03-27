"use client"

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import "react-big-calendar/lib/css/react-big-calendar.css"
import { getSupabaseClient } from '@/lib/supabase/client'
import { useToast } from "@/components/ui/use-toast"
import { Task, updateTask, getUserTasks } from "@/lib/tasks"
import { getUserTags } from "@/lib/tags"
import TaskEditModal from '@/components/TaskEditModal'
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
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
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full shadow-sm border-0">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6 bg-white rounded-lg p-3 shadow-sm">
          <div className="flex space-x-2">
            <Button
              variant="outline" 
              onClick={() => handleNavigate('TODAY')}
              className="flex items-center gap-1 hover:bg-primary hover:text-white transition-colors"
            >
              <CalendarIcon className="h-4 w-4" />
              今天
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleNavigate('PREV')}
              className="hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleNavigate('NEXT')}
              className="hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            {view === 'month' 
              ? format(date, 'yyyy年MM月')
              : format(date, 'yyyy年MM月dd日')}
          </h2>
          <div className="flex space-x-2">
            <Button 
              variant={view === 'month' ? "default" : "outline"} 
              onClick={() => setView('month')}
              className={view === 'month' ? "bg-primary text-white" : "hover:bg-gray-100"}
            >
              月
            </Button>
            <Button
              variant={view === 'day' ? "default" : "outline"} 
              onClick={() => setView('day')}
              className={view === 'day' ? "bg-primary text-white" : "hover:bg-gray-100"}
            >
              日
            </Button>
          </div>
        </div>
        
        <div className="flex-grow bg-white rounded-lg shadow-sm overflow-hidden">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            views={['month', 'day']}
            view={view}
            date={date}
            onView={(newView: View) => setView(newView as 'month' | 'day')}
            onNavigate={handleNavigate}
            formats={formats}
            messages={{
              month: '月',
              day: '日',
              today: '今天',
              next: '下一个',
              previous: '上一个',
              allDay: '全天',
              date: '日期',
              time: '时间',
              event: '事件',
            }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={true}
            className="calendar-custom"
            popup
            toolbar={false}
            eventPropGetter={eventStyleGetter}
            min={new Date(0, 0, 0, 0, 0, 0)}
            max={new Date(0, 0, 0, 23, 59, 59)}
            step={30}
            timeslots={2}
            components={{
              event: (props) => (
                <div className="flex items-center py-1 px-2">
                  <div className="text-white font-medium truncate">{props.title}</div>
                </div>
              )
            }}
          />
        </div>

        <TaskEditModal
          open={isEditing}
          task={selectedTask}
          onOpenChange={(open) => setIsEditing(open)}
          onSave={handleSaveTask}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          tags={tags}
        />
      </CardContent>
    </Card>
  )
} 