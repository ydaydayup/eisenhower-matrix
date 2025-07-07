"use client"
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Task } from "@/lib/tasks"
import { Tag } from "@/lib/tags"
import { Eye, Calendar as CalendarIcon, Clock, Check, ChevronsUpDown, X, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { zhCN } from 'date-fns/locale'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { createTask, updateTask } from "@/lib/tasks"
import { useNotification } from "@/lib/hooks/use-notification"
import { CSSProperties } from 'react'
import { Calendar } from "@/components/ui/calendar"
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { scheduleTaskReminder, isElectronAvailable } = useNotification()
  const [dateTimeExpanded, setDateTimeExpanded] = useState(false)
  const [tagSelectOpen, setTagSelectOpen] = useState(false)
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [datePopupPosition, setDatePopupPosition] = useState({ top: 0, left: 0, width: 300 });
  const [tagPopupPosition, setTagPopupPosition] = useState({ top: 0, left: 0, width: 300 });
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
  // 更新日期选择器位置
  useLayoutEffect(() => {
    if (dateTimeExpanded && dateButtonRef.current) {
      const updatePosition = () => {
        const rect = dateButtonRef.current?.getBoundingClientRect();
        if (rect) {
          let top = rect.bottom + (typeof window !== 'undefined' ? window.scrollY : 0) + 5;
          let left = rect.left + (typeof window !== 'undefined' ? window.scrollX : 0);
          // 检查是否超出右侧边界
          if (typeof window !== 'undefined' && left + rect.width > window.innerWidth) {
            left = window.innerWidth - rect.width - 10;
          }
          setDatePopupPosition({
            top,
            left,
            width: rect.width
          });
        }
      };
      updatePosition();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        return () => {
          window.removeEventListener('resize', updatePosition);
          window.removeEventListener('scroll', updatePosition);
        };
      }
    }
  }, [dateTimeExpanded]);
  // 更新标签选择器位置
  useLayoutEffect(() => {
    if (tagSelectOpen && tagButtonRef.current) {
      const updatePosition = () => {
        const rect = tagButtonRef.current?.getBoundingClientRect();
        if (rect) {
          let top = rect.bottom + (typeof window !== 'undefined' ? window.scrollY : 0) + 5;
          let left = rect.left + (typeof window !== 'undefined' ? window.scrollX : 0);
          // 检查是否超出右侧边界
          if (typeof window !== 'undefined' && left + rect.width > window.innerWidth) {
            left = window.innerWidth - rect.width - 10;
          }
          setTagPopupPosition({
            top,
            left,
            width: rect.width
          });
        }
      };
      updatePosition();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        return () => {
          window.removeEventListener('resize', updatePosition);
          window.removeEventListener('scroll', updatePosition);
        };
      }
    }
  }, [tagSelectOpen]);
  // 添加点击外部关闭下拉框的处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 处理日期时间选择器
      if (dateTimeExpanded) {
        const dateTimeElement = document.getElementById('dateTimeExpanded');
        const dateTimeButton = dateButtonRef.current;
        if (dateTimeElement && dateTimeButton && 
            !dateTimeElement.contains(event.target as Node) && 
            !dateTimeButton.contains(event.target as Node)) {
          setDateTimeExpanded(false);
        }
      }
      // 处理标签选择器
      if (tagSelectOpen) {
        const tagSelectElement = document.getElementById('tagSelectDropdown');
        const tagButton = tagButtonRef.current;
        if (tagSelectElement && tagButton && 
            !tagSelectElement.contains(event.target as Node) && 
            !tagButton.contains(event.target as Node)) {
          setTagSelectOpen(false);
        }
      }
    };
    // 添加全局点击事件监听
    if (dateTimeExpanded || tagSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dateTimeExpanded, tagSelectOpen]);
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
      toast({
        title: "生成失败",
        description: "无法生成笔记，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsAIGenerating(false)
    }
  }
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setTaskForm({ ...taskForm, due_date: "" })
      return
    }
    // 如果已有时间，保留时间部分
    const currentDate = taskForm.due_date ? new Date(taskForm.due_date) : new Date()
    const newDate = new Date(date)
    if (taskForm.due_date) {
      newDate.setHours(currentDate.getHours())
      newDate.setMinutes(currentDate.getMinutes())
    } else {
      newDate.setHours(12)
      newDate.setMinutes(0)
    }
    setTaskForm({ ...taskForm, due_date: newDate.toISOString() })
  }
  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    const currentDate = taskForm.due_date ? new Date(taskForm.due_date) : new Date()
    if (type === "hour") {
      currentDate.setHours(Number.parseInt(value))
    } else {
      currentDate.setMinutes(Number.parseInt(value))
    }
    setTaskForm({ ...taskForm, due_date: currentDate.toISOString() })
  }
  const toggleTag = (tagName: string) => {
    setTaskForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName) ? prev.tags.filter((t) => t !== tagName) : [...prev.tags, tagName],
    }))
  }
  const removeTag = (tagName: string) => {
    setTaskForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagName),
    }))
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
        // 如果设置了预计完成时间，创建提醒
        if (taskData.due_date) {
          try {
            // 设置提醒
            scheduleTaskReminder(taskData.title, {
              estimatedTime: new Date(taskData.due_date)
            });
          } catch (err) {
          }
        }
        onSuccess(result)
        onOpenChange(false)
      }
    } catch (error) {
      toast({
        title: `${task ? '更新' : '创建'}失败`,
        description: `无法${task ? '更新' : '创建'}任务，请稍后再试`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  const getCurrentDate = () => {
    return taskForm.due_date ? new Date(taskForm.due_date) : undefined
  }
  const quadrantOptions = [
    { value: "1", label: "紧急且重要", icon: "⚡", color: "text-red-600" },
    { value: "2", label: "重要不紧急", icon: "🎯", color: "text-blue-600" },
    { value: "3", label: "紧急不重要", icon: "⏱️", color: "text-yellow-600" },
    { value: "4", label: "不紧急不重要", icon: "🌱", color: "text-green-600" },
  ]
  // 快速时间选项
  const getQuickTimeOptions = () => {
    const now = new Date()
    const options = [
      {
        label: "今天下午 18:00",
        value: () => {
          const date = new Date(now)
          date.setHours(18, 0, 0, 0)
          return date.toISOString()
        },
      },
      {
        label: "今天晚上 21:00",
        value: () => {
          const date = new Date(now)
          date.setHours(21, 0, 0, 0)
          return date.toISOString()
        },
      },
      {
        label: "明天上午 09:00",
        value: () => {
          const date = new Date(now)
          date.setDate(date.getDate() + 1)
          date.setHours(9, 0, 0, 0)
          return date.toISOString()
        },
      },
      {
        label: "明天下午 18:00",
        value: () => {
          const date = new Date(now)
          date.setDate(date.getDate() + 1)
          date.setHours(18, 0, 0, 0)
          return date.toISOString()
        },
      },
      {
        label: "下周一上午 09:00",
        value: () => {
          const date = new Date(now)
          const daysUntilMonday = (8 - date.getDay()) % 7 || 7
          date.setDate(date.getDate() + daysUntilMonday)
          date.setHours(9, 0, 0, 0)
          return date.toISOString()
        },
      },
    ]
    return options
  }
  // 添加处理对话框关闭的函数
  const handleDialogClose = (isOpen: boolean) => {
    // 如果对话框要关闭，先收起所有展开的选择器
    if (!isOpen) {
      setDateTimeExpanded(false);
      setTagSelectOpen(false);
    }
    // 执行外部传入的关闭处理函数
    onOpenChange(isOpen);
  };
  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // 无论是点击X还是其他方式关闭对话框，都使用handleDialogClose处理
        handleDialogClose(isOpen);
      }}
      modal={true}
    >
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        ref={dialogContentRef}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-center">{task ? "编辑任务" : "添加任务"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
          {/* 任务标题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">任务名称</label>
            <Input
              ref={titleInputRef}
              value={taskForm.title}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="输入任务名称"
              className="h-11 text-base"
            />
          </div>
          {/* 优先级和日期 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 优先级选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">优先级（象限）</label>
              <Select
                value={taskForm.quadrant.toString()}
                onValueChange={(value) => setTaskForm((prev) => ({
                  ...prev,
                  quadrant: Number.parseInt(value) as 1 | 2 | 3 | 4,
                }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  {quadrantOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span className={option.color}>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 日期时间选择 - 内联展开方式 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">预计完成时间</label>
              <Button
                variant="outline"
                className={cn(
                  "h-11 w-full justify-start text-left font-normal",
                  !taskForm.due_date && "text-muted-foreground",
                )}
                onClick={() => setDateTimeExpanded(!dateTimeExpanded)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {taskForm.due_date
                  ? format(new Date(taskForm.due_date), "yyyy年MM月dd日 HH:mm", { locale: zhCN })
                  : "选择日期和时间"}
                {dateTimeExpanded ? (
                  <ChevronUp className="ml-auto h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-auto h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {/* 日期时间选择器展开区域 */}
          {dateTimeExpanded && (
            <div 
              id="dateTimeExpanded" 
              className="border rounded-lg p-4 bg-muted/30 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 快速选择选项 */}
              <div>
                <h4 className="text-sm font-medium mb-2">快速选择</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getQuickTimeOptions().map((option, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskForm((prev) => ({ ...prev, due_date: option.value() }))
                        setDateTimeExpanded(false)
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">自定义时间</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 日期选择 */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Calendar
                      mode="single"
                      selected={getCurrentDate()}
                      onSelect={handleDateSelect}
                      locale={zhCN}
                      fromDate={new Date()}
                      className="rounded-md border w-fit"
                    />
                  </div>
                  {/* 时间选择 */}
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">时间设置</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <label className="text-sm w-8">小时</label>
                        <Select
                          value={getCurrentDate()?.getHours().toString() || "12"}
                          onValueChange={(value) => handleTimeChange("hour", value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="时" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <label className="text-sm w-8">分钟</label>
                        <Select
                          value={getCurrentDate()?.getMinutes().toString() || "0"}
                          onValueChange={(value) => handleTimeChange("minute", value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="分" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 操作按钮 */}
              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskForm((prev) => ({ ...prev, due_date: "" }))
                    setDateTimeExpanded(false)
                  }}
                >
                  清除时间
                </Button>
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateTimeExpanded(false)
                  }}
                >
                  确定
                </Button>
              </div>
            </div>
          )}
          {/* 标签选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">标签</label>
            {/* 标签选择器 - 移除上方的标签显示区域 */}
            <div className="relative">
              <Button
                ref={tagButtonRef}
                variant="outline"
                role="combobox"
                aria-expanded={tagSelectOpen}
                className="h-auto min-h-[44px] w-full justify-between text-left font-normal p-3 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setTagSelectOpen(!tagSelectOpen);
                }}
              >
                <div className="flex flex-wrap gap-1 flex-1 min-h-[20px]">
                  {taskForm.tags.length > 0 ? (
                    taskForm.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                      >
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTag(tag);
                          }}
                        />
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">选择标签...</span>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              {/* 标签选择下拉区域 */}
              {tagSelectOpen && (
                <div 
                  id="tagSelectDropdown" 
                  className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Command>
                    <CommandInput 
                      placeholder="搜索标签..." 
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <CommandList>
                      <CommandEmpty>未找到标签</CommandEmpty>
                      <CommandGroup>
                        {tags.map((tag) => (
                          <CommandItem 
                            key={tag.id} 
                            value={tag.name} 
                            onSelect={(currentValue) => {
                              toggleTag(tag.name);
                              // 不关闭下拉框，允许多选
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                taskForm.tags.includes(tag.name) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {tag.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
            {taskForm.tags.length > 0 && (
              <div className="text-xs text-muted-foreground">已选择 {taskForm.tags.length} 个标签</div>
            )}
          </div>
          {/* 任务详情 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">任务详情</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDetailedNotes}
                disabled={isAIGenerating}
                className="h-8 px-2 text-xs"
              >
                <Eye className="mr-1 h-3 w-3" />
                {isAIGenerating ? "生成中..." : "智能分析"}
              </Button>
            </div>
            <Textarea
              value={taskForm.notes}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="输入任务详情..."
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              // 关闭对话框前先收起所有展开的选择器
              setDateTimeExpanded(false);
              setTagSelectOpen(false);
              handleDialogClose(false);
            }} 
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button 
            onClick={() => {
              // 提交前先收起所有展开的选择器
              setDateTimeExpanded(false);
              setTagSelectOpen(false);
              handleSubmit();
            }} 
            disabled={isSubmitting} 
            className="min-w-[80px]"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {task ? "更新中..." : "创建中..."}
              </>
            ) : task ? (
              "更新"
            ) : (
              "创建"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}