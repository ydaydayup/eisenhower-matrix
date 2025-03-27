"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Task } from "@/lib/tasks"
import { Textarea } from "@/components/ui/textarea"

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px]">
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
            <Input
              type="date"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
            />
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