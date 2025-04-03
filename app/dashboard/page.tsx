"use client"

import {useState, useEffect, JSX} from "react"
import {PlusCircle, Edit, Trash2, Check, LucideTag, ListTree, Loader2} from "lucide-react"
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger} from "@/components/ui/dialog"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Textarea} from "@/components/ui/textarea"
import {Badge} from "@/components/ui/badge"
import {cn} from "@/lib/utils"
import {useRouter} from "next/navigation"
import {useToast} from "@/hooks/use-toast"
import {getUserSession} from "@/lib/auth"
import {type Task, getUserTasks, createTask, updateTask, deleteTask} from "@/lib/tasks"
import {type Tag, getUserTags, createTag, deleteTag} from "@/lib/tags"
import {format} from "date-fns"
import {SubtaskSidebar} from "@/components/SubtaskSidebar"
import {ButtonGroup, ButtonGroupItem} from "@/components/ui/button-group"
import TaskEditModal from "@/components/TaskEditModal"

// 视图类型
type ViewType = "quadrant" | "category" | "simple"

export default function Dashboard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    // 在 Dashboard 函数内部添加视图状态
    const [viewType, setViewType] = useState<ViewType>("quadrant")
    // 添加生成笔记的加载状态
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
    const [showCompleted, setShowCompleted] = useState(false)

    const router = useRouter()
    const {toast} = useToast()

    // 编辑任务状态
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    // 标签管理状态
    const [showTagManager, setShowTagManager] = useState(false)
    const [newTagName, setNewTagName] = useState("")

    const [subtaskOpen, setSubtaskOpen] = useState(false)
    const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<Task | null>(null)

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

    // 处理任务创建或更新成功
    const handleTaskSuccess = (updatedTask: Task) => {
        if (editingTask) {
            // 更新现有任务
            setTasks(tasks.map(task =>
                task.id === updatedTask.id ? updatedTask : task
            ))
        } else {
            // 添加新任务
            setTasks([updatedTask, ...tasks])
        }
    }

    // 打开编辑模态框
    const openEditModal = (task?: Task) => {
        setEditingTask(task || null)
        setEditModalOpen(true)
    }

    // 切换任务完成状态
    const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
        try {
            const updatedTask = await updateTask(taskId, {completed: !completed})
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
        if (editingTask?.tags.includes(tagName)) {
            setEditingTask({
                ...editingTask,
                tags: editingTask.tags.filter((t) => t !== tagName),
            })
        } else {
            setEditingTask({
                ...editingTask,
                tags: [...editingTask.tags, tagName],
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

    // 象限配置
    const quadrants = [
        {
            id: 1,
            title: "紧急且重要",
            subtitle: "立即做",
            bgColor: "bg-red-50/50",
            borderColor: "border-red-200/50",
            icon: "⚡",
            color: "text-red-500"
        },
        {
            id: 2,
            title: "重要不紧急",
            subtitle: "计划做",
            bgColor: "bg-blue-50/50",
            borderColor: "border-blue-200/50",
            icon: "🎯",
            color: "text-blue-500"
        },
        {
            id: 3,
            title: "紧急不重要",
            subtitle: "委托他人",
            bgColor: "bg-amber-50/50",
            borderColor: "border-amber-200/50",
            icon: "⏱️",
            color: "text-amber-500"
        },
        {
            id: 4,
            title: "不紧急不重要",
            subtitle: "考虑删除",
            bgColor: "bg-emerald-50/50",
            borderColor: "border-emerald-200/50",
            icon: "🌱",
            color: "text-emerald-500"
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

    // 打开子任务侧边栏
    const openSubtaskSidebar = (task: Task) => {
        setSelectedTaskForSubtask(task)
        setSubtaskOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            </div>
        )
    }

    return (
        <>
            <style jsx global>
                {scrollbarStyles}
            </style>
            <main className="container mx-auto p-4 md:p-6 max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center my-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">待办事项</h1>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        <Button
                            onClick={() => openEditModal()}
                            className="btn-primary glass-button px-4 py-2 rounded-full"
                        >
                            <PlusCircle className="mr-2 h-4 w-4"/> 添加任务
                        </Button>

                        <Dialog open={showTagManager} onOpenChange={setShowTagManager}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="glass-button rounded-full">
                                    <LucideTag className="mr-2 h-4 w-4"/> 管理标签
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card border-0">
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
                                            className="glass-morphism border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                        />
                                        <Button onClick={addTag} className="btn-primary">添加</Button>
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {tags.map((tag) => (
                                            <div key={tag.id}
                                                 className="flex justify-between items-center p-3 glass-morphism rounded-lg">
                                                <span>{tag.name}</span>
                                                <Button variant="ghost" size="icon"
                                                        className="hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => deleteTagItem(tag.id)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* 视图切换按钮 */}
                <div className="flex flex-col sm:flex-row gap-2 justify-end mb-6">
                    <ButtonGroup
                        variant="glass"
                        size="sm"
                        activeIndex={
                            viewType === "quadrant" ? 0 :
                                viewType === "category" ? 1 : 2
                        }
                        onActiveIndexChange={(index) => {
                            switch (index) {
                                case 0:
                                    setViewType("quadrant");
                                    break;
                                case 1:
                                    setViewType("category");
                                    break;
                                case 2:
                                    setViewType("simple");
                                    break;
                            }
                        }}
                        className="w-full sm:w-auto"
                    >
                        <ButtonGroupItem className="tab-theme">四象限</ButtonGroupItem>
                        <ButtonGroupItem className="tab-theme">分类</ButtonGroupItem>
                        <ButtonGroupItem className="tab-theme">精简</ButtonGroupItem>
                    </ButtonGroup>
                </div>

                {/* 任务视图区域 */}
                {viewType === "quadrant" ? (
                    // 四象限视图
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {quadrants.map((quadrant) => (
                            <div
                                key={quadrant.id}
                                className={cn(
                                    "quadrant-card p-5 rounded-2xl transition-all",
                                    quadrant.bgColor,
                                    quadrant.borderColor
                                )}
                            >
                                <div className="mb-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{quadrant.icon}</span>
                                        <div>
                                            <h2 className={cn("text-lg font-bold", quadrant.color)}>{quadrant.title}</h2>
                                            <p className="text-sm text-gray-500">{quadrant.subtitle}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-white/50"
                                        onClick={() => {
                                            setEditingTask({
                                                ...editingTask,
                                                quadrant: quadrant.id as 1 | 2 | 3 | 4
                                            });
                                            openEditModal();
                                        }}
                                    >
                                        <PlusCircle className={cn("h-5 w-5", quadrant.color)}/>
                                    </Button>
                                </div>
                                <div
                                    className="text-right text-xs text-gray-500 mb-2">{getQuadrantTasks(quadrant.id).length} 项
                                </div>

                                <div className="space-y-2 h-[250px] sm:h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                    {getQuadrantTasks(quadrant.id).length > 0 ? (
                                        getQuadrantTasks(quadrant.id).map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onEdit={() => openEditModal(task)}
                                                onDelete={() => deleteTaskItem(task.id)}
                                                onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                                                onAddSubtask={() => openSubtaskSidebar(task)}
                                                viewType={viewType}
                                                quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                                            />
                                        ))
                                    ) : (
                                        <div
                                            className="text-center text-gray-400 py-10 rounded-xl bg-white/30 backdrop-blur-sm">暂无任务</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : viewType === "category" ? (
                    // 分类视图
                    <div className="space-y-6">
                        {tags.length > 0 ? (
                            tags
                                .map((tag) => {
                                    const tagTasks = getActiveTasks().filter((task) => task.tags.includes(tag.name))
                                    if (tagTasks.length === 0) return null

                                    return (
                                        <div key={tag.id} className="glass-card p-5">
                                            <div className="mb-4">
                                                <h2 className="text-lg font-bold flex items-center">
                                                    <Badge
                                                        className="mr-2 bg-primary hover:bg-primary/90">{tag.name}</Badge>
                                                    <span
                                                        className="text-sm text-gray-500">({tagTasks.length} 项)</span>
                                                </h2>
                                            </div>
                                            <div className="space-y-2">
                                                {tagTasks.map((task) => (
                                                    <TaskItem
                                                        key={task.id}
                                                        task={task}
                                                        onEdit={() => openEditModal(task)}
                                                        onDelete={() => deleteTaskItem(task.id)}
                                                        onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                                                        onAddSubtask={() => openSubtaskSidebar(task)}
                                                        viewType={viewType}
                                                        quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                                .filter((item): item is JSX.Element => item !== null)
                        ) : (
                            <div className="text-center text-gray-500 py-8 glass-card">暂无标签，请先添加标签</div>
                        )}

                        {/* 无标签任务 */}
                        {(() => {
                            const noTagTasks = getActiveTasks().filter((task) => task.tags.length === 0)
                            if (noTagTasks.length === 0) return null

                            return (
                                <div className="glass-card p-5">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-bold flex items-center">
                                            <span>未分类</span>
                                            <span className="text-sm text-gray-500 ml-2">({noTagTasks.length} 项)</span>
                                        </h2>
                                    </div>
                                    <div className="space-y-2">
                                        {noTagTasks.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onEdit={() => openEditModal(task)}
                                                onDelete={() => deleteTaskItem(task.id)}
                                                onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                                                onAddSubtask={() => openSubtaskSidebar(task)}
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
                    <div className="glass-card p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold">所有任务</h2>
                            <p className="text-sm text-gray-500">按创建时间排序</p>
                        </div>
                        <div className="space-y-2">
                            {getActiveTasks().length > 0 ? (
                                [...getActiveTasks()]
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((task) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            onEdit={() => openEditModal(task)}
                                            onDelete={() => deleteTaskItem(task.id)}
                                            onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                                            onAddSubtask={() => openSubtaskSidebar(task)}
                                            viewType={viewType}
                                            quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                                        />
                                    ))
                            ) : (
                                <div
                                    className="text-center text-gray-400 py-10 rounded-xl bg-white/30 backdrop-blur-sm">暂无任务</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 已完成任务区域 */}
                <div className="mt-8">
                    <div
                        className="flex justify-between items-center p-3 glass-morphism rounded-xl cursor-pointer hover:bg-background/90 transition-all"
                        onClick={() => setShowCompleted(!showCompleted)}
                    >
                        <h2 className="font-bold flex items-center">
                            <Check className="h-4 w-4 mr-2 text-green-500"/>
                            已完成任务 ({getCompletedTasks().length})
                        </h2>
                        <span className="text-sm text-muted-foreground">{showCompleted ? "收起" : "展开"}</span>
                    </div>

                    {showCompleted && (
                        <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {getCompletedTasks().length > 0 ? (
                                getCompletedTasks().map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        onEdit={() => openEditModal(task)}
                                        onDelete={() => deleteTaskItem(task.id)}
                                        onToggleComplete={() => toggleTaskCompletion(task.id, task.completed)}
                                        onAddSubtask={() => openSubtaskSidebar(task)}
                                        viewType={viewType}
                                        quadrantInfo={quadrants.find((q) => q.id === task.quadrant)}
                                    />
                                ))
                            ) : (
                                <div
                                    className="text-center text-muted-foreground py-6 rounded-xl bg-background/30 backdrop-blur-sm">暂无已完成任务</div>
                            )}
                        </div>
                    )}
                </div>

                {/* 替换原有的 Dialog 为新的 TaskEditModal */}
                <TaskEditModal
                    open={editModalOpen}
                    task={editingTask}
                    onOpenChange={(open) => {
                        setEditModalOpen(open)
                        if (!open) {
                            setEditingTask(null)
                        }
                    }}
                    onSuccess={handleTaskSuccess}
                    userId={user?.id || ''}
                    tags={tags}
                />

                {/* 子任务侧边栏 */}
                <SubtaskSidebar
                    open={subtaskOpen}
                    onOpenChange={setSubtaskOpen}
                    task={selectedTaskForSubtask}
                />
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
                      onAddSubtask,
                      viewType = "quadrant",
                      quadrantInfo,
                  }: {
    task: Task
    onEdit: () => void
    onDelete: () => void
    onToggleComplete: () => void
    onAddSubtask: () => void
    viewType?: ViewType
    quadrantInfo?: { title: string; bgColor: string; borderColor: string; icon?: string; color?: string }
}) {
    // 检查日期是否已过期
    const isDateOverdue = (dateString: string | null) => {
        if (!dateString) return false
        const dueDate = new Date(dateString)
        const today = new Date()
        return dueDate < today
    }

    // 更新表单中的日期显示
    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return ""
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return dateString
            return format(date, 'yyyy-MM-dd HH:mm')
        } catch (error) {
            console.error("日期格式化错误:", error)
            return dateString
        }
    }

    return (
        <div className={cn(
            "task-item p-3 group",
            task.completed && "task-item-completed opacity-70"
        )}>
            <div className="flex justify-between">
                <div className="flex items-start gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mt-0.5 rounded-full hover:bg-background/70"
                        onClick={onToggleComplete}
                    >
                        <div
                            className={cn(
                                "h-4 w-4 rounded-full border transition-colors",
                                task.completed ? "bg-primary border-0" : "border-border",
                            )}
                        >
                            {task.completed && <Check className="h-3 w-3 text-primary-foreground"/>}
                        </div>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h3 className={cn("font-medium break-words", task.completed && "line-through text-muted-foreground")}>
                            {quadrantInfo?.icon &&
                                <span className="mr-1 text-xs">{quadrantInfo.icon}</span>} {task.title}
                        </h3>

                        {/* 根据视图类型显示不同的内容 */}
                        {viewType === "quadrant" ? (
                            <>
                                {task.due_date && (
                                    <div className={cn(
                                        "text-xs mt-1 flex items-center",
                                        isDateOverdue(task.due_date) ? "text-destructive font-medium" : "text-muted-foreground",
                                    )}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none"
                                             viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        {formatDateTime(task.due_date)}
                                    </div>
                                )}
                                {task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary"
                                                   className="text-xs px-2 py-0 h-5 bg-secondary/50 text-secondary-foreground">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {quadrantInfo && (
                                        <Badge className={cn(
                                            "text-xs",
                                            quadrantInfo.color ? quadrantInfo.color.replace("text-", "bg-").replace("-500", "-100") : "",
                                            quadrantInfo.color?.replace("text-", "text-")
                                        )}>
                                            {quadrantInfo.title}
                                        </Badge>
                                    )}
                                    {task.due_date && (
                                        <Badge variant="outline" className={cn(
                                            "text-xs border-0",
                                            isDateOverdue(task.due_date) ? "text-destructive font-medium bg-destructive/10" : "text-muted-foreground bg-muted/50"
                                        )}>
                                            {formatDateTime(task.due_date)}
                                        </Badge>
                                    )}
                                </div>
                                {task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary"
                                                   className="text-xs px-2 py-0 h-5 bg-secondary/50 text-secondary-foreground">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-start gap-1 opacity-20 group-hover:opacity-100 transition-all duration-200">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background/70"
                            onClick={onAddSubtask}>
                        <ListTree className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background/70"
                            onClick={onEdit}>
                        <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background/70"
                            onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}

