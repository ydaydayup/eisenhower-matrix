"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Task } from "@/lib/tasks"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from 'date-fns/locale'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TaskEditDialogProps {
  open: boolean
  task: Task | null
  onOpenChange: (open: boolean) => void
  onSave: (taskData: Partial<Task>) => void
  taskForm: {
    title: string
    quadrant: 1 | 2 | 3 | 4
    due_date: string
    tags: string[]
    notes: string
  }
  setTaskForm: (taskForm: any) => void
}

export default function TaskEditDialog({
  open,
  task,
  onOpenChange,
  onSave,
  taskForm,
  setTaskForm,
}: TaskEditDialogProps) {
  const getCurrentDateTime = () => {
    if (!taskForm.due_date) return undefined
    try {
      const date = new Date(taskForm.due_date)
      if (!isNaN(date.getTime())) {
        return date
      }
    } catch (error) {
      console.error('Error parsing date:', error)
    }
    return undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto overflow-x-hidden dialog-scrollbar" 
        style={{ 
          paddingRight: "16px"
        }}
      >
        <DialogHeader>
          <DialogTitle>{task ? "编辑任务" : "新建任务"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">任务名称</label>
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="输入任务名称"
            />
          </div>

          <div>
            <label className="text-sm font-medium">优先级（象限）</label>
            <Select
              value={taskForm.quadrant.toString()}
              onValueChange={(value) =>
                setTaskForm({ ...taskForm, quadrant: Number(value) as 1 | 2 | 3 | 4 })
              }
            >
              <SelectTrigger>
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
            <label className="text-sm font-medium">截止日期</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !taskForm.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {taskForm.due_date ? (
                    format(new Date(taskForm.due_date), "yyyy年MM月dd日 HH:mm")
                  ) : (
                    "选择日期和时间"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <Calendar
                    mode="single"
                    selected={getCurrentDateTime()}
                    onSelect={(date) => {
                      if (date) {
                        // 保留当前时间或设置默认时间
                        const currentDate = getCurrentDateTime();
                        const newDate = new Date(date);
                        if (currentDate) {
                          newDate.setHours(currentDate.getHours());
                          newDate.setMinutes(currentDate.getMinutes());
                        } else {
                          newDate.setHours(12);
                          newDate.setMinutes(0);
                        }
                        setTaskForm({ ...taskForm, due_date: newDate.toISOString() });
                      }
                    }}
                    initialFocus
                    locale={zhCN}
                    fromDate={new Date()}
                  />
                </div>
                
                <div className="p-3 border-b">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">小时</label>
                      <Select
                        value={getCurrentDateTime()?.getHours().toString() || "12"}
                        onValueChange={(value) => {
                          const date = getCurrentDateTime() || new Date();
                          date.setHours(parseInt(value));
                          setTaskForm({ ...taskForm, due_date: date.toISOString() });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="时" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 24}, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i < 10 ? `0${i}` : i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">分钟</label>
                      <Select
                        value={getCurrentDateTime()?.getMinutes().toString() || "0"}
                        onValueChange={(value) => {
                          const date = getCurrentDateTime() || new Date();
                          date.setMinutes(parseInt(value));
                          setTaskForm({ ...taskForm, due_date: date.toISOString() });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="分" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((minute) => (
                            <SelectItem key={minute} value={minute.toString()}>
                              {minute < 10 ? `0${minute}` : minute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setTaskForm({ ...taskForm, due_date: "" })}
                    size="sm"
                  >
                    清除
                  </Button>
                  <Button 
                    onClick={() => {/* 自动关闭 popover */}} 
                    size="sm"
                  >
                    确定
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium">备注</label>
            <Textarea
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              placeholder="添加备注"
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSave(taskForm)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 