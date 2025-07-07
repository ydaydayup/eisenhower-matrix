"use client"
import { useState, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Search, FileText, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getUserSession } from "@/lib/auth"
import { type Note, getUserNotes, createNote, updateNote, deleteNote } from "@/lib/notes"

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // 备忘录表单状态
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
  })

  // 预览状态
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewNote, setPreviewNote] = useState<Note | null>(null)

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
        loadUserNotes(session.id)
      } catch (error) {
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [router])

  // 加载用户备忘录
  const loadUserNotes = async (userId: string) => {
    if (!userId) {
      toast({
        title: "加载失败",
        description: "用户ID无效，请重新登录",
        variant: "destructive",
      })
      return
    }
    try {
      const userNotes = await getUserNotes(userId)
      setNotes(userNotes)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 添加新备忘录
  const addNote = async () => {
    if (!user || noteForm.title.trim() === "") return
    try {
      const newNoteData = {
        user_id: user.id,
        title: noteForm.title,
        content: noteForm.content
      }
      const createdNote = await createNote(newNoteData)
      if (createdNote) {
        setNotes([createdNote, ...notes])
        resetNoteForm()
        setIsEditing(false)
        toast({
          title: "创建成功",
          description: "备忘录已成功创建",
        })
      }
    } catch (error) {
      toast({
        title: "添加失败",
        description: "无法添加备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 重置备忘录表单
  const resetNoteForm = () => {
    setNoteForm({
      title: "",
      content: "",
    })
  }

  // 编辑备忘录
  const startEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteForm({
      title: note.title,
      content: note.content,
    })
    setIsEditing(true)
  }

  // 保存编辑后的备忘录
  const saveEditedNote = async () => {
    if (!editingNote || noteForm.title.trim() === "") return
    try {
      const updatedNote = await updateNote(editingNote.id, {
        title: noteForm.title,
        content: noteForm.content,
      })
      if (updatedNote) {
        setNotes(notes.map((note) => (note.id === editingNote.id ? updatedNote : note)))
        toast({
          title: "更新成功",
          description: "备忘录已成功更新",
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "无法更新备忘录，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
      setEditingNote(null)
      resetNoteForm()
    }
  }

  // 删除备忘录
  const deleteNoteItem = async (noteId: string) => {
    try {
      const success = await deleteNote(noteId)
      if (success) {
        setNotes(notes.filter((note) => note.id !== noteId))
        toast({
          title: "删除成功",
          description: "备忘录已成功删除",
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 预览备忘录
  const openPreview = (note: Note) => {
    setPreviewNote(note)
    setIsPreviewOpen(true)
  }

  // 从预览进入编辑
  const editFromPreview = (note: Note) => {
    setIsPreviewOpen(false)
    startEditNote(note)
  }

  // 过滤备忘录
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 格式化日期
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return "今天"
    } else if (diffDays === 2) {
      return "昨天"
    } else if (diffDays <= 7) {
      return `${diffDays - 1}天前`
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      })
    }
  }

  // 获取内容预览
  const getContentPreview = (content: string) => {
    return content.length > 80 ? content.substring(0, 80) + "..." : content
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-black">
              随手记
            </h1>
          </div>
          <Button
            onClick={() => {
              resetNoteForm()
              setEditingNote(null)
              setIsEditing(true)
            }}
            size="lg"
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            新建备忘录
          </Button>
        </div>

        {/* 搜索和统计 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索备忘录标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-input focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1.5">
              <FileText className="mr-1 h-4 w-4" />
              {filteredNotes.length} 条记录
            </Badge>
          </div>
        </div>

        {/* 备忘录列表 */}
        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredNotes
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .map((note) => (
                <Card
                  key={note.id}
                  className="group hover:shadow-xl transition-all duration-300 border-border bg-card/80 backdrop-blur-sm hover:bg-card hover:-translate-y-1 flex flex-col h-[280px]"
                >
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {note.title}
                      </CardTitle>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditNote(note)}
                          className="h-6 w-6 p-0 hover:bg-muted hover:text-primary"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNoteItem(note.id)}
                          className="h-6 w-6 p-0 hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(note.updated_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 flex-grow overflow-hidden">
                    <p className="text-card-foreground/80 text-sm leading-relaxed line-clamp-4 whitespace-pre-line overflow-ellipsis">
                      {getContentPreview(note.content)}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/50 mt-auto">
                    <div className="flex items-center justify-between w-full">
                      <Badge variant="outline" className="text-xs h-6 px-2 flex items-center">
                        {note.content.length} 字符
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(note)}
                        className="hover:bg-muted hover:text-primary h-6 px-2"
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        预览
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "没有找到匹配的备忘录" : "还没有备忘录"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? "尝试使用其他关键词搜索" : "开始记录你的第一个想法吧"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => {
                  resetNoteForm()
                  setEditingNote(null)
                  setIsEditing(true)
                }}
                size="lg"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                创建第一个备忘录
              </Button>
            )}
          </div>
        )}

        {/* 备忘录表单对话框 */}
        <Dialog
          open={isEditing}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditing(false)
              setEditingNote(null)
              resetNoteForm()
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{editingNote ? "编辑备忘录" : "新建备忘录"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">标题</label>
                <Input
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="给你的备忘录起个标题..."
                  className="h-11 bg-background border-input focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">内容</label>
                <Textarea
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="在这里记录你的想法..."
                  className="min-h-[240px] bg-background border-input focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>支持换行和特殊字符</span>
                  <span>{noteForm.content.length} 字符</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditingNote(null)
                  resetNoteForm()
                }}
                className="hover:bg-muted"
              >
                取消
              </Button>
              <Button
                onClick={editingNote ? saveEditedNote : addNote}
                disabled={!noteForm.title.trim()}
              >
                {editingNote ? "保存更改" : "创建备忘录"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 预览对话框 */}
        <Dialog
          open={isPreviewOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsPreviewOpen(false)
              setPreviewNote(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-background/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {previewNote?.title}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {previewNote && formatDate(previewNote.updated_at)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {previewNote?.content.length} 字符
                </Badge>
              </div>
            </DialogHeader>
            <div className="py-4 max-h-[50vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-muted p-4 rounded-lg border">
                  {previewNote?.content}
                </pre>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="hover:bg-muted">
                关闭
              </Button>
              <Button
                onClick={() => previewNote && editFromPreview(previewNote)}
              >
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (previewNote) {
                    deleteNoteItem(previewNote.id)
                    setIsPreviewOpen(false)
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
