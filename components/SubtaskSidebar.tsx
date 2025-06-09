"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Task } from "@/lib/tasks"
import { type Subtask, getTaskSubtasks, createSubtask, updateSubtask, deleteSubtask } from "@/lib/subtasks"
import { useToast } from "@/hooks/use-toast"

interface SubtaskSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

export function SubtaskSidebar({ open, onOpenChange, task }: SubtaskSidebarProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // 当侧边栏打开并且有选中的任务时，加载子任务
  useEffect(() => {
    if (open && task) {
      loadSubtasks(task.id)
    }
  }, [open, task])

  // 加载子任务
  const loadSubtasks = async (taskId: string) => {
    setIsLoading(true)
    try {
      const loadedSubtasks = await getTaskSubtasks(taskId)
      if (loadedSubtasks) {
        setSubtasks(loadedSubtasks)
      }
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

  // 添加子任务
  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return

    setIsSubmitting(true)
    try {
      const newSubtask = await createSubtask({
        task_id: task.id,
        title: newSubtaskTitle.trim(),
        completed: false,
      })

      if (newSubtask) {
        setSubtasks([...subtasks, newSubtask])
        setNewSubtaskTitle("")
        toast({
          title: "添加成功",
          description: "子任务已添加",
        })
      }
    } catch (error) {
      console.error("Error adding subtask:", error)
      toast({
        title: "添加失败",
        description: "无法添加子任务，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-foreground">
            {task?.title ? `任务：${task.title}` : "子任务管理"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-medium mb-3 text-sm md:text-base text-foreground">添加子任务</h3>
            <div className="flex gap-2">
              <Input
                placeholder="新子任务内容"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                disabled={isSubmitting}
                className="border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
              />
              <Button 
                onClick={handleAddSubtask} 
                disabled={isSubmitting || !newSubtaskTitle.trim()}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3 text-sm md:text-base text-foreground">子任务列表</h3>
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
                    <div className="flex items-center flex-1 min-w-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-background/70" 
                        onClick={() => toggleSubtaskCompletion(subtask.id, subtask.completed)}
                      >
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border transition-colors",
                            subtask.completed 
                              ? "bg-primary border-0" 
                              : "border-border",
                          )}
                        >
                          {subtask.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </Button>
                      <span className={cn("text-sm break-words px-1 py-2 flex-1", subtask.completed && "line-through text-muted-foreground")}>
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full hover:bg-background/70 opacity-20 group-hover:opacity-100 transition-all duration-200" 
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8 rounded-xl bg-background/30 backdrop-blur-sm">
                暂无子任务
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 