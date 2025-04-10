"use client"

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Task } from "@/lib/tasks"
import { Tag } from "@/lib/tags"
import { Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown } from "lucide-react"
import { createTask, updateTask } from "@/lib/tasks"

interface TaskEditModalProps {
  open: boolean
  task: Task | null
  onOpenChange: (open: boolean) => void
  onSuccess: (task: Task) => void
  userId: string
  tags?: Tag[]
}

export default function TaskEditModal({
  open,
  task,
  onOpenChange,
  onSuccess,
  userId,
  tags = [],
}: TaskEditModalProps) {
  const { toast } = useToast()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [openTagSelect, setOpenTagSelect] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [taskForm, setTaskForm] = useState({
    title: "",
    quadrant: 1 as 1 | 2 | 3 | 4,
    due_date: "",
    tags: [] as string[],
    notes: "",
  })

  useEffect(() => {
    if (task) {
      setTaskForm({
        title: task.title,
        quadrant: task.quadrant,
        due_date: task.due_date || "",
        tags: task.tags || [],
        notes: task.notes || "",
      })
    } else {
      if (open) {
        setTaskForm({
          title: "",
          quadrant: 1,
          due_date: "",
          tags: [],
          notes: "",
        })
      }
    }
  }, [task, open])

  useEffect(() => {
    if (open && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [open])


  const generateDetailedNotes = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "请先输入任务标题",
        variant: "destructive",
      })
      return
    }

    setIsAIGenerating(true)
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
        body: JSON.stringify({ title: taskForm.title }),
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

      toast({
        title: "生成成功",
        description: "AI已为您生成详细笔记",
      })
    } catch (error) {
      console.error("AI生成笔记失败:", error)
      toast({
        title: "生成失败",
        description: "无法生成笔记，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsAIGenerating(false)
    }
  }

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateTime = e.target.value
    if (!newDateTime) {
      setTaskForm({ ...taskForm, due_date: "" })
      return
    }

    try {
      const dateObj = new Date(newDateTime)
      if (!isNaN(dateObj.getTime())) {
        setTaskForm({ ...taskForm, due_date: dateObj.toISOString() })
      }
    } catch (error) {
      console.error("日期时间处理错误:", error)
    }
  }

  const getCurrentDateTime = () => {
    if (!taskForm.due_date) return ''
    try {
      const date = new Date(taskForm.due_date)
      if (!isNaN(date.getTime())) {
        return format(date, "yyyy-MM-dd'T'HH:mm")
      }
    } catch (error) {
      console.error('Error parsing date:', error)
    }
    return ''
  }

  const handleSubmit = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "请输入任务标题",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const taskData = {
        user_id: userId,
        title: taskForm.title,
        quadrant: taskForm.quadrant,
        due_date: taskForm.due_date || null,
        tags: taskForm.tags,
        notes: taskForm.notes,
        completed: false,
      }

      let result
      if (task) {
        result = await updateTask(task.id, taskData)
      } else {
        result = await createTask(taskData)
      }

      if (result) {
        toast({
          title: `${task ? '更新' : '创建'}成功`,
          description: `任务已${task ? '更新' : '创建'}成功`,
        })
        onSuccess(result)
        onOpenChange(false)
      }
    } catch (error) {
      console.error(`Error ${task ? 'updating' : 'creating'} task:`, error)
      toast({
        title: `${task ? '更新' : '创建'}失败`,
        description: `无法${task ? '更新' : '创建'}任务，请稍后再试`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof typeof taskForm, value: string) => {
    setTaskForm({ ...taskForm, [field]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] glass-card border-0 max-h-[90vh] overflow-y-auto w-[95%] sm:w-[85%] md:w-4/5">
        <DialogHeader>
          <DialogTitle className="text-xl text-center text-foreground">
            {task ? "编辑任务" : "添加任务"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <label className="text-base font-medium text-gray-700">任务名称</label>
            <Input
              ref={titleInputRef}
              value={taskForm.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="输入任务名称"
              className="mt-2 glass-morphism border-0 focus-visible:ring-1 focus-visible:ring-ring h-12 text-lg"
              autoFocus={false}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-base font-medium text-gray-700">优先级（象限）</label>
              <Select
                value={taskForm.quadrant.toString()}
                onValueChange={(value) => setTaskForm({ ...taskForm, quadrant: parseInt(value) as 1 | 2 | 3 | 4 })}
              >
                <SelectTrigger className="mt-2 glass-morphism border-0 focus:ring-1 focus:ring-ring">
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent className="glass-morphism border-0">
                  <SelectItem value="1">
                    <div className="flex items-center">
                      <span className="mr-2">⚡</span>
                      象限一 - 紧急且重要
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center">
                      <span className="mr-2">🎯</span>
                      象限二 - 重要不紧急
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center">
                      <span className="mr-2">⏱️</span>
                      象限三 - 紧急不重要
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex items-center">
                      <span className="mr-2">🌱</span>
                      象限四 - 不紧急不重要
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-base font-medium text-gray-700">预计完成时间</label>
              <Input
                type="datetime-local"
                value={getCurrentDateTime()}
                onChange={handleDateTimeChange}
                className="mt-2 glass-morphism border-0 focus:ring-1 focus:ring-ring h-12"
              />
            </div>
          </div>

          <div>
            <label className="text-base font-medium text-gray-700">标签</label>
            <Popover open={openTagSelect} onOpenChange={setOpenTagSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTagSelect}
                  className="mt-2 w-full justify-between glass-morphism border-0 focus:ring-1 focus:ring-ring h-12"
                >
                  <span className="flex gap-1 flex-wrap">
                    {taskForm.tags.length > 0 ? (
                      taskForm.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="mr-1">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      "选择标签..."
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="搜索标签..." />
                  <CommandEmpty>未找到标签</CommandEmpty>
                  <CommandGroup>
                    {tags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          const newTags = taskForm.tags.includes(tag.name)
                            ? taskForm.tags.filter(t => t !== tag.name)
                            : [...taskForm.tags, tag.name]
                          setTaskForm({ ...taskForm, tags: newTags })
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            taskForm.tags.includes(tag.name) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium text-gray-700">任务详情</label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={generateDetailedNotes}
                disabled={isAIGenerating}
              >
                <Eye className="mr-2 h-4 w-4" />
                AI生成详细笔记
              </Button>
            </div>
            <Textarea
              value={taskForm.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="输入任务详情..."
              className="min-h-[200px] glass-morphism border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {task ? "更新中..." : "创建中..."}
              </>
            ) : (
              task ? "更新" : "创建"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}