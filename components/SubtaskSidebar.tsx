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
    async function loadSubtasks() {
      if (task?.id && open) {
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

    loadSubtasks()
  }, [task?.id, open, toast])

  // 添加子任务
  const handleAddSubtask = async () => {
    if (!task?.id || newSubtaskTitle.trim() === "") return

    try {
      const newSubtask = await createSubtask({
        task_id: task.id,
        title: newSubtaskTitle.trim(),
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
      <SheetContent side="right" className="w-full sm:w-[400px] p-4">
        <SheetHeader>
          <SheetTitle>子任务</SheetTitle>
        </SheetHeader>
        
        {task && (
          <div className="mt-4 md:mt-6">
            <div className="font-semibold mb-2 text-sm md:text-base break-words">主任务: {task.title}</div>
            
            <div className="mt-4 md:mt-6 space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="添加子任务..."
                  className="text-sm h-9 md:h-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtaskTitle.trim() !== "") {
                      handleAddSubtask()
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="h-9 w-9 md:h-10 md:w-10"
                  onClick={handleAddSubtask} 
                  disabled={newSubtaskTitle.trim() === ""}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 md:mt-6">
              <h3 className="font-medium mb-2 text-sm md:text-base">子任务列表</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : subtasks.length > 0 ? (
                <div className="space-y-2 max-h-[calc(100vh-240px)] md:max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between border rounded-md p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 flex-shrink-0" 
                          onClick={() => toggleSubtaskCompletion(subtask.id, subtask.completed)}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border",
                              subtask.completed ? "bg-primary border-primary" : "border-gray-300",
                            )}
                          >
                            {subtask.completed && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </Button>
                        <span className={cn("text-sm truncate", subtask.completed && "line-through text-gray-500")}>
                          {subtask.title}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm">暂无子任务</div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
} 