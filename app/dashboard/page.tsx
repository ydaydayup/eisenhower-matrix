"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Check, LucideTag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getUserSession } from "@/lib/auth"
import { type Task, getUserTasks, createTask, updateTask, deleteTask } from "@/lib/tasks"
import { type Tag, getUserTags, createTag, deleteTag } from "@/lib/tags"

// 视图类型
type ViewType = "quadrant" | "category" | "simple"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [newTask, setNewTask] = useState("")
  const [selectedQuadrant, setSelectedQuadrant] = useState<1 | 2 | 3 | 4>(1)
  const [showCompleted, setShowCompleted] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // 在 Dashboard 函数内部添加视图状态
  const [viewType, setViewType] = useState<ViewType>("quadrant")
  // 添加生成笔记的加载状态
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // 编辑任务状态
  const [isEditing, setIsEditing] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // 标签管理状态
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  // 任务表单状态
  const [taskForm, setTaskForm] = useState({
    title: "",
    quadrant: 1 as 1 | 2 | 3 | 4,
    due_date: "",
    tags: [] as string[],
    notes: "",
  })

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
    setEditingTask(task)
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
    if (!editingTask || taskForm.title.trim() === "") return

    try {
      const updatedTask = await updateTask(editingTask.id, {
        title: taskForm.title,
        quadrant: taskForm.quadrant,
        due_date: taskForm.due_date || null,
        tags: taskForm.tags,
        notes: taskForm.notes,
      })

      if (updatedTask) {
        setTasks(tasks.map((task) => (task.id === editingTask.id ? updatedTask : task)))
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
      setEditingTask(null)
      resetTaskForm()
    }
  }

  // 切换任务完成状态
  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const updatedTask = await updateTask(taskId, { completed: !completed })
      if (updatedTask) {
        setTasks(tasks.map((task) => (task.id === taskId ? updatedTask : task)))
      }
    } catch (error) {
      console.error("Error toggling task completion:", error)
      toast({
        title: "更新失败",
        description: "无法更新任务状态，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 删除任务
  const deleteTaskItem = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId)
      if (success) {
        setTasks(tasks.filter((task) => task.id !== taskId))
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "删除失败",
        description: "无法删除任务，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 添加新标签
  const addTag = async () => {
    if (!user || newTagName.trim() === "") return

    try {
      const newTag = await createTag({
        user_id: user.id,
        name: newTagName.trim(),
      })

      if (newTag) {
        setTags([...tags, newTag])
        setNewTagName("")
      }
    } catch (error) {
      console.error("Error adding tag:", error)
      toast({
        title: "添加失败",
        description: "无法添加标签，可能已存在相同名称的标签",
        variant: "destructive",
      })
    }
  }

  // 删除标签
  const deleteTagItem = async (tagId: string) => {
    try {
      const success = await deleteTag(tagId)
      if (success) {
        const tagToDelete = tags.find((tag) => tag.id === tagId)
        if (tagToDelete) {
          // 从标签列表中删除
          setTags(tags.filter((tag) => tag.id !== tagId))

          // 从所有任务中移除该标签
          const updatedTasks = await Promise.all(
            tasks
              .filter((task) => task.tags.includes(tagToDelete.name))
              .map(async (task) => {
                const updatedTask = await updateTask(task.id, {
                  tags: task.tags.filter((t) => t !== tagToDelete.name),
                })
                return updatedTask
              }),
          )

          // 更新任务列表
          setTasks(
            tasks.map((task) => {
              const updated = updatedTasks.find((t) => t && t.id === task.id)
              return updated || task
            }),
          )
        }
      }
    } catch (error) {
      console.error("Error deleting tag:", error)
      toast({
        title: "删除失败",
        description: "无法删除标签，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 切换任务标签
  const toggleTaskTag = (tagName: string) => {
    if (taskForm.tags.includes(tagName)) {
      setTaskForm({
        ...taskForm,
        tags: taskForm.tags.filter((t) => t !== tagName),
      })
    } else {
      setTaskForm({
        ...taskForm,
        tags: [...taskForm.tags, tagName],
      })
    }
  }

  // 获取特定象限的任务
  const getQuadrantTasks = (quadrant: number) => {
    return tasks.filter((task) => task.quadrant === quadrant && !task.completed)
  }

  // 获取已完成的任务
  const getCompletedTasks = () => {
    return tasks.filter((task) => task.completed)
  }

  // 快速添加任务
  const quickAddTask = async () => {
    if (!user || newTask.trim() === "") return

    try {
      const quickTaskData = {
        user_id: user.id,
        title: newTask,
        quadrant: selectedQuadrant,
        due_date: null,
        tags: [],
        notes: "",
        completed: false,
      }

      const createdTask = await createTask(quickTaskData)
      if (createdTask) {
        setTasks([createdTask, ...tasks])
        setNewTask("")
      }
    } catch (error) {
      console.error("Error adding quick task:", error)
      toast({
        title: "添加失败",
        description: "无法添加任务，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 象限配置
  const quadrants = [
    {
      id: 1,
      title: "紧急且重要",
      subtitle: "立即处理",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      id: 2,
      title: "重要不紧急",
      subtitle: "计划处理",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: 3,
      title: "紧急不重要",
      subtitle: "委托他人",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      id: 4,
      title: "不紧急不重要",
      subtitle: "考虑删除",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  ]

  // 自定义滚动条样式
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.3);
    }
  `

  // 获取未完成的任务
  const getActiveTasks = () => {
    return tasks.filter((task) => !task.completed)
  }

  // 修改生成任务分析的函数
  const generateTaskAnalysis = async (taskTitle: string) => {
    if (!taskTitle.trim()) return

    setIsGeneratingNotes(true)
    setTaskForm(prev => ({
      ...prev,
      notes: '' // 清空现有笔记
    }))

    try {
      const response = await fetch('/api/analyze-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: taskTitle }),
      })

      if (!response.ok) throw new Error('Failed to generate analysis')
      if (!response.body) throw new Error('Response body is null')

      // 创建 ReadableStream 读取器
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedNotes = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 解码新的文本块并累加
        const text = decoder.decode(value)
        accumulatedNotes += text

        // 更新表单状态
        setTaskForm(prev => ({
          ...prev,
          notes: accumulatedNotes
        }))
      }
    } catch (error) {
      console.error('Error generating task analysis:', error)
      toast({
        title: "分析生成失败",
        description: "无法生成任务分析，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>
        {scrollbarStyles}
      </style>
      <main className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center my-6">
          <h1 className="text-2xl font-bold">待办事项</h1>
        </div>

        {/* 快速添加任务 */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <Input
            placeholder="添加新任务..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") quickAddTask()
            }}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select
              value={selectedQuadrant.toString()}
              onValueChange={(value) => setSelectedQuadrant(Number.parseInt(value) as 1 | 2 | 3 | 4)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="选择象限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">象限一 - 紧急且重要</SelectItem>
                <SelectItem value="2">象限二 - 重要不紧急</SelectItem>
                <SelectItem value="3">象限三 - 紧急不重要</SelectItem>
                <SelectItem value="4">象限四 - 不紧急不重要</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={quickAddTask} className="whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" /> 添加
            </Button>
          </div>
        </div>

        {/* 视图切换按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end mb-4">
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewType === "quadrant" ? "default" : "ghost"}
              size="sm"
              className="flex-1 rounded-none text-xs sm:text-sm"
              onClick={() => setViewType("quadrant")}
            >
              四象限
            </Button>
            <Button
              variant={viewType === "category" ? "default" : "ghost"}
              size="sm"
              className="flex-1 rounded-none text-xs sm:text-sm"
              onClick={() => setViewType("category")}
            >
              分类
            </Button>
            <Button
              variant={viewType === "simple" ? "default" : "ghost"}
              size="sm"
              className="flex-1 rounded-none text-xs sm:text-sm"
              onClick={() => setViewType("simple")}
            >
              精简
            </Button>
          </div>
          <Dialog open={showTagManager} onOpenChange={setShowTagManager}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="sm:ml-2">
                <LucideTag className="mr-2 h-4 w-4" /> 管理标签
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>标签管理</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="新标签名称"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTag()
                    }}
                  />
                  <Button onClick={addTag}>添加</Button>
                </div>
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex justify-between items-center p-2 border rounded">
                      <span>{tag.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteTagItem(tag.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 任务视图区域 */}
        {viewType === "quadrant" ? (
          // 四象限视图
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quadrants.map((quadrant) => (
              <div key={quadrant.id} className={cn("border rounded-lg p-4", quadrant.bgColor, quadrant.borderColor)}>
                <div className="mb-2 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold">{quadrant.title}</h2>
                    <p className="text-sm text-gray-600">{quadrant.subtitle}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTaskForm({
                        ...taskForm,
                        quadrant: quadrant.id as 1 | 2 | 3 | 4
                      });
                      setIsEditing(true);
                    }}
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </div>
                <div className="text-right text-sm mb-2">{getQuadrantTasks(quadrant.id).length} 项</div>

                <div className="space-y-2 h-[250px] sm:h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {getQuadrantTasks(quadrant.id).length > 0 ? (
                    getQuadrantTasks(quadrant.id).map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onEdit={() => startEditTask(task)}
                        onDelete={() => deleteTaskItem(task.id)}
                        onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                        viewType={viewType}
                        quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                      />
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">暂无任务</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : viewType === "category" ? (
          // 分类视图
          <div className="space-y-4">
            {tags.length > 0 ? (
              tags
                .map((tag) => {
                  const tagTasks = getActiveTasks().filter((task) => task.tags.includes(tag.name))
                  if (tagTasks.length === 0) return null

                  return (
                    <div key={tag.id} className="border rounded-lg p-4">
                      <div className="mb-2">
                        <h2 className="text-lg font-bold flex items-center">
                          <Badge className="mr-2">{tag.name}</Badge>
                          <span className="text-sm text-gray-600">({tagTasks.length} 项)</span>
                        </h2>
                      </div>
                      <div className="space-y-2">
                        {tagTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onEdit={() => startEditTask(task)}
                            onDelete={() => deleteTaskItem(task.id)}
                            onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                            viewType={viewType}
                            quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })
                .filter(Boolean)
            ) : (
              <div className="text-center text-gray-500 py-4 border rounded-lg p-4">暂无标签，请先添加标签</div>
            )}

            {/* 无标签任务 */}
            {(() => {
              const noTagTasks = getActiveTasks().filter((task) => task.tags.length === 0)
              if (noTagTasks.length === 0) return null

              return (
                <div className="border rounded-lg p-4">
                  <div className="mb-2">
                    <h2 className="text-lg font-bold flex items-center">
                      <span>未分类</span>
                      <span className="text-sm text-gray-600 ml-2">({noTagTasks.length} 项)</span>
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {noTagTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onEdit={() => startEditTask(task)}
                        onDelete={() => deleteTaskItem(task.id)}
                        onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                        viewType={viewType}
                        quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          // 精简视图
          <div className="border rounded-lg p-4">
            <div className="mb-2">
              <h2 className="text-lg font-bold">所有任务</h2>
              <p className="text-sm text-gray-600">按创建时间排序</p>
            </div>
            <div className="space-y-2">
              {getActiveTasks().length > 0 ? (
                [...getActiveTasks()]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onEdit={() => startEditTask(task)}
                      onDelete={() => deleteTaskItem(task.id)}
                      onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                      viewType={viewType}
                      quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                    />
                  ))
              ) : (
                <div className="text-center text-gray-500 py-4">暂无任务</div>
              )}
            </div>
          </div>
        )}

        {/* 已完成任务区域 */}
        <div className="mt-8">
          <div
            className="flex justify-between items-center p-2 bg-gray-100 rounded cursor-pointer"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <h2 className="font-bold">已完成任务 ({getCompletedTasks().length})</h2>
            <span>{showCompleted ? "收起" : "展开"}</span>
          </div>

          {showCompleted && (
            <div className="mt-2 space-y-2">
              {getCompletedTasks().length > 0 ? (
                getCompletedTasks().map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={() => startEditTask(task)}
                    onDelete={() => deleteTaskItem(task.id)}
                    onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                    viewType={viewType}
                    quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">暂无已完成任务</div>
              )}
            </div>
          )}
        </div>

        {/* 任务表单对话框 */}
        <Dialog
          open={isEditing}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditing(false)
              setEditingTask(null)
              resetTaskForm()
            }
          }}
        >
          <DialogContent className="sm:max-w-[850px] h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingTask ? "编辑任务" : "添加任务"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              {/* 任务名称 - 独占一行 */}
              <div className="col-span-full">
                <label className="text-sm font-medium mb-2 block">任务名称</label>
                <Input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="输入任务名称"
                  className="w-full h-12 text-lg"
                />
              </div>

              {/* 优先级、完成时间和标签 - 共占一行 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">优先级（象限）</label>
                  <Select
                    value={taskForm.quadrant.toString()}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, quadrant: Number.parseInt(value) as 1 | 2 | 3 | 4 })
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="选择象限" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">象限一 - 紧急且重要</SelectItem>
                      <SelectItem value="2">象限二 - 重要不紧急</SelectItem>
                      <SelectItem value="3">象限三 - 紧急不重要</SelectItem>
                      <SelectItem value="4">象限四 - 不紧急不重要</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">预计完成时间</label>
                  <Input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">标签</label>
                  <Select
                    value={taskForm.tags.join(",")}
                    onValueChange={(value) => setTaskForm({ ...taskForm, tags: value ? value.split(",") : [] })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="选择标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.name}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {taskForm.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer px-3 py-1 text-sm"
                        onClick={() => toggleTaskTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 备注区域 - 独占一行，更大的空间 */}
              <div className="flex-1 h-full">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">任务详情</label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateTaskAnalysis(taskForm.title)}
                    disabled={!taskForm.title.trim() || isGeneratingNotes}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingNotes ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        智能分析
                      </>
                    )}
                  </Button>
                </div>
                <div className="relative h-full">
                  <Textarea
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                    placeholder="输入备注信息"
                    className={cn(
                      "min-h-[300px] h-full resize-none text-base leading-relaxed p-4",
                      isGeneratingNotes && "opacity-50"
                    )}
                    disabled={isGeneratingNotes}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 py-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditingTask(null)
                  resetTaskForm()
                }}
                className="px-6"
              >
                取消
              </Button>
              <Button onClick={editingTask ? saveEditedTask : addTask} className="px-6">
                {editingTask ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}

// 任务项组件
function TaskItem({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  viewType = "quadrant",
  quadrantInfo,
}: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onToggleComplete: () => void
  viewType?: ViewType
  quadrantInfo?: { title: string; bgColor: string; borderColor: string }
}) {
  // 检查日期是否已过期
  const isDateOverdue = (dateString: string | null) => {
    if (!dateString) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 重置时间部分，只比较日期
    const dueDate = new Date(dateString)
    return dueDate < today
  }

  return (
    <div className={cn("border rounded p-3 bg-white", task.completed && "opacity-70")}>
      <div className="flex justify-between">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 mt-0.5" onClick={onToggleComplete}>
            <div
              className={cn(
                "h-4 w-4 rounded-full border",
                task.completed ? "bg-primary border-primary" : "border-gray-300",
              )}
            >
              {task.completed && <Check className="h-3 w-3 text-white" />}
            </div>
          </Button>
          <div>
            <h3 className={cn("font-medium", task.completed && "line-through")}>{task.title}</h3>

            {/* 根据视图类型显示不同的内容 */}
            {viewType === "quadrant" && (
              <>
                {task.due_date && (
                  <p
                    className={cn(
                      "text-xs",
                      isDateOverdue(task.due_date) ? "text-red-500 font-medium" : "text-gray-500",
                    )}
                  >
                    截止日期: {task.due_date}
                  </p>
                )}
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}

            {viewType === "category" && (
              <>
                {task.due_date && (
                  <p
                    className={cn(
                      "text-xs",
                      isDateOverdue(task.due_date) ? "text-red-500 font-medium" : "text-gray-500",
                    )}
                  >
                    截止日期: {task.due_date}
                  </p>
                )}
                {quadrantInfo && (
                  <Badge variant="outline" className="mt-1">
                    {quadrantInfo.title}
                  </Badge>
                )}
              </>
            )}

            {viewType === "simple" && (
              <>
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

