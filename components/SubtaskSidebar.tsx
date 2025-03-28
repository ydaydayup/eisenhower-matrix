"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Task } from "@/lib/tasks"
import { type Subtask, getTaskSubtasks, createSubtask, updateSubtask, deleteSubtask } from "@/lib/subtasks"
import { useToast } from "@/components/ui/use-toast"

interface SubtaskSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

export function SubtaskSidebar({ open, onOpenChange, task }: SubtaskSidebarProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 加载子任务
  useEffect(() => {
    const loadSubtasks = async () => {
      if (task) {
        setIsLoading(true)
        try {
          const taskSubtasks = await getTaskSubtasks(task.id)
          setSubtasks(taskSubtasks)
        } catch (error) {
          console.error("Error loading subtasks:", error)
          toast({
            title: "加载失败",
            description: "无法加载子任务，请稍后再试",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (open && task) {
      loadSubtasks()
    } else {
      setSubtasks([])
      setNewSubtaskTitle("")
    }
  }, [open, task, toast])

  // 添加子任务
  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return

    try {
      const newSubtask = await createSubtask({
        task_id: task.id,
        title: newSubtaskTitle,
        completed: false,
      })

      if (newSubtask) {
        setSubtasks([...subtasks, newSubtask])
        setNewSubtaskTitle("")
      }
    } catch (error) {
      console.error("Error adding subtask:", error)
      toast({
        title: "添加失败",
        description: "无法添加子任务，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 切换子任务完成状态
  const toggleSubtaskCompletion = async (subtaskId: string, completed: boolean) => {
    try {
      const updatedSubtask = await updateSubtask(subtaskId, { completed: !completed })
      if (updatedSubtask) {
        setSubtasks(subtasks.map((st) => (st.id === subtaskId ? updatedSubtask : st)))
      }
    } catch (error) {
      console.error("Error toggling subtask completion:", error)
      toast({
        title: "更新失败",
        description: "无法更新子任务状态，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 删除子任务
  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const success = await deleteSubtask(subtaskId)
      if (success) {
        setSubtasks(subtasks.filter((st) => st.id !== subtaskId))
      }
    } catch (error) {
      console.error("Error deleting subtask:", error)
      toast({
        title: "删除失败",
        description: "无法删除子任务，请稍后再试",
        variant: "destructive",
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md glass-card border-0 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 text-center">
            子任务管理
          </SheetTitle>
        </SheetHeader>

        {task && (
          <div className="space-y-6">
            <div className="glass-morphism p-4 rounded-xl">
              <h3 className="font-medium mb-1 text-gray-700">当前任务</h3>
              <p className="text-lg font-bold">{task.title}</p>
            </div>

            <div>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="添加子任务..."
                  className="glass-morphism border-0 focus-visible:ring-1 focus-visible:ring-purple-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddSubtask()
                    }
                  }}
                />
                <Button 
                  onClick={handleAddSubtask} 
                  disabled={!newSubtaskTitle.trim()} 
                  className="shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
                >
                  <Plus className="mr-1 h-4 w-4" /> 添加
                </Button>
              </div>

              <div className="mt-4 md:mt-6">
                <h3 className="font-medium mb-3 text-sm md:text-base text-gray-700">子任务列表</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : subtasks.length > 0 ? (
                  <div className="space-y-2 max-h-[calc(100vh-240px)] md:max-h-[calc(100vh-220px)] overflow-y-auto pr-1 custom-scrollbar">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center justify-between task-item group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-white/70" 
                            onClick={() => toggleSubtaskCompletion(subtask.id, subtask.completed)}
                          >
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border transition-colors",
                                subtask.completed 
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 border-0" 
                                  : "border-gray-300",
                              )}
                            >
                              {subtask.completed && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </Button>
                          <span className={cn("text-sm truncate px-1 py-2 flex-1", subtask.completed && "line-through text-gray-400")}>
                            {subtask.title}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full hover:bg-white/70 opacity-20 group-hover:opacity-100 transition-all duration-200" 
                            onClick={() => handleDeleteSubtask(subtask.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-6 rounded-xl bg-white/30 backdrop-blur-sm">
                    暂无子任务
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 