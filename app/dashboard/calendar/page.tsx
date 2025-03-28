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
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: "",
    quadrant: 1 as 1 | 2 | 3 | 4,
    due_date: "",
    tags: [] as string[],
    notes: "",
  })
  const router = useRouter()
  const { toast } = useToast()

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
    // 设置选中日期为任务表单的默认日期
    setTaskForm(prev => ({
      ...prev,
      due_date: date.toISOString().split('T')[0]
    }))
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
      if (createdTask) {
        setTasks([createdTask, ...tasks])
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

  // 重置任务表单
  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      quadrant: 1,
      due_date: "",
      tags: [],
      notes: "",
    })
  }

  // 编辑任务
  const startEditTask = (task: Task) => {
    setSelectedTask(task)
    setTaskForm({
      title: task.title,
      quadrant: task.quadrant,
      due_date: task.due_date || "",
      tags: task.tags,
      notes: task.notes,
    })
    setIsEditing(true)
  }

  // 保存编辑后的任务
  const saveEditedTask = async () => {
    if (!selectedTask || taskForm.title.trim() === "") return

    try {
      const updatedTask = await updateTask(selectedTask.id, {
        title: taskForm.title,
        quadrant: taskForm.quadrant,
        due_date: taskForm.due_date || null,
        tags: taskForm.tags,
        notes: taskForm.notes,
      })

      if (updatedTask) {
        setTasks(tasks.map((task) => (task.id === selectedTask.id ? updatedTask : task)))
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
      setIsEditing(false)
      setSelectedTask(null)
      resetTaskForm()
    }
  }

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">日历视图</h1>
          <Button 
            onClick={() => {
              resetTaskForm()
              setIsCreating(true)
            }} 
            className="whitespace-nowrap"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 添加任务
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="loader"></div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 transition-all duration-300">
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
          onSave={saveEditedTask}
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
      </div>
    </main>
  )
} 