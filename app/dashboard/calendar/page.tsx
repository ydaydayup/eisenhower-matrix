"use client"

import { useState, useEffect } from "react"
import Calendar from "@/components/Calendar"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { type Task, getUserTasks, createTask, updateTask } from "@/lib/tasks"
import { type Tag, getUserTags } from "@/lib/tags"
import { getUserSession } from "@/lib/auth"
import TaskEditModal from '@/components/TaskEditModal'
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function CalendarView() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // 获取用户会话
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getUserSession()
        if (!session) {
          router.push("/login")
          return
        }

        setUser(session)
        loadUserData(session.id)
      } catch (error) {
        console.error("Session error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  // 加载用户数据
  const loadUserData = async (userId: string) => {
    try {
      // 加载任务
      const userTasks = await getUserTasks(userId)
      setTasks(userTasks)

      // 加载标签
      const userTags = await getUserTags(userId)
      setTags(userTags)
    } catch (error) {
      console.error("Error loading user data:", error)
      toast({
        title: "加载失败",
        description: "无法加载数据，请稍后再试",
        variant: "destructive",
      })
    }
  }

  const handleSelectDate = (date: Date) => {
    console.log("选择的日期:", date)
    setSelectedDate(date)
  }

  // 编辑任务
  const startEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsEditing(true)
  }

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">日历视图</h1>
          <Button 
            onClick={() => setIsCreating(true)} 
            className="btn-primary whitespace-nowrap"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 添加任务
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="loader"></div>
          </div>
        ) : (
          <div className="glass-card transition-all duration-300">
            <Calendar 
              onSelectDate={handleSelectDate} 
              tasks={tasks}
              onEditTask={startEditTask}
            />
          </div>
        )}

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
          onSuccess={(updatedTask) => {
            setTasks(tasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            ))
            setIsEditing(false)
            setSelectedTask(null)
          }}
          userId={user?.id || ''}
          tags={tags}
        />
        
        {/* 新建任务模态框 */}
        <TaskEditModal
          open={isCreating}
          task={null}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false)
              setSelectedDate(null)
            }
          }}
          onSuccess={(newTask) => {
            setTasks([newTask, ...tasks])
            setIsCreating(false)
          }}
          userId={user?.id || ''}
          tags={tags}
        />
      </div>
    </main>
  )
} 