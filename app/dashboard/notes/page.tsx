"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { PlusCircle, Edit, Trash2, Search, FileText, Clock, Type, Code, Table, Minus, Link as LinkIcon, FileIcon, AlignLeft, Folder, CalendarDays, Hash, Bookmark, AlignJustify, CheckSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getUserSession } from "@/lib/auth"
import { type Note, getUserNotes, createNote, updateNote, deleteNote } from "@/lib/notes"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import RichTextEditor from "@/components/RichTextEditor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [editorContent, setEditorContent] = useState("")
  const [activeTab, setActiveTab] = useState<"titles" | "time">("titles")
  const [documentHeadings, setDocumentHeadings] = useState<{id: string, text: string, level: number}[]>([])
  const [markdownMode, setMarkdownMode] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("新建备忘录")
  
  // 使用 useRef 来跟踪编辑器状态，避免不必要的重渲染
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const isExtractingHeadings = useRef(false);

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
        const session = await getUserSession()
        if (!session) {
          router.push("/login")
          return
        }

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
    try {
      const userNotes = await getUserNotes(userId)
      setNotes(userNotes)
      
      // 默认选择第一个备忘录
      if (userNotes.length > 0 && !selectedNote) {
        setSelectedNote(userNotes[0])
        setEditorContent(userNotes[0].content)
        extractHeadingsFromContent(userNotes[0].content)
      }
    } catch (error) {
      console.error("Error loading notes:", error)
      toast({
        title: "加载失败",
        description: "无法加载备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 从内容中提取标题作为目录，使用防抖避免频繁更新
  const extractHeadingsFromContent = (content: string) => {
    if (isExtractingHeadings.current) return;
    
    isExtractingHeadings.current = true;
    setTimeout(() => {
      // 简单匹配HTML标题标签
      const headingRegex = /<h([1-4])(?:[^>]*)>([^<]*)<\/h\1>/g;
      const headings: {id: string, text: string, level: number}[] = [];
      let match;
      
      while ((match = headingRegex.exec(content)) !== null) {
        const level = parseInt(match[1]);
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, '-');
        
        headings.push({
          id,
          text,
          level
        });
      }
      
      // 只有当标题变化时才更新状态
      if (JSON.stringify(headings) !== JSON.stringify(documentHeadings)) {
        setDocumentHeadings(headings);
      }
      
      isExtractingHeadings.current = false;
    }, 500); // 增加延迟，减少频繁更新
  }

  // 添加新备忘录 - 直接创建，不弹窗
  const addNewNote = async () => {
    if (!user) return

    try {
      const newNoteData = {
        user_id: user.id,
        title: newNoteTitle,
        content: `<h1>${newNoteTitle}</h1><p>开始编辑...</p>`,
      }

      const createdNote = await createNote(newNoteData)
      if (createdNote) {
        setNotes([createdNote, ...notes])
        
        // 自动选择新创建的备忘录
        setSelectedNote(createdNote)
        setEditorContent(createdNote.content)
        extractHeadingsFromContent(createdNote.content)
        
        // 聚焦到编辑器，使用户直接开始编辑
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
          }
        }, 100);
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

  // 选择备忘录
  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setEditorContent(note.content)
    extractHeadingsFromContent(note.content)
  }

  // 滚动到文档内锚点
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 更新备忘录标题
  const updateNoteTitle = async (newTitle: string) => {
    if (!selectedNote) return;
    
    try {
      const updatedNote = await updateNote(selectedNote.id, {
        title: newTitle
      });
      
      if (updatedNote) {
        setNotes(notes.map(note => 
          note.id === selectedNote.id ? {...note, title: newTitle} : note
        ));
        setSelectedNote({...selectedNote, title: newTitle});
      }
    } catch (error) {
      console.error("Error updating note title:", error);
      toast({
        title: "更新失败",
        description: "无法更新备忘录标题，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 保存编辑后的备忘录
  const saveEditedNote = async () => {
    if (!selectedNote) return

    try {
      // 从内容中提取第一个H1作为标题
      let newTitle = selectedNote.title;
      const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(editorContent);
      if (h1Match && h1Match[1]) {
        newTitle = h1Match[1].trim();
      }

      const updatedNote = await updateNote(selectedNote.id, {
        title: newTitle,
        content: editorContent,
      })

      if (updatedNote) {
        setNotes(notes.map((note) => (note.id === selectedNote.id ? updatedNote : note)))
        setSelectedNote(updatedNote)
        extractHeadingsFromContent(editorContent)
        toast({
          title: "保存成功",
          description: "备忘录已更新",
        })
      }
    } catch (error) {
      console.error("Error updating note:", error)
      toast({
        title: "更新失败",
        description: "无法更新备忘录，请稍后再试",
        variant: "destructive",
      })
    }
  }

  // 删除备忘录
  const deleteNoteItem = async (noteId: string) => {
    try {
      const success = await deleteNote(noteId)
      if (success) {
        const updatedNotes = notes.filter((note) => note.id !== noteId)
        setNotes(updatedNotes)
        
        // 如果删除的是当前选中的备忘录，选择列表中的第一个
        if (selectedNote && selectedNote.id === noteId) {
          if (updatedNotes.length > 0) {
            setSelectedNote(updatedNotes[0])
            setEditorContent(updatedNotes[0].content)
            extractHeadingsFromContent(updatedNotes[0].content)
          } else {
            setSelectedNote(null)
            setEditorContent("")
            setDocumentHeadings([])
          }
        }
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
  const filteredNotes = useMemo(() => {
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [notes, searchQuery])

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

  // 格式化简短日期（只显示日期，不显示时间）
  const formatShortDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  // 对笔记按创建日期分组
  const notesByDate = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    
    filteredNotes.forEach(note => {
      const dateKey = formatShortDate(note.created_at);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(note);
    });
    
    // 转换为按日期排序的数组
    return Object.entries(grouped)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, notes]) => ({
        date,
        notes: notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      }));
  }, [filteredNotes]);

  // 处理编辑器内容变化，提取标题
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    // 异步提取标题，避免影响性能
    extractHeadingsFromContent(content);
  };

  // 用非受控组件模式实现编辑器，避免React状态更新干扰输入
  const Editor = ({ content, onChange }: { content: string, onChange: (content: string) => void }) => {
    // 本地引用，不触发渲染
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const contentRef = useRef<string>(content);
    
    // 仅在组件挂载或content从外部变化时更新textarea值
    useEffect(() => {
      if (textareaRef.current && content !== contentRef.current) {
        textareaRef.current.value = content;
        contentRef.current = content;
      }
    }, [content]);
    
    // 处理内容变化 - 使用防抖确保不会频繁更新状态
    const updateContent = useRef<NodeJS.Timeout | null>(null);
    
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const newContent = e.currentTarget.value;
      contentRef.current = newContent;
      
      // 清除上一个定时器
      if (updateContent.current) {
        clearTimeout(updateContent.current);
      }
      
      // 延迟更新状态，允许连续输入
      updateContent.current = setTimeout(() => {
        onChange(newContent);
        updateContent.current = null;
      }, 300);
    };
    
    return (
      <textarea
        ref={textareaRef}
        defaultValue={content} // 使用defaultValue而非value
        onInput={handleInput} 
        placeholder="在此输入您的笔记内容..."
        className="min-h-[calc(100vh-15rem)] w-full p-4 border rounded-md focus:ring-primary focus-visible:ring-primary"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: 1.6,
          fontSize: '1rem',
          resize: 'none', 
          outline: 'none',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word'
        }}
      />
    );
  };

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
    <main className="container h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* 主侧边栏：笔记列表 */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={35} className="border-r">
          <div className="flex flex-col h-full">
            {/* 搜索和添加区 */}
            <div className="p-3 border-b flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索备忘录..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm w-full"
                />
              </div>
              <Button
                onClick={addNewNote}
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 flex-shrink-0"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            
            {/* 切换类型Tab */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "titles" | "time")} className="px-3 py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="titles">
                  <AlignLeft className="h-3.5 w-3.5 mr-2" />
                  标题
                </TabsTrigger>
                <TabsTrigger value="time">
                  <CalendarDays className="h-3.5 w-3.5 mr-2" />
                  时间
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* 备忘录列表 */}
            <ScrollArea className="flex-grow">
              {filteredNotes.length > 0 ? (
                <div className="space-y-1 p-2">
                  {activeTab === "titles" ? (
                    // 按标题列表显示
                    filteredNotes
                      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                      .map((note) => (
                        <div 
                          key={note.id} 
                          className={`p-2 rounded cursor-pointer hover:bg-muted transition-colors ${selectedNote?.id === note.id ? 'bg-muted' : ''}`}
                          onClick={() => selectNote(note)}
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate">{note.title}</h3>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              deleteNoteItem(note.id);
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{formatDate(note.updated_at)}</p>
                        </div>
                      ))
                  ) : (
                    // 按时间分组显示
                    notesByDate.map(({ date, notes }) => (
                      <div key={date} className="mb-4">
                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-1">{date}</h3>
                        {notes.map(note => (
                          <div 
                            key={note.id} 
                            className={`p-2 rounded cursor-pointer hover:bg-muted transition-colors ${selectedNote?.id === note.id ? 'bg-muted' : ''}`}
                            onClick={() => selectNote(note)}
                          >
                            <h3 className="font-medium text-sm truncate">{note.title}</h3>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {searchQuery ? "没有找到匹配的备忘录" : "暂无备忘录，点击右上角添加"}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* 主内容区域：富文本编辑器 */}
        <ResizablePanel defaultSize={75}>
          <div className="flex flex-col h-full">
            {selectedNote ? (
              <>
                {/* 编辑器工具栏 */}
                <div className="border-b py-2 px-4 flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-2 mr-4">
                    <ToggleGroup type="single" defaultValue="h1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="h1" aria-label="大标题">
                              <Type className="h-4 w-4" />
                              <span className="ml-1">H1</span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>大标题</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="h2" aria-label="中标题">
                              <Type className="h-3.5 w-3.5" />
                              <span className="ml-1">H2</span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>中标题</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="h3" aria-label="小标题">
                              <Type className="h-3 w-3" />
                              <span className="ml-1">H3</span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>小标题</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value="h4" aria-label="小标题">
                              <Type className="h-2.5 w-2.5" />
                              <span className="ml-1">H4</span>
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>小标题</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </ToggleGroup>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入代码块</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Table className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入表格</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Minus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入分割线</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入链接</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入锚点</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={markdownMode ? "default" : "ghost"}
                            size="sm" 
                            className="h-8"
                            onClick={() => setMarkdownMode(!markdownMode)}
                          >
                            <AlignJustify className="h-4 w-4 mr-2" />
                            Markdown模式
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>切换Markdown语法模式</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="ml-auto">
                    <Button onClick={saveEditedNote} size="sm">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>
                
                {/* 编辑器内容区和文档目录侧边栏 */}
                <div className="flex flex-1 overflow-hidden">
                  {/* 编辑器内容区 */}
                  <div className="flex-1 p-4 overflow-auto">
                    {/* 添加明确的标题编辑区域 */}
                    <div className="mb-4">
                      <Input
                        value={selectedNote.title}
                        onChange={(e) => {
                          // 更新本地状态
                          setSelectedNote({...selectedNote, title: e.target.value});
                          // 更新列表中的标题
                          setNotes(notes.map(note => 
                            note.id === selectedNote.id ? {...note, title: e.target.value} : note
                          ));
                        }}
                        onBlur={(e) => updateNoteTitle(e.target.value)}
                        className="text-xl font-bold border-0 border-b border-dashed focus-visible:border-solid p-0 h-auto focus-visible:ring-0 bg-transparent"
                        placeholder="输入标题..."
                      />
                    </div>
                    {/* 使用备用编辑器组件，如果RichTextEditor未安装 */}
                    <Editor 
                      content={editorContent}
                      onChange={handleEditorChange}
                    />
                  </div>
                  
                  {/* 文档目录侧边栏 - 移至右侧 */}
                  <div className="w-64 border-l h-full flex flex-col overflow-hidden">
                    <div className="p-3 border-b">
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        文档目录
                      </h3>
                      
                      {/* 从文档内容中提取的标题列表，作为目录 */}
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1 text-sm">
                          {documentHeadings.length > 0 ? (
                            documentHeadings.map((heading, index) => (
                              <div 
                                key={index}
                                className="py-1 cursor-pointer hover:bg-muted truncate"
                                style={{ paddingLeft: `${heading.level * 8}px` }}
                                onClick={() => scrollToHeading(heading.id)}
                              >
                                {heading.text}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">文档中暂无标题结构</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="p-3 border-b">
                      <h3 className="text-sm font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        文档信息
                      </h3>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>创建时间: {formatDate(selectedNote.created_at)}</p>
                        <p>更新时间: {formatDate(selectedNote.updated_at)}</p>
                        <p>字数统计: {editorContent.replace(/<[^>]*>/g, '').length} 字符</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h2 className="mt-2 text-xl font-semibold">暂无选择的备忘录</h2>
                  <p className="text-muted-foreground mt-1">选择一个备忘录或创建新备忘录</p>
                  <Button
                    onClick={addNewNote}
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> 新建备忘录
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}

