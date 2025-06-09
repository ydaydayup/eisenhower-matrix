"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

  // 获取用户会话
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking user session...")
        const session = await getUserSession()
        console.log("Session result:", session ? "Found" : "Not found")
        
        if (!session) {
          console.log("No session found, redirecting to login")
          router.push("/login")
          return
        }

        console.log("User session found:", session.id)
        setUser(session)
        loadUserNotes(session.id)
      } catch (error) {
        console.error("Session error:", error)
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
      console.error("Cannot load notes: userId is empty")
      toast({
        title: "加载失败",
        description: "用户ID无效，请重新登录",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Loading notes for user:", userId)
      const userNotes = await getUserNotes(userId)
      console.log(`Loaded ${userNotes.length} notes`)
      setNotes(userNotes)
    } catch (error) {
      console.error("Error loading notes:", error)
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
        content: noteForm.content,
        tags: [],
        quadrant: null
      }

      const createdNote = await createNote(newNoteData)
      if (createdNote) {
        setNotes([createdNote, ...notes])
        resetNoteForm()
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error adding note:", error)
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
      }
    } catch (error) {
      console.error("Error updating note:", error)
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
      }
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "删除失败",
        description: "无法删除备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 过滤备忘录
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 格式化日期
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 my-4 sm:my-6">
        <h1 className="text-xl sm:text-2xl font-bold">随手记</h1>
        <Button
          onClick={() => {
            resetNoteForm()
            setEditingNote(null)
            setIsEditing(true)
          }}
          size="sm"
          className="sm:size-default"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> 新建备忘录
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索备忘录..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 备忘录列表 */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredNotes
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .map((note) => (
              <Card key={note.id} className="overflow-hidden">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg truncate">{note.title}</CardTitle>
                  <CardDescription className="text-xs">更新于: {formatDate(note.updated_at)}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2 px-3 sm:px-6">
                  <p className="text-xs sm:text-sm line-clamp-3 sm:line-clamp-4 whitespace-pre-line">{note.content}</p>
                </CardContent>
                <CardFooter className="flex justify-end pt-1 pb-1 px-2 sm:px-6">
                  <Button variant="ghost" size="sm" onClick={() => startEditNote(note)}>
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteNoteItem(note.id)}>
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {searchQuery ? "没有找到匹配的备忘录" : "暂无备忘录，点击右上角添加"}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? "编辑备忘录" : "新建备忘录"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">标题</label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="输入标题"
              />
            </div>

            <div>
              <label className="text-sm font-medium">内容</label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="输入内容"
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditingNote(null)
                resetNoteForm()
              }}
            >
              取消
            </Button>
            <Button onClick={editingNote ? saveEditedNote : addNote}>{editingNote ? "保存" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

