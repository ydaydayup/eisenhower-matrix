"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { PlusCircle, Edit, Trash2, Search, FileText, Clock, Type, Code, Table, Minus, Link as LinkIcon, FileIcon, AlignLeft, Folder, CalendarDays, Hash, Bookmark, AlignJustify, CheckSquare, ListOrdered, List, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { getUserSession } from "@/lib/auth"
import { type Note, getUserNotes, createNote, updateNote, deleteNote } from "@/lib/notes"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { cookies } from 'next/headers';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import React from 'react'

// 导入我们的安全包装器组件
import QuillEditorWrapper from './QuillEditorWrapper';

// 动态导入编辑器样式组件
const QuillStyles = dynamic(() => 
  import('@/app/dashboard/components/quill-editor').then(mod => mod.QuillStyles), 
  { ssr: false }
);

// 定义标题项的类型
interface Heading {
  id: string;
  text: string;
  level: number;
}

// NoSSR组件，用于防止在服务器端渲染时出错
function NoSSR({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return null;
  }
  
  return <>{children}</>;
}

// 安全DOM操作函数
function safeDOM(callback: () => void): void {
  if (typeof window !== 'undefined') {
    // 在下一个微任务中安排执行，确保DOM已经渲染
    Promise.resolve().then(() => {
      try {
        callback();
      } catch (e) {
        console.error('Error executing DOM operation:', e);
      }
    });
  }
}

// 创建一个完全客户端渲染的组件
const NotesPageClient = () => {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentHeadings, setDocumentHeadings] = useState<Heading[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteStatus, setNoteStatus] = useState<'ready' | 'saving' | 'saved'>('ready');
  const lastSavedContent = useRef('');
  const extractHeadingsDebounced = useRef<any>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const isExtractingHeadings = useRef(false);
  const isComposing = useRef(false);
  const isTitleComposing = useRef(false);
  const [activeTab, setActiveTab] = useState<"titles" | "time">("titles");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [isBrowser, setIsBrowser] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 添加一个ref来保存当前正在处理的备忘录的ID，确保操作的是同一个备忘录
  const processingNoteRef = useRef<string | null>(null);
  const selectionInProgressRef = useRef(false);
  
  // 添加一个状态来保存最后编辑的标题，用于新建备忘录时
  const [lastEditedTitle, setLastEditedTitle] = useState<string>("新建备忘录");
  
  // 确保组件挂载后再执行依赖DOM的操作
  useEffect(() => {
    setMounted(true);
    setIsBrowser(true);
  }, []);

  // 添加防抖函数工具
  const debounce = (func: Function, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        func(...args);
      }, wait);
    };
  };
  
  // 添加一个用于本地备份的工具函数
  const saveToLocalBackup = useCallback((noteId: string, content: string) => {
    if (!mounted || typeof window === 'undefined') return;
    
    try {
      const backupKey = `note_backup_${noteId}`;
      const backupData = JSON.stringify({
        content,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(backupKey, backupData);
    } catch (error) {
      console.error('保存本地备份失败:', error);
    }
  }, [mounted]);
  
  // 从本地恢复备份的函数
  const loadFromLocalBackup = useCallback((noteId: string): string | null => {
    if (!mounted || typeof window === 'undefined') return null;
    
    try {
      const backupKey = `note_backup_${noteId}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) return null;
      
      const { content, timestamp } = JSON.parse(backupData);
      const backupTime = new Date(timestamp);
      const now = new Date();
      
      // 检查备份是否在24小时内
      const isRecent = (now.getTime() - backupTime.getTime()) < (24 * 60 * 60 * 1000);
      
      if (isRecent) {
        console.log(`发现本地备份 (${new Date(timestamp).toLocaleString()})，准备恢复`);
        return content;
      } else {
        // 清除过期备份
        localStorage.removeItem(backupKey);
        return null;
      }
    } catch (error) {
      console.error('加载本地备份失败:', error);
      return null;
    }
  }, [mounted]);
  
  // 清除本地备份
  const clearLocalBackup = useCallback((noteId: string) => {
    if (!mounted || typeof window === 'undefined') return;
    
    try {
      const backupKey = `note_backup_${noteId}`;
      localStorage.removeItem(backupKey);
    } catch (error) {
      console.error('清除本地备份失败:', error);
    }
  }, [mounted]);

  // 封装提取标题函数以避免循环依赖
  const extractHeadingsStable = useCallback((content: string) => {
    if (!mounted || typeof window === 'undefined' || !editorRef.current || isExtractingHeadings.current) return;
    
    try {
      isExtractingHeadings.current = true;
      
      // 从Quill编辑器中获取内容并提取标题
      const editor = editorRef.current.getEditor();
      if (!editor) {
        isExtractingHeadings.current = false;
        return;
      }
      
      const contents = editor.getContents();
      
      const headings: {id: string, text: string, level: number}[] = [];
      
      contents.ops?.forEach((op: any, index: number) => {
        if (op.attributes && op.attributes.header && typeof op.insert === 'string') {
          const id = `heading-${index}`;
          headings.push({
            id,
            text: op.insert.trim(),
            level: op.attributes.header
          });
        }
      });
      
      // 只有当标题列表与当前不同时才更新
      if (JSON.stringify(headings) !== JSON.stringify(documentHeadings)) {
        setDocumentHeadings(headings);
      }
      
      isExtractingHeadings.current = false;
    } catch (error) {
      console.error('提取标题失败:', error);
      isExtractingHeadings.current = false;
    }
  }, [mounted, documentHeadings, editorRef]);
  
  // 修改处理编辑器内容变更的函数，增加本地备份功能
  const handleEditorChangeDebounced = useMemo(() => debounce((content: string) => {
    if (!mounted || !selectedNote) return;
    
    console.log("编辑器内容变更 (防抖触发)");
    
    // 自动保存和提取标题逻辑
    if (selectedNote && content !== lastSavedContent.current) {
      // 提取标题用于目录显示，但不更新备忘录标题
      extractHeadingsStable(content);
      
      // 每次内容变更时创建本地备份
      try {
        const backupKey = `note_backup_${selectedNote.id}`;
        const backupData = JSON.stringify({
          content,
          timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(backupKey, backupData);
      } catch (error) {
        console.error('保存本地备份失败:', error);
      }
      
      // 自动保存
      console.log("触发自动保存...");
      if (selectedNote) {
        // 如果内容没有变化，无需保存
        if (lastSavedContent.current === content) return;
        
        setNoteStatus('saving');
        
        // 确保使用正确的备忘录ID
        const currentNoteId = selectedNote.id;
        
        // 更新最后保存的内容引用
        lastSavedContent.current = content;
        
        // 使用当前标题，不自动提取
        const newTitle = selectedNote.title;
        
        updateNote(currentNoteId, {
          title: newTitle,
          content: content,
        }).then(updatedNote => {
          if (updatedNote && selectedNote && currentNoteId === selectedNote.id) {
            // 确保仍然是相同的备忘录
            // 更新成功后清除本地备份
            try {
              const backupKey = `note_backup_${currentNoteId}`;
              localStorage.removeItem(backupKey);
            } catch (error) {
              console.error('清除本地备份失败:', error);
            }
            
            // 更新列表中的笔记
            setNotes(prevNotes => 
              prevNotes.map((note) => (note.id === currentNoteId ? updatedNote : note))
            );
            
            // 更新选中的笔记
            setSelectedNote(updatedNote);
            
            setNoteStatus('ready');
          } else {
            console.warn("备忘录更新失败或已切换到其他备忘录，将保留本地备份");
            setNoteStatus('ready');
          }
        }).catch(error => {
          console.error("Error updating note:", error);
          setNoteStatus('ready');
        });
      }
    }
  }, 800), [mounted, selectedNote, extractHeadingsStable, lastSavedContent]);

  // 使用已创建的handleEditorChangeDebounced来构建saveEditedNoteStable
  const saveEditedNoteStable = useCallback((silent: boolean = false) => {
    if (!selectedNote || !editorContent) return;
    
    // 通过调用handleEditorChangeDebounced来重用保存逻辑
    handleEditorChangeDebounced(editorContent);
  }, [selectedNote, editorContent, handleEditorChangeDebounced]);

  // 更新原始handleEditorChange函数，使用防抖版本
  const handleEditorChange = (content: string) => {
    setEditorContent(content); // 立即更新UI
    handleEditorChangeDebounced(content); // 延迟处理保存操作
  };

  // 使用Quill API插入格式化内容
  const insertFormattedContent = (formatType: string) => {
    if (!editorRef.current) return;
    
    try {
      const quill = editorRef.current.getEditor();
      if (!quill) return;
      
      const selection = quill.getSelection(true);
      
      if (!selection) {
        quill.focus();
        return;
      }
      
      let index = selection.index;
      let length = selection.length;
      const selectedText = length > 0 ? quill.getText(index, length) : '';
      
      switch(formatType) {
        case 'h1':
          quill.format('header', 1);
          break;
        case 'h2':
          quill.format('header', 2);
          break;
        case 'h3':
          quill.format('header', 3);
          break;
        case 'h4':
          quill.format('header', 4);
          break;
        case 'code':
          if (length > 0) {
            quill.formatText(index, length, 'code-block', true);
          } else {
            quill.format('code-block', true);
          }
          break;
        case 'table':
          // 简单表格实现
          quill.deleteText(index, length);
          quill.insertText(index, '\n');
          quill.insertText(index + 1, '| 标题1 | 标题2 | 标题3 |\n|-------|-------|-------|\n| 内容1 | 内容2 | 内容3 |\n');
          quill.setSelection(index + 1, 0);
          break;
        case 'hr':
          // 简单分隔线实现
          quill.deleteText(index, length);
          quill.insertText(index, '\n');
          quill.insertText(index + 1, '----------');
          quill.setSelection(index + 12, 0);
          break;
        case 'link':
          // 插入链接
          if (length > 0) {
            quill.formatText(index, length, 'link', 'https://example.com');
          } else {
            quill.insertText(index, '链接文本', { 'link': 'https://example.com' });
            quill.setSelection(index + 4, 0);
          }
          break;
        case 'bookmark':
          // 书签/锚点功能
          quill.insertText(index, `#锚点${Date.now()}`, { 'background': '#f0f0f0' });
          break;
        case 'checkbox':
          // 插入复选框
          if (length > 0) {
            const lines = selectedText.split('\n');
            quill.deleteText(index, length);
            let insertedLength = 0;
            lines.forEach((line: string, i: number) => {
              if (line.trim()) {
                quill.insertText(index + insertedLength, '☐ ' + line + (i < lines.length - 1 ? '\n' : ''));
                insertedLength += line.length + 3;
              }
            });
          } else {
            quill.insertText(index, '☐ 待办事项');
            quill.setSelection(index + 6, 0);
          }
          break;
        case 'ordered-list':
          quill.format('list', 'ordered');
          break;
        case 'unordered-list':
          quill.format('list', 'bullet');
          break;
        default:
          return;
      }
      
      // 确保编辑器保持焦点
      setTimeout(() => {
        quill.focus();
      }, 10);
    } catch (error) {
      console.error('格式化内容时出错:', error);
    }
  };

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

  // 加载用户备忘录 - 增强版
  const loadUserNotes = async (userId: string, maxRetries = 3) => {
    if (!isBrowser) return; // 只在客户端执行
    
    // 定义一个变量来跟踪重试次数
    let retryCount = 0;
    
    // 定义一个重试函数
    const fetchWithRetry = async (): Promise<Note[]> => {
      try {
        console.log(`尝试加载用户备忘录... 尝试 ${retryCount + 1}/${maxRetries + 1}`);
        const userNotes = await getUserNotes(userId);
        
        if (!userNotes || userNotes.length === 0) {
          console.log('未获取到备忘录或备忘录为空');
        } else {
          console.log(`成功加载 ${userNotes.length} 条备忘录`);
        }
        
        return userNotes;
    } catch (error) {
        console.error(`加载备忘录失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          // 使用指数退避策略
          const delay = Math.min(500 * Math.pow(2, retryCount), 8000);
          console.log(`将在 ${delay}ms 后重试...`);
          
          return new Promise(resolve => {
            setTimeout(async () => {
              resolve(await fetchWithRetry());
            }, delay);
          });
        }
        
        // 所有重试都失败了
        throw error;
      }
    };
    
    try {
      setIsLoading(true);
      const userNotes = await fetchWithRetry();
      
      // 确保在组件挂载状态下更新
      if (mounted) {
        setNotes(userNotes);
        
        // 默认选择第一个备忘录，但要避免重复选择
        if (userNotes.length > 0 && (!selectedNote || selectedNote.id !== userNotes[0].id)) {
          console.log('自动选择第一个备忘录');
          
          // 使用我们增强的选择函数
          selectNote(userNotes[0], true); // 传入true表示这是初始加载，不需要保存当前备忘录
        } else if (userNotes.length === 0) {
          // 如果没有备忘录，确保清空选择状态
          setSelectedNote(null);
          setEditorContent("");
          lastSavedContent.current = "";
          setDocumentHeadings([]);
        }
      }
    } catch (error) {
      console.error("加载用户备忘录失败，已达最大重试次数:", error);
      if (mounted) {
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  };

  // 组件挂载和卸载时的事件处理
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 页面刷新前保存数据
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // 如果有未保存的更改，提示用户
        if (selectedNote && editorContent !== lastSavedContent.current) {
          console.log('检测到页面即将卸载，正在保存备忘录...');
          
          // 创建本地备份
          try {
            const backupKey = `note_backup_${selectedNote.id}`;
            const backupData = JSON.stringify({
              content: editorContent,
              timestamp: new Date().toISOString()
            });
            
            localStorage.setItem(backupKey, backupData);
          } catch (error) {
            console.error('保存本地备份失败:', error);
          }
          
          // 显示确认对话框
          e.preventDefault();
          e.returnValue = '您有未保存的更改，确定要离开吗？';
          return e.returnValue;
        }
      };
      
      // 页面可见性变化时的处理
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && selectedNote) {
          console.log('页面即将隐藏，自动保存备忘录...');
          // 页面隐藏前保存当前备忘录
          if (editorContent !== lastSavedContent.current) {
            try {
              const backupKey = `note_backup_${selectedNote.id}`;
              const backupData = JSON.stringify({
                content: editorContent,
                timestamp: new Date().toISOString()
              });
              
              localStorage.setItem(backupKey, backupData);
            } catch (error) {
              console.error('保存本地备份失败:', error);
            }
          }
        }
      };
      
      // 添加事件监听器
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // 组件卸载时清理
      return () => {
        console.log('组件卸载，清理资源...');
        
        // 移除事件监听器
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // 保存当前编辑的备忘录
        if (selectedNote && editorContent !== lastSavedContent.current) {
          console.log('组件卸载前保存备忘录...');
          try {
            const backupKey = `note_backup_${selectedNote.id}`;
            const backupData = JSON.stringify({
              content: editorContent,
              timestamp: new Date().toISOString()
            });
            
            localStorage.setItem(backupKey, backupData);
          } catch (error) {
            console.error('保存本地备份失败:', error);
          }
        }
      };
    }
    
    return undefined;
  }, [editorContent, lastSavedContent, selectedNote]);

  // 增强编辑器监控功能，确保编辑器初始化完成
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      console.log('监控编辑器初始化状态...');
      
      let isMounted = true; // 跟踪组件是否仍然挂载
      let editorInitialized = false;
      let attempts = 0;
      const maxAttempts = 20;
      
      // 检查编辑器是否已初始化
      const checkEditor = () => {
        if (!isMounted) return;
        
        if (editorRef.current) {
          console.log('编辑器已初始化完成');
          editorInitialized = true;
          clearInterval(checkInterval);
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn(`编辑器初始化检查达到最大尝试次数 (${maxAttempts})，停止检查`);
            clearInterval(checkInterval);
          }
        }
      };
      
      // 每200ms检查一次编辑器是否已初始化
      const checkInterval = setInterval(checkEditor, 200);
      
      // 组件卸载时清除定时器和状态
      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        console.log('编辑器监控已停止');
      };
    }
  }, [mounted]);
  
  // 定期自动保存功能
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
    
    // 如果有选中的备忘录且有内容，设置自动保存
    if (selectedNote && editorContent) {
      console.log('启动自动保存定时器...');
      
      autoSaveTimer = setInterval(() => {
        if (selectedNote && editorContent !== lastSavedContent.current) {
          console.log('定时自动保存触发...');
          saveEditedNoteStable(true); // 静默保存
        }
      }, 30000); // 每30秒自动保存一次
    }
    
    // 清理函数
    return () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        console.log('自动保存定时器已清除');
      }
    };
  }, [mounted, selectedNote, editorContent, lastSavedContent, saveEditedNoteStable]);

  // 修改选择备忘录函数，增加本地备份恢复功能
  const selectNote = (note: Note, initialLoad: boolean = false) => {
    if (!mounted || !note || !note.id) {
      console.log("无法选择备忘录: 组件未挂载或备忘录无效");
      return;
    }

    // 防止重复选择
    if (selectedNote && selectedNote.id === note.id) {
      console.log("已经选择了当前备忘录:", note.title);
      return;
    }
    
    // 防止并发选择操作
    if (selectionInProgressRef.current) {
      console.log("已有备忘录选择操作正在进行，忽略此次请求");
      return;
    }
    
    selectionInProgressRef.current = true;
    
    console.log("选择备忘录:", note.title, "ID:", note.id);

    try {
      // 设置当前正在处理的备忘录
      processingNoteRef.current = note.id;
      console.log(`设置当前处理中的备忘录ID: ${processingNoteRef.current}`);
      
      // 保存当前编辑的备忘录（如果有）并且不是初始加载
      if (!initialLoad && selectedNote && selectedNote.id && editorContent !== lastSavedContent.current) {
        console.log("保存当前编辑的备忘录:", selectedNote.id);
        
        // 先保存当前备忘录内容到本地备份
        try {
          const backupKey = `note_backup_${selectedNote.id}`;
          const backupData = JSON.stringify({
            content: editorContent,
            timestamp: new Date().toISOString()
          });
          
          localStorage.setItem(backupKey, backupData);
          
          // 使用当前内容更新备忘录
          updateNote(selectedNote.id, {
            title: selectedNote.title,
            content: editorContent,
          }).then(() => {
            // 清除备份
            localStorage.removeItem(backupKey);
          }).catch(error => {
            console.error("保存备忘录时出错:", error);
          });
        } catch (error) {
          console.error('保存本地备份失败:', error);
        }
      }

      // 创建一个本地副本，防止后续过程中状态变化
      const noteToSelect = { ...note };
      
      // 检查是否有本地备份可以恢复
      let localBackup = null;
      try {
        const backupKey = `note_backup_${noteToSelect.id}`;
        const backupData = localStorage.getItem(backupKey);
        
        if (backupData) {
          const { content, timestamp } = JSON.parse(backupData);
          const backupTime = new Date(timestamp);
          const now = new Date();
          
          // 检查备份是否在24小时内
          const isRecent = (now.getTime() - backupTime.getTime()) < (24 * 60 * 60 * 1000);
          
          if (isRecent) {
            console.log(`发现本地备份 (${new Date(timestamp).toLocaleString()})，准备恢复`);
            localBackup = content;
          } else {
            // 清除过期备份
            localStorage.removeItem(backupKey);
          }
        }
      } catch (error) {
        console.error('加载本地备份失败:', error);
      }
      
      const contentToUse = localBackup || noteToSelect.content;
      
      if (localBackup) {
        console.log("发现未保存的本地备份，使用本地备份内容");
      }
      
      // 更新内部状态，一次性完成，避免中间状态
      console.log("设置选中备忘录状态:", noteToSelect.id);
      
      // 优化状态更新顺序，避免内容混乱
      // 1. 先设置编辑器内容引用
      lastSavedContent.current = contentToUse;
      // 2. 然后设置选中的备忘录
      setSelectedNote(noteToSelect);
      // 3. 最后更新编辑器内容状态
      setEditorContent(contentToUse);
      
      // 使用上锁方式防止内容被覆盖
      let contentUpdateLock = noteToSelect.id;

      // 实现更强健的重试机制，最多尝试6次获取编辑器引用
      let retryCount = 0;
      const maxRetries = 6;
      let editorUpdateTimer: ReturnType<typeof setTimeout> | null = null;
      
      const trySetEditorContent = async () => {
        console.log(`尝试设置编辑器内容... 尝试 ${retryCount + 1}/${maxRetries}`);
        
        if (!mounted || typeof window === 'undefined') {
          console.log("组件未挂载或不在浏览器环境，中止设置");
          selectionInProgressRef.current = false;
          return;
        }
        
        // 检查处理的备忘录是否匹配
        if (processingNoteRef.current !== noteToSelect.id || contentUpdateLock !== noteToSelect.id) {
          console.warn(`当前处理的备忘录ID (${processingNoteRef.current}) 与选中的ID (${noteToSelect.id}) 不匹配，中止设置`);
          selectionInProgressRef.current = false;
          return;
        }

        try {
          if (editorRef.current) {
            const editor = editorRef.current.getEditor();
            console.log("成功获取编辑器引用:", !!editor);
            
            if (editor && editor.root) {
              console.log("清空当前编辑器内容");
              editor.setText('');
              
              // 再次检查锁，确保没有其他选择操作干扰
              if (contentUpdateLock !== noteToSelect.id) {
                console.warn("内容锁不匹配，操作已被取消");
                selectionInProgressRef.current = false;
                return;
              }
              
              // 使用本地副本而不是依赖可能变化的状态
              console.log(`准备设置编辑器内容，备忘录ID: ${noteToSelect.id}`);
              try {
                // 使用dangerouslyPasteHTML设置内容
                editor.clipboard.dangerouslyPasteHTML(contentToUse || '');
                
                // 提取标题
                console.log("提取内容中的标题");
                extractHeadingsStable(contentToUse);
                
                // 设置聚焦
                console.log("设置编辑器聚焦");
                setTimeout(() => {
                  if (contentUpdateLock === noteToSelect.id && editor) {
                    try {
                      editor.focus();
                    } catch (focusError) {
                      console.error("编辑器聚焦时出错:", focusError);
                    }
                  }
                }, 150);
                
                console.log("备忘录内容设置完成:", noteToSelect.id);
                
                // 清除任何待处理的重试
                if (editorUpdateTimer) {
                  clearTimeout(editorUpdateTimer);
                  editorUpdateTimer = null;
                }
                
                // 完成选择操作
                selectionInProgressRef.current = false;
              } catch (contentError) {
                console.error("设置编辑器内容时出错:", contentError);
                retryIfNeeded();
              }
            } else {
              console.error("编辑器实例不完整");
              retryIfNeeded();
            }
          } else {
            console.error("编辑器引用不存在");
            retryIfNeeded();
          }
        } catch (error) {
          console.error("切换备忘录时出错:", error);
          retryIfNeeded();
        }
      };
      
      const retryIfNeeded = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(300 * retryCount, 1500); // 指数退避，但最长不超过1.5秒
          console.log(`将在 ${delay}ms 后重试设置编辑器内容，尝试 ${retryCount}/${maxRetries}`);
          editorUpdateTimer = setTimeout(trySetEditorContent, delay);
        } else {
          console.error("设置编辑器内容失败，已达到最大重试次数");
          selectionInProgressRef.current = false; // 重置选择状态
          processingNoteRef.current = null;       // 清除处理状态
          contentUpdateLock = '';                 // 释放内容锁
        }
      };

      // 增加延迟等待编辑器初始化完成
      setTimeout(() => {
        if (editorRef.current) {
          console.log("编辑器已就绪，立即设置内容");
          trySetEditorContent();
        } else {
          console.log("编辑器未就绪，等待并重试");
          // 如果编辑器尚未准备好，增加延迟
          editorUpdateTimer = setTimeout(trySetEditorContent, 300);
        }
      }, 100);
      
      // 确保及时清理处理状态
      setTimeout(() => {
        if (processingNoteRef.current === noteToSelect.id) {
          processingNoteRef.current = null;
          console.log(`清除处理中的备忘录ID，完成备忘录 ${noteToSelect.id} 的选择`);
        }
        if (selectionInProgressRef.current) {
          selectionInProgressRef.current = false;
          console.log("重置选择中状态标志");
        }
        if (contentUpdateLock === noteToSelect.id) {
          contentUpdateLock = '';
          console.log("释放内容更新锁");
        }
      }, 3000); // 3秒后强制清理，防止锁死
      
    } catch (err) {
      console.error("选择备忘录过程中出错:", err);
      processingNoteRef.current = null;
      selectionInProgressRef.current = false;
    }
  };

  // 滚动到文档内锚点
  const scrollToHeading = (id: string) => {
    safeDOM(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    });
  }

  // 修改 updateNoteTitle 函数，移除 toast 并保存最后编辑的标题
  const updateNoteTitle = async (noteId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      console.log("标题不能为空");
      return false;
    }

    // 更新本地状态UI立即响应
    const updatedNotes = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, title: newTitle };
      }
      return n;
    });
    
    setNotes(updatedNotes);
    
    // 设置为最后编辑的标题作为新建备忘录的初始标题
    setLastEditedTitle(newTitle);
    
    try {
      // 保存到数据库
      await updateNote(noteId, { title: newTitle, content: null });
      return true;
    } catch (error) {
      console.error('更新备忘录标题失败:', error);
      
      // 恢复原标题
      const revertNotes = notes.map(n => {
        if (n.id === noteId) {
          return { ...n, title: selectedNote?.title || newTitle };
        }
        return n;
      });
      
      setNotes(revertNotes);
      return false;
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
            extractHeadingsStable(updatedNotes[0].content)
          } else {
            setSelectedNote(null)
            setEditorContent("")
            setDocumentHeadings([])
          }
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error)
    }
  }

  // 过滤备忘录
  const filteredMemos = useMemo(() => {
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
    
    filteredMemos.forEach(note => {
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
  }, [filteredMemos]);

  // 修改时间展示格式函数，新增一个结合展示两个时间的函数
  const formatCombinedDate = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };
    
    const formattedCreated = formatDate(created);
    
    // 如果创建时间和更新时间是同一天，只显示创建时间
    if (formatDate(created) === formatDate(updated)) {
      return `创建: ${formattedCreated}`;
    }
    
    // 否则，显示两个时间
    return `创建: ${formattedCreated} (更新: ${formatDate(updated)})`;
  };

  // 为备忘录添加标题编辑模式
  const focusTitleInput = (noteId: string) => {
    if (!mounted) return;
    
    // 设置编辑模式
    setEditingNoteId(noteId);
    
    // 查找当前标题
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteTitle(note.title);
      
      // 延迟聚焦并全选
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 50);
    }
  };

  // 处理标题输入变化
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingNoteTitle(e.target.value);
  };

  // 处理标题输入键盘事件
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, noteId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (editingNoteTitle.trim()) {
        updateNoteTitle(noteId, editingNoteTitle);
      } else {
        // 如果标题为空，恢复原标题
        setEditingNoteTitle(notes.find(n => n.id === noteId)?.title || "");
        setEditingNoteId(null);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // 取消编辑，恢复原标题
      setEditingNoteTitle("");
      setEditingNoteId(null);
    }
  };

  // 处理标题输入框失去焦点事件
  const handleTitleBlur = (noteId: string) => {
    if (editingNoteTitle.trim()) {
      updateNoteTitle(noteId, editingNoteTitle);
    } else {
      // 如果标题为空，恢复原标题
      setEditingNoteTitle(notes.find(n => n.id === noteId)?.title || "");
      setEditingNoteId(null);
    }
  };

  // 修改 addNewNote 函数，使用最后编辑的标题
  const addNewNote = async () => {
    if (!user) {
      console.log("用户未登录，无法创建备忘录");
      return;
    }

    // 设置创建中状态
    setNoteStatus('saving');

    try {
      // 使用最后编辑的标题作为初始标题，如果没有则使用默认格式
      let initialTitle = lastEditedTitle;
      if (initialTitle === '新建备忘录') {
        const now = new Date();
        initialTitle = `备忘录 - ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }

      const { data, error } = await supabase
        .from('note')
        .insert({
          user_id: user.id,
          space_id: spaceId,
          title: initialTitle,
          content: '<p>开始撰写您的备忘录...</p>',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('服务器返回的数据为空');
      }

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      // 添加到列表并选择
      setNotes([newNote, ...notes]);
      
      // 清除编辑器状态并选择新备忘录
      setEditorContent('');
      setHeadings([]);
      
      // 恢复状态
      setNoteStatus('idle');
      
      // 选择新备忘录
      selectNote(newNote);
      
      // 聚焦标题输入
      setTimeout(() => {
        focusTitleInput(newNote.id);
      }, 100);
    } catch (error) {
      console.error('创建备忘录失败:', error);
      setNoteStatus('idle');
    }
  };

  // 原来的组件返回内容
  return (
    <NoSSR>
      {isBrowser && <QuillStyles />}
      <div className="w-full h-screen overflow-hidden relative bg-stone-50 dark:bg-slate-950">
        <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* 主侧边栏：笔记列表 */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r h-full">
          <div className="flex flex-col h-full">
            {/* 搜索和添加区 */}
            <div className="flex justify-between items-center p-3 border-b">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索备忘录..."
                  className="pl-8 h-9 text-sm bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-offset-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={addNewNote}
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 flex-shrink-0 ml-2 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors rounded-full"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            
            {/* 切换类型Tab */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "titles" | "time")} className="px-3 py-2">
              <TabsList className="grid w-full grid-cols-2 h-9 rounded-full bg-muted/40 p-0.5">
                <TabsTrigger value="titles" className="rounded-full text-xs">
                  <AlignLeft className="h-3.5 w-3.5 mr-2" />
                  标题
                </TabsTrigger>
                <TabsTrigger value="time" className="rounded-full text-xs">
                  <CalendarDays className="h-3.5 w-3.5 mr-2" />
                  时间
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* 备忘录列表 */}
            <ScrollArea className="flex-grow h-full">
              {filteredMemos.length > 0 ? (
                <div className="space-y-1.5 p-2">
                  {activeTab === "titles" ? (
                    // 按标题列表显示
                    filteredMemos
                      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                      .map((note) => (
                        <div 
                          key={note.id} 
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/70 hover:shadow-sm note-item
                            ${selectedNote?.id === note.id 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500 dark:border-l-blue-400 apple-shadow-sm' 
                              : 'bg-card/40 border-l-2 border-l-transparent'}`}
                          onClick={() => selectNote(note)}
                        >
                          <div className="flex items-start justify-between">
                            {editingNoteId === note.id ? (
                              <Input
                                ref={titleInputRef}
                                autoFocus
                                data-note-id={note.id}
                                className="text-sm font-medium h-7 px-2 py-1 border-0 bg-background/80 focus-visible:ring-1 focus-visible:ring-blue-500"
                                value={editingNoteTitle}
                                onChange={handleTitleChange}
                                onKeyDown={(e) => handleTitleKeyDown(e, note.id)}
                                onBlur={() => handleTitleBlur(note.id)}
                              />
                            ) : (
                              <h3 
                                className="font-medium text-sm break-words mr-2 flex-grow line-clamp-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNoteId(note.id);
                                  setEditingNoteTitle(note.title);
                                  setIsEditingTitle(true);
                                  
                                  // 延迟聚焦以确保输入框已渲染
                                  focusTitleInput(note.id);
                                }}
                              >
                                {note.title || "请输入标题"}
                              </h3>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 flex-shrink-0 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400" 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNoteItem(note.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center mt-1 text-xs text-muted-foreground">
                            <span>时间: {formatShortDate(note.updated_at)}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    // 按时间分组显示
                    notesByDate.map(({ date, notes }) => (
                      <div key={date} className="mb-4">
                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1.5">{date}</h3>
                        <div className="space-y-1.5">
                        {notes.map(note => (
                          <div 
                            key={note.id} 
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/70 hover:shadow-sm note-item
                              ${selectedNote?.id === note.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500 dark:border-l-blue-400 apple-shadow-sm' 
                                : 'bg-card/40 border-l-2 border-l-transparent'}`}
                            onClick={() => selectNote(note)}
                          >
                            <div className="flex items-start justify-between">
                              {editingNoteId === note.id ? (
                                <Input
                                  ref={titleInputRef}
                                  autoFocus
                                  data-note-id={note.id}
                                  className="text-sm font-medium h-7 px-2 py-1 border-0 bg-background/80 focus-visible:ring-1 focus-visible:ring-blue-500"
                                  value={editingNoteTitle}
                                  onChange={handleTitleChange}
                                  onKeyDown={(e) => handleTitleKeyDown(e, note.id)}
                                  onBlur={() => handleTitleBlur(note.id)}
                                />
                              ) : (
                                <h3 
                                  className="font-medium text-sm break-words mr-2 flex-grow line-clamp-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingNoteId(note.id);
                                    setEditingNoteTitle(note.title);
                                    setIsEditingTitle(true);
                                    
                                    // 延迟聚焦以确保输入框已渲染
                                    focusTitleInput(note.id);
                                  }}
                                >
                                  {note.title || "请输入标题"}
                                </h3>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 flex-shrink-0 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNoteItem(note.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <span>时间: {formatShortDate(note.updated_at)}</span>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12 px-4">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
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
                {/* 编辑器内容区 */}
                <div className="flex-1 overflow-auto h-full p-2">
                  {/* 编辑器主体内容 */}
                  <div className="h-full rounded-lg shadow-sm bg-white dark:bg-zinc-900 apple-shadow transition-all duration-200">
                    {/* 确保加载样式 */}
                    <QuillStyles />
                    <QuillEditorWrapper 
                      ref={editorRef}
                      content={editorContent}
                      onChange={handleEditorChange}
                      onHeadingsExtracted={(headings) => {
                        setDocumentHeadings(headings);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center p-8 max-w-md">
                  <FileIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-20 loading-pulse" />
                  <h2 className="mt-6 text-xl font-semibold">暂无选择的备忘录</h2>
                  <p className="text-muted-foreground mt-2 mb-6">选择一个备忘录或创建新备忘录</p>
                  <Button 
                    onClick={addNewNote}
                    className="rounded-full px-6 apple-button"
                    variant="outline"
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
                <div className="p-3 border-b flex-shrink-0 bg-muted/30">
                  <h3 className="text-sm font-medium flex items-center text-muted-foreground">
                    <Hash className="h-4 w-4 mr-1" />
                    文档目录
                  </h3>
                </div>
                      
                {/* 从文档内容中提取的标题列表，作为目录 */}
                <ScrollArea className="flex-grow py-2 px-2">
                  <div className="space-y-1 text-xs">
                    {documentHeadings.length > 0 ? (
                      documentHeadings.map((heading, index) => (
                        <div 
                          key={index}
                          className={`
                            pl-${heading.level * 2} pr-2 py-1.5 
                            hover:bg-muted/50 rounded-md cursor-pointer
                            transition-colors duration-200 transition-apple
                            ${heading.level === 1 ? 'font-medium' : ''}
                          `}
                          style={{ 
                            paddingLeft: `${heading.level * 0.5 + 0.5}rem` 
                          }}
                          onClick={() => scrollToHeading(heading.id)}
                        >
                          {heading.text}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>文档中没有标题</p>
                        <p className="mt-1 text-xs">添加标题以生成目录</p>
                      </div>
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
              <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10">
                <div className="text-center p-4">
                  <Hash className="h-6 w-6 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">未选择备忘录</p>
                </div>
              </div>
            )}
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </NoSSR>
  );
};

// 将整个页面包装在dynamic import中，完全禁用服务端渲染
export default dynamic(() => Promise.resolve(NotesPageClient), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">加载中...</p>
      </div>
    </div>
  )
});
