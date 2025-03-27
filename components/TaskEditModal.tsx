"use client"

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Task } from "@/lib/tasks"
import { Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface TaskEditModalProps {
  open: boolean
  task: Task | null
  onOpenChange: (open: boolean) => void
  onSave: () => void
  taskForm: {
    title: string
    quadrant: 1 | 2 | 3 | 4
    due_date: string
    tags: string[]
    notes: string
  }
  setTaskForm: (form: any) => void
  tags?: { id: string; name: string }[]
}

export default function TaskEditModal({
  open,
  task,
  onOpenChange,
  onSave,
  taskForm,
  setTaskForm,
  tags = [],
}: TaskEditModalProps) {
  const { toast } = useToast()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (task) {
      console.log("任务编辑弹窗接收到任务:", task);
      console.log("任务标签:", task.tags);
      setTaskForm({
        title: task.title,
        quadrant: task.quadrant,
        due_date: task.due_date || "",
        tags: task.tags || [],
        notes: task.notes || "",
      })
    }
  }, [task, setTaskForm])

  useEffect(() => {
    if (open && titleInputRef.current) {
      titleInputRef.current.blur()
    }
  }, [open])

  const analyzeTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "请先输入任务名称",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: taskForm.title,
          notes: taskForm.notes,
        }),
      })

      if (!response.ok) throw new Error('分析请求失败')

      const data = await response.json()
      
      setTaskForm((prev: typeof taskForm) => ({
        ...prev,
        quadrant: data.quadrant,
        notes: data.notes || prev.notes,
      }))

      toast({
        title: "分析完成",
        description: "已根据任务内容进行智能分类",
      })
    } catch (error) {
      console.error('分析失败:', error)
      toast({
        title: "分析失败",
        description: "无法完成智能分析，请稍后再试",
        variant: "destructive",
      })
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    let timeString = '00:00'
    if (taskForm.due_date) {
      try {
        const dateObj = new Date(taskForm.due_date)
        if (!isNaN(dateObj.getTime())) {
          timeString = dateObj.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit', 
            minute: '2-digit'
          })
        }
      } catch (error) {
        console.error('Date parsing error:', error)
      }
    }
    const newDueDate = date ? `${date}T${timeString}` : ''
    console.log(`设置新日期: ${newDueDate}`)
    setTaskForm((prev: typeof taskForm) => ({ ...prev, due_date: newDueDate }))
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    let dateString = format(new Date(), 'yyyy-MM-dd')
    if (taskForm.due_date) {
      try {
        const dateObj = new Date(taskForm.due_date)
        if (!isNaN(dateObj.getTime())) {
          dateString = format(dateObj, 'yyyy-MM-dd')
        }
      } catch (error) {
        console.error('Date parsing error:', error)
      }
    }
    const newDueDate = `${dateString}T${time}`
    console.log(`设置新时间: ${newDueDate}`)
    setTaskForm((prev: typeof taskForm) => ({ ...prev, due_date: newDueDate }))
  }

  const getCurrentDate = () => {
    if (!taskForm.due_date) return format(new Date(), 'yyyy-MM-dd')
    try {
      const dateObj = new Date(taskForm.due_date)
      if (!isNaN(dateObj.getTime())) {
        return format(dateObj, 'yyyy-MM-dd')
      }
    } catch (error) {
      console.error('Error parsing date:', error)
    }
    return format(new Date(), 'yyyy-MM-dd')
  }

  const getCurrentTime = () => {
    if (!taskForm.due_date) return '00:00'
    try {
      const dateObj = new Date(taskForm.due_date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    } catch (error) {
      console.error('Error parsing time:', error)
    }
    return '00:00'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="text-xl">编辑任务</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          <div>
            <label className="text-base font-medium">任务名称</label>
            <Input
              ref={titleInputRef}
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="输入任务名称"
              className="mt-2"
              autoFocus={false}
            />
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <label className="text-base font-medium">优先级（象限）</label>
              <Select
                value={taskForm.quadrant.toString()}
                onValueChange={(value) =>
                  setTaskForm({ ...taskForm, quadrant: Number(value) as 1 | 2 | 3 | 4 })
                }
              >
                <SelectTrigger className="mt-2">
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
              <label className="text-base font-medium">预计完成时间</label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="date"
                  value={getCurrentDate()}
                  onChange={handleDateChange}
                />
                {/*<Input*/}
                {/*  type="time"*/}
                {/*  value={getCurrentTime()}*/}
                {/*  onChange={handleTimeChange}*/}
                {/*/>*/}
              </div>
            </div>

            <div>
              <label className="text-base font-medium">标签</label>
              <Select
                value={taskForm.tags[0] || ""}
                onValueChange={(value) =>
                  setTaskForm((prev: typeof taskForm) => ({ ...prev, tags: [value] }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="选择标签">
                    {taskForm.tags[0] && tags.find(tag => tag.id === taskForm.tags[0] || tag.name === taskForm.tags[0])?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="赛事">赛事</SelectItem>
                      <SelectItem value="工作">工作</SelectItem>
                      <SelectItem value="学习">学习</SelectItem>
                      <SelectItem value="生活">生活</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-medium">任务详情</label>
              <Button
                variant="link"
                className="text-muted-foreground h-auto p-0"
                onClick={analyzeTask}
              >
                智能分析
              </Button>
            </div>
            <Textarea
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              placeholder="输入备注信息"
              className="min-h-[200px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={onSave}
            className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}