"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { PlusCircle, Edit, Trash2, Search, FileText, Clock, Type, Code, Table, Minus, Link as LinkIcon, FileIcon, AlignLeft, Folder, CalendarDays, Hash, Bookmark, AlignJustify, CheckSquare, ListOrdered, List, Check } from "lucide-react"
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
  const [newNoteTitle, setNewNoteTitle] = useState("")
  
  // 使用 useRef 来跟踪编辑器状态，避免不必要的重渲染
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const isExtractingHeadings = useRef(false);
  const isComposing = useRef(false); // 添加输入法组合状态跟踪
  
  // 用于防抖提取标题和自动保存
  const extractHeadingsDebounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 记录最后保存的内容
  const lastSavedContent = useRef<string>("");

  const router = useRouter()
  const { toast } = useToast()

  // 备忘录表单状态
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
  })

  // 添加备忘录标题编辑状态
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [shouldKeepEditingFocus, setShouldKeepEditingFocus] = useState(false); // 新增：控制是否应当保持编辑状态
  const titleInputRef = useRef<HTMLInputElement | null>(null); // 添加输入框引用
  const isTitleComposing = useRef(false); // 添加一个标志来跟踪输入法编辑状态

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
    
    try {
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
    } finally {
      // 确保标志位被重置，即使发生错误
      setTimeout(() => {
      isExtractingHeadings.current = false;
      }, 200);
    }
  }

  // 添加新备忘录 - 直接创建，不弹窗
  const addNewNote = async () => {
    if (!user) return

    try {
      const newNoteData = {
        user_id: user.id,
        title: newNoteTitle,
        content: `<h1>开始编辑备忘录...</h1><p>在这里输入内容</p>`,
      }

      const createdNote = await createNote(newNoteData)
      if (createdNote) {
        // 更新列表
        setNotes([createdNote, ...notes])
        
        // 更新内部状态 
        setSelectedNote(createdNote)
        setEditorContent(createdNote.content)
        lastSavedContent.current = createdNote.content;
        
        // 直接设置编辑器内容
        setTimeout(() => {
          if (editorRef.current) {
            // 设置内容
            editorRef.current.value = createdNote.content;
            
            // 确保聚焦
            editorRef.current.focus();
            
            // 手动触发提取标题
            extractHeadingsFromContent(createdNote.content);
          }
        }, 10);
        
        // 自动进入标题编辑模式
        setEditingNoteId(createdNote.id);
        setEditingNoteTitle("");
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
    // 切换前保存当前备忘录
    if (selectedNote && editorContent !== lastSavedContent.current) {
      saveEditedNote(true);
    }
    
    // 更新内部状态
    setSelectedNote(note);
    setEditorContent(note.content);
    lastSavedContent.current = note.content;
    
    // 直接设置textarea的值，避免通过React状态更新 
    setTimeout(() => {
      if (editorRef.current) {
        // 设置内容
        editorRef.current.value = note.content;
        
        // 确保聚焦
        editorRef.current.focus();
        
        // 手动触发提取标题
        extractHeadingsFromContent(note.content);
      }
    }, 10);
  };

  // 滚动到文档内锚点
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 更新备忘录标题
  const updateNoteTitle = async (noteId: string, newTitle: string) => {
    try {
      const updatedNote = await updateNote(noteId, {
        title: newTitle
      });
      
      if (updatedNote) {
        // 更新列表中的备忘录
        setNotes(notes.map(note => 
          note.id === noteId ? {...note, title: newTitle} : note
        ));
        
        // 如果是当前选中的备忘录，也更新选中状态
        if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({...selectedNote, title: newTitle});
        }
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

  // 处理编辑器内容变化 - 最小化状态更新
  const handleEditorChange = (content: string) => {
    // 仅在内容真正变化时更新状态，避免不必要的渲染
    if (content !== editorContent) {
      setEditorContent(content);
    }
    
    // 只有当我们不是正在疯狂输入时才应用防抖更新
    if (extractHeadingsDebounced.current) {
      clearTimeout(extractHeadingsDebounced.current);
    }
    
    extractHeadingsDebounced.current = setTimeout(() => {
      // 只有内容真正变化时才处理
      if (content !== lastSavedContent.current) {
        // 提取标题
        extractHeadingsFromContent(content);
        
        // 如果有选中的笔记，执行自动保存 - 使用静默保存减少UI干扰
        if (selectedNote) {
          saveEditedNote(true);
        }
      }
      
      extractHeadingsDebounced.current = null;
    }, 5000); // 延长延迟时间，减少后台操作频率
  };

  // 保存编辑后的备忘录
  const saveEditedNote = async (silent: boolean = false) => {
    if (!selectedNote) return;

    try {
      // 从内容中提取第一个H1作为标题
      let newTitle = selectedNote.title;
      const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(editorContent);
      if (h1Match && h1Match[1]) {
        newTitle = h1Match[1].trim();
      }
      
      // 更新最后保存的内容引用
      lastSavedContent.current = editorContent;

      const updatedNote = await updateNote(selectedNote.id, {
        title: newTitle,
        content: editorContent,
      });

      if (updatedNote) {
        // 更新列表中的笔记
        setNotes(notes.map((note) => (note.id === selectedNote.id ? updatedNote : note)));
        // 更新选中的笔记
        setSelectedNote(updatedNote);
        
        // 仅在非静默模式下显示成功提示
        if (!silent) {
        toast({
          title: "保存成功",
          description: "备忘录已更新",
          });
        }
      }
    } catch (error) {
      console.error("Error updating note:", error);
      // 仅在非静默模式下显示错误提示
      if (!silent) {
      toast({
        title: "更新失败",
        description: "无法更新备忘录，请稍后再试",
        variant: "destructive",
        });
    }
  }
  };

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

  // 完全原始方式实现编辑器，避免React渲染干扰焦点
  const Editor = ({ 
    content, 
    onChange, 
    setEditorRef 
  }: { 
    content: string, 
    onChange: (content: string) => void,
    setEditorRef?: (ref: HTMLDivElement | null) => void
  }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef(content);
    const onChangeRef = useRef(onChange);
    const localIsComposing = useRef(false);
    const ignoreNextUpdate = useRef(false);
    const isFocused = useRef(false);
    const forceKeepFocus = useRef(false);
    const lastContentState = useRef(''); // 跟踪最后的内容状态，避免重复更新
    const lastSelectionRange = useRef<Range | null>(null); // 用于保存光标位置
    
    // 新增：强制恢复焦点的函数
    const ensureFocus = () => {
      if (editorRef.current && forceKeepFocus.current) {
        editorRef.current.focus();
      }
    };

    useEffect(() => {
      contentRef.current = content;
      onChangeRef.current = onChange;
    }, [content, onChange]);
    
    // 初始加载后自动聚焦
    useEffect(() => {
      const editor = editorRef.current;
      if (editor) {
        // 延迟聚焦以确保组件完全渲染
        setTimeout(() => {
          editor.focus();
          forceKeepFocus.current = true; // 设置强制保持焦点标志
        }, 100);
      }
    }, []);
    
    // 保存和恢复选择区域
    const saveSelection = () => {
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.getRangeAt && sel.rangeCount) {
          lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
      }
    };
    
    const restoreSelection = () => {
      if (lastSelectionRange.current && window.getSelection) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(lastSelectionRange.current);
        }
      }
    };
    
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      
      // 初始化编辑器内容
      editor.innerHTML = contentRef.current;
      
      if (setEditorRef) {
        setEditorRef(editor);
      }
      
      const handleInput = () => {
        if (!editor) return;
        
        // 存储光标位置
        saveSelection();
        
        // 确保在输入时保持焦点
        ensureFocus();
        
        if (localIsComposing.current) {
          ignoreNextUpdate.current = true;
          return;
        }
        
        if (editor.innerHTML !== lastContentState.current) {
          lastContentState.current = editor.innerHTML;
          onChangeRef.current(editor.innerHTML);
          
          // 恢复光标位置
          requestAnimationFrame(() => {
            restoreSelection();
            ensureFocus();
          });
        }
      };
      
      const handleCompositionStart = () => {
        localIsComposing.current = true;
        isComposing.current = true;
      };
      
      const handleCompositionEnd = () => {
        // 延迟处理输入法完成事件，避免与input事件冲突
        setTimeout(() => {
          localIsComposing.current = false;
          isComposing.current = false;
          
          if (editor.innerHTML !== lastContentState.current) {
            lastContentState.current = editor.innerHTML;
            onChangeRef.current(editor.innerHTML);
          }
          
          // 确保在输入法完成后立即恢复焦点
          ensureFocus();
        }, 10);
      };
      
      // 处理键盘事件，特别是换行处理
      const handleKeyDown = (e: KeyboardEvent) => {
        // 确保在按键时保持焦点
        if (!isFocused.current) {
          editor.focus();
        }
        
        // 特殊处理Enter键，确保换行正常工作
        if (e.key === 'Enter' && !e.shiftKey) {
          // 让浏览器处理默认的换行行为
          // 不阻止默认行为
          
          // 存储光标位置以便恢复
          saveSelection();
          
          // 确保内容更新被触发
          setTimeout(() => {
            if (editor.innerHTML !== lastContentState.current) {
              lastContentState.current = editor.innerHTML;
              onChangeRef.current(editor.innerHTML);
            }
          }, 0);
        }
      };
      
      editor.addEventListener('input', handleInput);
      editor.addEventListener('compositionstart', handleCompositionStart);
      editor.addEventListener('compositionend', handleCompositionEnd);
      
      const handleFocus = () => {
        isFocused.current = true;
        forceKeepFocus.current = true; // 一旦获得焦点，就强制保持
        ignoreNextUpdate.current = true;
      };
      
      const handleBlur = (e: FocusEvent) => {
        // 只有当焦点移出编辑器区域到其他元素时才真正失去焦点
        // 检查是否是用户主动点击了其他元素
        if (e.relatedTarget && !editor.contains(e.relatedTarget as Node)) {
          setTimeout(() => {
            isFocused.current = false;
            // 如果是因为点击工具栏按钮等UI元素导致的，不要取消强制保持焦点
            if (!document.activeElement || 
                (document.activeElement.tagName !== 'BUTTON' && 
                 !document.activeElement.classList.contains('editor-ui'))) {
              forceKeepFocus.current = false;
            }
          }, 100);
        } else {
          // 如果只是暂时性的失去焦点，立即恢复
          setTimeout(() => {
            if (forceKeepFocus.current) {
              ensureFocus();
            }
          }, 10);
        }
      };
      
      // 定时检查焦点状态并自动恢复
      const focusInterval = setInterval(() => {
        if (forceKeepFocus.current && !isFocused.current && 
            document.activeElement !== editor) {
          ensureFocus();
        }
      }, 300);
      
      // 处理鼠标事件，确保鼠标点击后立即聚焦
      const handleMouseDown = () => {
        forceKeepFocus.current = true;
        ensureFocus();
        
        // 存储光标位置
        requestAnimationFrame(() => {
          saveSelection();
        });
      };
      
      editor.addEventListener('focus', handleFocus);
      editor.addEventListener('blur', handleBlur);
      editor.addEventListener('keydown', handleKeyDown);
      editor.addEventListener('mousedown', handleMouseDown);
      
      // 观察DOM变化，在可能影响焦点的DOM变化后恢复焦点
      const observer = new MutationObserver(() => {
        if (forceKeepFocus.current) {
          ensureFocus();
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      return () => {
        editor.removeEventListener('input', handleInput);
        editor.removeEventListener('compositionstart', handleCompositionStart);
        editor.removeEventListener('compositionend', handleCompositionEnd);
        editor.removeEventListener('focus', handleFocus);
        editor.removeEventListener('blur', handleBlur);
        editor.removeEventListener('keydown', handleKeyDown);
        editor.removeEventListener('mousedown', handleMouseDown);
        clearInterval(focusInterval);
        observer.disconnect();
        
        if (setEditorRef) {
          setEditorRef(null);
        }
      };
    }, []);
    
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor || editor.innerHTML === content || content === lastContentState.current) return;
      
      if (ignoreNextUpdate.current) {
        ignoreNextUpdate.current = false;
        return;
      }
      
      // 仅在特定条件下更新内容
      if (document.activeElement !== editor || !localIsComposing.current) {
        // 保存当前选择范围和滚动位置
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        // 保存光标位置
        saveSelection();
        
        const scrollTop = editor.scrollTop;
        
        // 保存当前是否有焦点的状态
        const hasFocus = document.activeElement === editor;
        
        // 更新内容
        lastContentState.current = content;
        editor.innerHTML = content;
        
        // 恢复焦点、选择范围和滚动位置
        if (hasFocus) {
          editor.focus();
          
          // 恢复光标位置
          restoreSelection();
          
          editor.scrollTop = scrollTop;
          
          // 确保在内容更新后仍然保持焦点
          requestAnimationFrame(() => {
            ensureFocus();
          });
        }
      }
    }, [content]);
    
    return (
      <div
        ref={editorRef}
        contentEditable
        spellCheck={false}
        suppressContentEditableWarning
        className="min-h-[calc(100vh-15rem)] w-full p-4 border rounded-md focus:ring-0 focus-visible:outline-none"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: 1.6,
          fontSize: '1rem',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          overflowY: 'auto',
        }}
        onClick={() => {
          forceKeepFocus.current = true;
          if (editorRef.current) {
            editorRef.current.focus();
          }
          // 保存光标位置
          requestAnimationFrame(() => {
            saveSelection();
          });
        }}
        onPointerDown={() => {
          forceKeepFocus.current = true;
        }}
      />
    );
  };

  // 直接操作DOM的方式插入格式化内容
  const insertFormattedContent = (formatType: string) => {
    if (!document.activeElement?.matches('[contenteditable="true"]')) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    let element: HTMLElement | null = null;
    
    switch(formatType) {
      case 'h1':
        element = document.createElement('h1');
        element.textContent = selectedText || '大标题';
        break;
      case 'h2':
        element = document.createElement('h2');
        element.textContent = selectedText || '中标题';
        break;
      case 'h3':
        element = document.createElement('h3');
        element.textContent = selectedText || '小标题';
        break;
      case 'h4':
        element = document.createElement('h4');
        element.textContent = selectedText || '小标题';
        break;
      case 'code':
        const pre = document.createElement('pre');
        element = document.createElement('code');
        element.textContent = selectedText || '代码块';
        pre.appendChild(element);
        element = pre;
        break;
      case 'table':
        element = document.createElement('div');
        element.innerHTML = `<table>
  <tr>
    <th>标题1</th>
    <th>标题2</th>
    <th>标题3</th>
  </tr>
  <tr>
    <td>内容1</td>
    <td>内容2</td>
    <td>内容3</td>
  </tr>
</table>`;
        break;
      case 'hr':
        element = document.createElement('hr');
        break;
      case 'link':
        element = document.createElement('a');
        element.setAttribute('href', 'https://example.com');
        element.textContent = selectedText || '链接文本';
        break;
      case 'bookmark':
        element = document.createElement('span');
        element.setAttribute('id', `bookmark-${Date.now()}`);
        element.textContent = selectedText || '锚点';
        break;
      case 'checkbox':
        element = document.createElement('div');
        if (selectedText) {
          const lines = selectedText.split('\n');
          element.innerHTML = lines.map(line => `<div><input type="checkbox" id="task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}" /> ${line}</div>`).join('');
        } else {
          element.innerHTML = `<div><input type="checkbox" id="task-${Date.now()}" /> 待办事项</div>`;
        }
        break;
      case 'ordered-list':
        element = document.createElement('ol');
        if (selectedText) {
          const lines = selectedText.split('\n').filter(line => line.trim() !== '');
          element.innerHTML = lines.map(line => `<li>${line}</li>`).join('');
        } else {
          element.innerHTML = '<li>有序列表项</li><li>有序列表项</li><li>有序列表项</li>';
        }
        break;
      case 'unordered-list':
        element = document.createElement('ul');
        if (selectedText) {
          const lines = selectedText.split('\n').filter(line => line.trim() !== '');
          element.innerHTML = lines.map(line => `<li>${line}</li>`).join('');
        } else {
          element.innerHTML = '<li>无序列表项</li><li>无序列表项</li><li>无序列表项</li>';
        }
        break;
      default:
        return;
    }
    
    if (!element) return;
    
    // 清除当前选择内容
    range.deleteContents();
    
    // 插入新元素
    range.insertNode(element);
    
    // 将光标放在插入的元素之后
    range.setStartAfter(element);
    range.setEndAfter(element);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 触发编辑器的input事件，确保内容更新
    const inputEvent = new Event('input', { bubbles: true });
    document.activeElement?.dispatchEvent(inputEvent);
    
    // 手动触发内容更新
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorContent(newContent);
      lastSavedContent.current = newContent;
      
      // 确保提取标题逻辑被触发
      if (extractHeadingsDebounced.current) {
        clearTimeout(extractHeadingsDebounced.current);
      }
      extractHeadingsFromContent(newContent);
    }
    
    // 确保编辑器保持焦点
    setTimeout(() => {
      if (document.activeElement?.matches('[contenteditable="true"]')) {
        (document.activeElement as HTMLElement).focus();
      }
    }, 10);
  };

  // 新增：打开编辑模式函数
  const startEditingTitle = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteTitle(note.title);
    setIsEditingTitle(true);
    setShouldKeepEditingFocus(true);
    
    // 延迟聚焦以确保输入框已渲染
    setTimeout(() => {
      const inputElement = document.querySelector(`input[data-note-id="${note.id}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 50);
  };
  
  // 新增：完成编辑函数
  const finishEditingTitle = (noteId: string, save: boolean = true) => {
    if (save) {
      updateNoteTitle(noteId, editingNoteTitle);
    }
    setEditingNoteId(null);
    setIsEditingTitle(false);
    setShouldKeepEditingFocus(false);
  };

  // 处理点击事件，检查是否点击了编辑框外部
  useEffect(() => {
    if (!editingNoteId) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      // 如果正在使用输入法编辑，不关闭
      if (isTitleComposing.current) return;
      
      // 获取当前正在编辑的输入框元素
      const inputElement = document.querySelector(`input[data-note-id="${editingNoteId}"]`) as HTMLInputElement;
      
      // 如果点击的不是输入框或其子元素，则关闭编辑框
      if (inputElement && !inputElement.contains(event.target as Node)) {
        updateNoteTitle(editingNoteId, editingNoteTitle);
        setEditingNoteId(null);
        setIsEditingTitle(false);
      }
    };
    
    // 延迟添加事件监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);
    
    // 创建一个间隔检查，确保输入框始终保持聚焦
    const focusCheckInterval = setInterval(() => {
      const inputElement = document.querySelector(`input[data-note-id="${editingNoteId}"]`) as HTMLInputElement;
      if (inputElement && document.activeElement !== inputElement) {
        inputElement.focus();
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      clearInterval(focusCheckInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingNoteId, editingNoteTitle]);

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
    <main className="w-full h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* 主侧边栏：笔记列表 */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r h-full">
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
            <ScrollArea className="flex-grow h-full">
              {filteredNotes.length > 0 ? (
                <div className="space-y-1 p-2">
                  {activeTab === "titles" ? (
                    // 按标题列表显示
                    filteredNotes
                      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                      .map((note) => (
                        <div 
                          key={note.id} 
                          className={`p-3 rounded cursor-pointer hover:bg-muted transition-colors ${selectedNote?.id === note.id ? 'bg-muted' : ''}`}
                          onClick={() => selectNote(note)}
                        >
                          <div className="flex items-start justify-between">
                            {editingNoteId === note.id ? (
                              <Input
                                ref={titleInputRef}
                                autoFocus
                                data-note-id={note.id}
                                className="text-sm font-medium"
                                value={editingNoteTitle}
                                onChange={(e) => setEditingNoteTitle(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    updateNoteTitle(note.id, editingNoteTitle);
                                    setEditingNoteId(null);
                                    setIsEditingTitle(false);
                                  } else if (e.key === 'Escape') {
                                    setEditingNoteId(null);
                                    setIsEditingTitle(false);
                                  }
                                }}
                                onFocus={() => setIsEditingTitle(true)}
                                onCompositionStart={() => {
                                  isTitleComposing.current = true;
                                }}
                                onCompositionEnd={() => {
                                  isTitleComposing.current = false;
                                }}
                              />
                            ) : (
                              <h3 
                                className="font-medium text-sm break-words mr-2 flex-grow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNoteId(note.id);
                                  setEditingNoteTitle(note.title);
                                  setIsEditingTitle(true);
                                  
                                  // 延迟聚焦以确保输入框已渲染
                                  setTimeout(() => {
                                    const inputElement = document.querySelector(`input[data-note-id="${note.id}"]`) as HTMLInputElement;
                                    if (inputElement) {
                                      inputElement.focus();
                                    }
                                  }, 50);
                                }}
                              >
                                {note.title || "请输入标题"}
                              </h3>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => {
                              e.stopPropagation();
                              deleteNoteItem(note.id);
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                            <span>创建: {formatShortDate(note.created_at)}</span>
                            <span>修改: {formatShortDate(note.updated_at)}</span>
                          </div>
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
                            className={`p-3 rounded cursor-pointer hover:bg-muted transition-colors ${selectedNote?.id === note.id ? 'bg-muted' : ''}`}
                            onClick={() => selectNote(note)}
                          >
                            <div className="flex items-start justify-between">
                              {editingNoteId === note.id ? (
                                <Input
                                  ref={titleInputRef}
                                  autoFocus
                                  data-note-id={note.id}
                                  className="text-sm font-medium"
                                  value={editingNoteTitle}
                                  onChange={(e) => setEditingNoteTitle(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updateNoteTitle(note.id, editingNoteTitle);
                                      setEditingNoteId(null);
                                      setIsEditingTitle(false);
                                    } else if (e.key === 'Escape') {
                                      setEditingNoteId(null);
                                      setIsEditingTitle(false);
                                    }
                                  }}
                                  onFocus={() => setIsEditingTitle(true)}
                                  onCompositionStart={() => {
                                    isTitleComposing.current = true;
                                  }}
                                  onCompositionEnd={() => {
                                    isTitleComposing.current = false;
                                  }}
                                />
                              ) : (
                                <h3 
                                  className="font-medium text-sm break-words mr-2 flex-grow"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingNoteId(note.id);
                                    setEditingNoteTitle(note.title);
                                    setIsEditingTitle(true);
                                    
                                    // 延迟聚焦以确保输入框已渲染
                                    setTimeout(() => {
                                      const inputElement = document.querySelector(`input[data-note-id="${note.id}"]`) as HTMLInputElement;
                                      if (inputElement) {
                                        inputElement.focus();
                                      }
                                    }, 50);
                                  }}
                                >
                                  {note.title || "请输入标题"}
                                </h3>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => {
                                e.stopPropagation();
                                deleteNoteItem(note.id);
                              }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                              <span>创建: {formatShortDate(note.created_at)}</span>
                              <span>修改: {formatShortDate(note.updated_at)}</span>
                            </div>
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
        <ResizablePanel defaultSize={65} className="h-full">
            {selectedNote ? (
            <div className="flex flex-col h-full">
              {/* 编辑器内容区 - 占据整个面板 */}
              <div className="flex-1 overflow-auto h-full">
                {/* 编辑器工具栏放在编辑区域内部 - 固定在顶部 */}
                <div className="sticky top-0 bg-background z-10 border-b py-2 px-4 flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-2 mr-4">
                    <ToggleGroup type="single" defaultValue="h1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem 
                              value="h1" 
                              aria-label="大标题"
                              onClick={() => insertFormattedContent('h1')}
                            >
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
                            <ToggleGroupItem 
                              value="h2" 
                              aria-label="中标题"
                              onClick={() => insertFormattedContent('h2')}
                            >
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
                            <ToggleGroupItem 
                              value="h3" 
                              aria-label="小标题"
                              onClick={() => insertFormattedContent('h3')}
                            >
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
                            <ToggleGroupItem 
                              value="h4" 
                              aria-label="小标题"
                              onClick={() => insertFormattedContent('h4')}
                            >
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('code')}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入代码块</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('checkbox')}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入待办事项</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('ordered-list')}
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入有序列表</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('unordered-list')}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入无序列表</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('table')}
                          >
                            <Table className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入表格</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('hr')}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入分割线</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('link')}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>插入链接</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => insertFormattedContent('bookmark')}
                          >
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
                    <Button onClick={() => saveEditedNote(false)} size="sm">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>
                
                {/* 编辑器主体内容 - 移除了标题编辑区域 */}
                <div className="p-4">
                    <Editor 
                      content={editorContent}
                      onChange={handleEditorChange}
                    setEditorRef={(ref) => {
                      editorRef.current = ref as unknown as HTMLTextAreaElement;
                    }}
                    />
                  </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
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
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* 文档目录侧边栏 - 作为独立面板 */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={20} className="border-l h-full">
          {selectedNote ? (
            <div className="h-full flex flex-col">
              <div className="p-2 border-b flex-shrink-0">
                <h3 className="text-sm font-medium flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                        文档目录
                      </h3>
              </div>
                      
                      {/* 从文档内容中提取的标题列表，作为目录 */}
              <ScrollArea className="flex-grow py-1 px-2">
                <div className="space-y-0.5 text-xs">
                          {documentHeadings.length > 0 ? (
                            documentHeadings.map((heading, index) => (
                              <div 
                                key={index}
                        className="py-0.5 cursor-pointer hover:bg-muted truncate"
                        style={{ paddingLeft: `${heading.level * 6}px` }}
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
              
              <div className="p-2 border-t mt-auto flex-shrink-0">
                <h3 className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                        文档信息
                      </h3>
                <div className="space-y-1 mt-1 text-xs text-muted-foreground">
                  <p>创建: {formatShortDate(selectedNote.created_at)}</p>
                  <p>更新: {formatShortDate(selectedNote.updated_at)}</p>
                  <p>字数: {editorContent.replace(/<[^>]*>/g, '').length}</p>
                      </div>
                    </div>
                  </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-muted-foreground px-2">
                选择或创建一个备忘录来显示目录
              </p>
              </div>
            )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}

