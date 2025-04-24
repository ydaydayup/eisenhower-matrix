"use client"

import dynamic from 'next/dynamic'
import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {AlignLeft, CalendarDays, Check, Clock, Edit, FileText, PlusCircle, Save, Search, Trash2, X} from "lucide-react"
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {useRouter} from "next/navigation"
import {getUserSession} from "@/lib/auth"
import {createNote, deleteNote, getUserNotes, type Note, updateNote} from "@/lib/notes"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable"

// 导入我们的安全包装器组件
import QuillEditorWrapper from './QuillEditorWrapper';
import AiEditorApp from "@/app/dashboard/components/AiEditor";

// 动态导入编辑器样式组件
const QuillStyles = dynamic(() =>
        import('@/app/dashboard/components/quill-editor').then(mod => mod.QuillStyles),
    {ssr: false}
);

// 定义标题项的类型
interface Heading {
    id: string;
    text: string;
    level: number;
}

// NoSSR组件，用于防止在服务器端渲染时出错
function NoSSR({children}: { children: React.ReactNode }) {
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

// 添加一个持久化用户会话的函数
const persistUserSession = (session: any) => {
    try {
        localStorage.setItem('cached_user_session', JSON.stringify(session));
    } catch (error) {
        console.error('保存会话缓存失败:', error);
    }
};

// 从本地恢复用户会话的函数
const recoverUserSession = (): any => {
    try {
        const cachedSession = localStorage.getItem('cached_user_session');
        return cachedSession ? JSON.parse(cachedSession) : null;
    } catch (error) {
        console.error('恢复会话缓存失败:', error);
        return null;
    }
};

// 在文件顶部添加类型定义
type SetEditorContent = (content: string) => void;

// 添加 reducer 相关的类型和实现
type EditorState = {
    content: string;
};

type EditorAction = {
    type: 'SET_CONTENT';
    payload: string;
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
    switch (action.type) {
        case 'SET_CONTENT':
            return {...state, content: action.payload};
        default:
            return state;
    }
};

// 创建一个完全客户端渲染的组件
const NotesPageClient = () => {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [editorState, dispatch] = useReducer(editorReducer, {content: ''});
    const [newTitle, setNewTitle] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [documentHeadings, setDocumentHeadings] = useState<Heading[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [noteStatus, setNoteStatus] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready');
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

    // 添加自动保存相关的状态和引用
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastAutoSaveContentRef = useRef<string>("");

    // 在组件的开头添加这些状态和引用
    const editorLoadedRef = useRef(false);
    const editorMountTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 在组件的状态定义部分添加以下状态
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
    const [isContentModified, setIsContentModified] = useState(false);

    // 确保组件挂载后再执行依赖DOM的操作
    useEffect(() => {
        setMounted(true);
        setIsBrowser(true);
    }, []);

    // 创建一个通用的防抖函数
    const createDebounce = (func: Function, wait: number) => {
        let timeout: NodeJS.Timeout | null = null;

        return (...args: any[]) => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => {
                timeout = null;
                func.apply(null, args);
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

            const {content, timestamp} = JSON.parse(backupData);
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

    // 添加保存笔记列表到本地存储的功能
    const persistNotesCache = useCallback((notesToCache: Note[]) => {
        if (!mounted || typeof window === 'undefined') return;

        try {
            localStorage.setItem('notes_cache', JSON.stringify(notesToCache));
        } catch (error) {
            console.error('保存笔记缓存失败:', error);
        }
    }, [mounted]);

    // 从本地恢复笔记列表
    const recoverNotesCache = useCallback((): Note[] => {
        if (!mounted || typeof window === 'undefined') return [];

        try {
            const cachedNotes = localStorage.getItem('notes_cache');
            return cachedNotes ? JSON.parse(cachedNotes) : [];
        } catch (error) {
            console.error('恢复笔记缓存失败:', error);
            return [];
        }
    }, [mounted]);

    // 优化提取标题的函数
    const extractHeadingsStable = useCallback(() => {
        if (!mounted || typeof window === 'undefined' || !editorRef.current || isExtractingHeadings.current) return;

        // 使用 requestIdleCallback 在浏览器空闲时提取标题
        const extractInIdleTime = () => {
            try {
                isExtractingHeadings.current = true;

                const editor = editorRef.current.getEditor();
                if (!editor) {
                    isExtractingHeadings.current = false;
                    return;
                }

                const contents = editor.getContents();
                const headings: { id: string, text: string, level: number }[] = [];

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
        };

        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(extractInIdleTime);
        } else {
            setTimeout(extractInIdleTime, 100);
        }
    }, [mounted, documentHeadings, editorRef]);

    // 修改 handleEditorChange 函数，跟踪内容修改状态
    const handleEditorChange = useCallback((content: string) => {
        dispatch({type: 'SET_CONTENT', payload: content});

        // 检查内容是否与上次保存的内容不同，设置修改状态
        if (content !== lastSavedContent.current) {
            setIsContentModified(true);
        } else {
            setIsContentModified(false);
        }

        // 使用 requestIdleCallback 在空闲时提取标题
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(extractHeadingsStable);
        } else {
            setTimeout(extractHeadingsStable, 100);
        }
    }, [extractHeadingsStable]);

    // 获取用户会话 - 增强版，添加本地会话恢复
    useEffect(() => {
        const checkSession = async () => {
            try {
                // 尝试从localStorage恢复之前的会话
                const cachedSession = typeof window !== 'undefined' ? localStorage.getItem('user_session') : null;

                // 如果有缓存的会话，先用它加载数据
                if (cachedSession) {
                    try {
                        const parsedSession = JSON.parse(cachedSession);
                        setUser(parsedSession);
                        // 尝试从LocalStorage恢复笔记列表
                        const cachedNotes = localStorage.getItem('notes_cache');
                        if (cachedNotes) {
                            const parsedNotes = JSON.parse(cachedNotes);
                            if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                                console.log('从缓存恢复了', parsedNotes.length, '条笔记');
                                setNotes(parsedNotes);

                                // 如果有选中的笔记，也恢复它
                                const lastSelectedId = localStorage.getItem('last_selected_note_id');
                                if (lastSelectedId) {
                                    const noteToSelect = parsedNotes.find(note => note.id === lastSelectedId);
                                    if (noteToSelect) {
                                        setSelectedNote(noteToSelect);
                                        // 其他状态会在selectNote中恢复
                                    }
                                } else if (parsedNotes.length > 0) {
                                    // 默认选中第一条
                                    setSelectedNote(parsedNotes[0]);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('恢复缓存会话失败:', e);
                    }
                }

                // 然后尝试获取新的会话
                const session = await getUserSession()
                if (!session) {
                    router.push("/login")
                    return
                }

                // 保存会话到localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user_session', JSON.stringify(session));
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

    // 加载用户备忘录 - 增强版，添加本地缓存
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
                    // 保存到本地缓存
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('notes_cache', JSON.stringify(userNotes));
                    }
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

                // 所有重试都失败了，尝试从localStorage获取缓存
                if (typeof window !== 'undefined') {
                    const cachedNotes = localStorage.getItem('notes_cache');
                    if (cachedNotes) {
                        try {
                            const parsedNotes = JSON.parse(cachedNotes);
                            if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                                console.log('从缓存恢复了', parsedNotes.length, '条笔记');
                                return parsedNotes;
                            }
                        } catch (e) {
                            console.error('解析缓存笔记失败:', e);
                        }
                    }
                }

                // 缓存也没有，抛出错误
                throw error;
            }
        };

        try {
            setIsLoading(true);
            const userNotes = await fetchWithRetry();

            // 确保在组件挂载状态下更新
            if (mounted) {
                setNotes(userNotes);

                // 记录当前选择的笔记
                if (selectedNote && typeof window !== 'undefined') {
                    localStorage.setItem('last_selected_note_id', selectedNote.id);
                }

                // 自动选择第一个备忘录
                if (userNotes.length > 0) {
                    console.log('自动选择第一个备忘录');
                    // 使用我们增强的选择函数，传入 true 表示这是初始加载
                    selectNote(userNotes[0], true);
                } else {
                    // 如果没有备忘录，确保清空选择状态
                    setSelectedNote(null);
                    dispatch({type: 'SET_CONTENT', payload: ''});
                    lastSavedContent.current = "";
                    setDocumentHeadings([]);
                }
            }
        } catch (error) {
            console.error("加载用户备忘录失败，已达最大重试次数:", error);
        } finally {
            if (mounted) {
                setIsLoading(false);
            }
        }
    };

    // 修改selectNote函数，确保备忘录数据隔离和正确保存
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

        // 如果有选择操作正在进行，强制重置它
        // 这样可以避免因为上一次操作未完成而阻止用户切换备忘录
        if (selectionInProgressRef.current) {
            console.log("正在重置上一次未完成的选择操作");
            selectionInProgressRef.current = false;
        }

        // 获取当前选择的备忘录的ID，用于保存操作
        const previousNoteId = selectedNote?.id;
        const currentContent = editorState.content;
        const isContentChanged = currentContent !== lastSavedContent.current;

        // 立即保存当前备忘录的内容（如果有更改）
        if (!initialLoad && previousNoteId && isContentChanged) {
            console.log(`保存上一个备忘录的内容 (ID: ${previousNoteId})...`);
            try {
                // 创建本地备份
                saveToLocalBackup(previousNoteId, currentContent);

                // 同步保存到数据库
                updateNote(previousNoteId, {
                    title: selectedNote?.title || "",
                    content: currentContent,
                }).then(() => {
                    // 保存成功后清除本地备份
                    clearLocalBackup(previousNoteId);
                    console.log(`备忘录 ${previousNoteId} 内容已保存`);
                    // 更新最后保存的内容
                    if (selectedNote?.id === previousNoteId) {
                        lastSavedContent.current = currentContent;
                    }
                }).catch(error => {
                    console.error(`保存备忘录 ${previousNoteId} 内容失败:`, error);
                    // 保存失败保留本地备份
                });
            } catch (error) {
                console.error(`准备保存备忘录 ${previousNoteId} 内容时出错:`, error);
                // 保存失败保留本地备份
            }
        }

        // 直接进行切换，不再等待保存完成
        // 标记选择操作开始
        selectionInProgressRef.current = true;

        // 设置安全超时，确保锁定状态最终会被释放
        const timeoutId = setTimeout(() => {
            if (selectionInProgressRef.current) {
                console.log("选择操作超时，强制重置锁定状态");
                selectionInProgressRef.current = false;
            }
        }, 5000); // 5秒超时

        // 更新当前处理的备忘录ID
        const targetNoteId = note.id;
        processingNoteRef.current = targetNoteId;

        // 立即更新UI状态，提高响应速度
        setSelectedNote(note);

        // 创建本地副本
        const noteToSelect = {...note};

        // 恢复保存的标题（如果有）
        try {
            const titleKey = `note_title_${noteToSelect.id}`;
            const savedTitle = localStorage.getItem(titleKey);

            if (savedTitle && savedTitle !== noteToSelect.title) {
                noteToSelect.title = savedTitle;
                setNotes(prevNotes =>
                    prevNotes.map((n) => (n.id === noteToSelect.id ? {...n, title: savedTitle} : n))
                );
            }
        } catch (error) {
            console.error('恢复标题失败:', error);
        }

        // 检查是否有本地备份可以恢复
        const localBackup = loadFromLocalBackup(noteToSelect.id);
        const contentToUse = localBackup || noteToSelect.content;

        // 严格确保内容是字符串类型
        const safeContent = typeof contentToUse === 'string' ? contentToUse : '';

        // 在加载新内容前先清空编辑器，防止内容混合
        dispatch({type: 'SET_CONTENT', payload: ''});

        // 使用 requestAnimationFrame 确保UI更新后再加载内容
        requestAnimationFrame(() => {
            // 再次检查是否仍在处理同一个备忘录，防止快速切换导致的内容混乱
            if (processingNoteRef.current !== targetNoteId) {
                console.log(`已切换到其他备忘录，取消加载 ${targetNoteId} 的内容`);
                clearTimeout(timeoutId);
                return;
            }

            // 使用 Promise.resolve() 来批量更新状态
            Promise.resolve().then(() => {
                // 再次检查是否仍在处理同一个备忘录
                if (processingNoteRef.current !== targetNoteId) {
                    return;
                }

                // 更新编辑器内容
                dispatch({type: 'SET_CONTENT', payload: safeContent});
                lastSavedContent.current = safeContent;

                // 使用 requestIdleCallback 在空闲时提取标题
                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(() => {
                        // 再次检查是否仍在处理同一个备忘录
                        if (processingNoteRef.current !== targetNoteId) {
                            return;
                        }
                        extractHeadingsStable();
                    });
                } else {
                    setTimeout(() => {
                        // 再次检查是否仍在处理同一个备忘录
                        if (processingNoteRef.current !== targetNoteId) {
                            return;
                        }
                        extractHeadingsStable();
                    }, 100);
                }
            });

            // 使用更可靠的方式设置编辑器内容
            const waitForEditor = () => {
                // 延长最大等待时间
                let attempts = 0;
                const maxAttempts = 120; // 120次 * 50ms = 6秒

                const trySetEditorContent = () => {
                    // 再次检查是否仍在处理同一个备忘录
                    if (processingNoteRef.current !== targetNoteId) {
                        console.log(`已切换到其他备忘录，取消设置 ${targetNoteId} 的内容`);
                        clearTimeout(timeoutId);
                        selectionInProgressRef.current = false;
                        return;
                    }

                    attempts++;

                    // 检查组件是否已卸载
                    if (!mounted) {
                        console.log("组件已卸载，停止设置编辑器内容");
                        clearTimeout(timeoutId);
                        selectionInProgressRef.current = false;
                        return;
                    }

                    // 判断编辑器是否可用的更可靠方式
                    const isEditorAvailable = () => {
                        try {
                            if (!editorRef.current) return false;
                            const editor = editorRef.current.getEditor?.();
                            return !!(editor && editor.root);
                        } catch (e) {
                            return false;
                        }
                    };

                    if (!isEditorAvailable()) {
                        const shouldContinue = attempts < maxAttempts;

                        // 定期记录等待状态
                        if (attempts === 1 || attempts % 20 === 0 || !shouldContinue) {
                            console.log(`等待编辑器实例可用... (尝试 ${attempts}/${maxAttempts})`);
                        }

                        if (shouldContinue) {
                            // 继续尝试
                            setTimeout(trySetEditorContent, 50);
                        } else {
                            // 达到最大尝试次数
                            console.error(`尝试了 ${maxAttempts} 次后仍无法找到编辑器实例，放弃操作`);

                            // 额外等待一段时间再尝试一次
                            console.log("进行最后一次尝试...");
                            setTimeout(() => {
                                if (isEditorAvailable()) {
                                    console.log("最后一次尝试成功！设置编辑器内容");
                                    setEditorContentSafely();
                                } else {
                                    console.error("最后一次尝试失败，完全放弃操作");

                                    // 确保清理所有状态
                                    clearTimeout(timeoutId);
                                    selectionInProgressRef.current = false;
                                    processingNoteRef.current = null;

                                    // 重置编辑器加载标志
                                    editorLoadedRef.current = false;
                                }
                            }, 1000); // 最后再等待1秒
                        }
                        return;
                    }

                    // 成功找到编辑器实例，设置内容
                    setEditorContentSafely();
                };

                // 抽取设置内容的逻辑
                const setEditorContentSafely = () => {
                    if (!editorRef.current) return;

                    try {
                        const editor = editorRef.current.getEditor();
                        if (!editor || !editor.root) return;

                        console.log(`成功找到编辑器实例，设置备忘录 ${targetNoteId} 的内容`);

                        try {
                            // 设置编辑器内容
                            editor.setText('');
                            editor.clipboard.dangerouslyPasteHTML(safeContent || '<p></p>');

                            // 延迟设置焦点
                            setTimeout(() => {
                                try {
                                    if (processingNoteRef.current === targetNoteId && editor && editor.focus) {
                                        editor.focus();
                                    }
                                } catch (e) {
                                    console.error("设置焦点失败:", e);
                                }
                            }, 200);
                        } catch (e) {
                            console.error("设置编辑器内容时出错:", e);
                        }

                        // 无论成功还是失败，都清理状态
                        clearTimeout(timeoutId);
                        selectionInProgressRef.current = false;
                        processingNoteRef.current = null;
                    } catch (error) {
                        console.error("访问编辑器实例时出错:", error);

                        // 出错时也清理状态
                        clearTimeout(timeoutId);
                        selectionInProgressRef.current = false;
                        processingNoteRef.current = null;
                    }
                };

                // 开始尝试设置编辑器内容
                trySetEditorContent();
            };

            // 开始等待编辑器可用
            waitForEditor();
        });
    };

    // 组件挂载和卸载时的事件处理
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 页面刷新前保存数据
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                // 保存笔记列表到localStorage
                if (notes.length > 0) {
                    localStorage.setItem('notes_cache', JSON.stringify(notes));
                }

                // 保存当前选中的笔记ID
                if (selectedNote) {
                    localStorage.setItem('last_selected_note_id', selectedNote.id);
                }

                // 如果有未保存的更改，提示用户
                if (selectedNote && editorState.content !== lastSavedContent.current) {
                    console.log('检测到页面即将卸载，正在保存备忘录...');

                    // 创建本地备份
                    try {
                        const backupKey = `note_backup_${selectedNote.id}`;
                        const backupData = JSON.stringify({
                            content: editorState.content,
                            timestamp: new Date().toISOString()
                        });

                        localStorage.setItem(backupKey, backupData);

                        // 同时尝试将标题存入本地存储，防止标题丢失
                        const titleKey = `note_title_${selectedNote.id}`;
                        localStorage.setItem(titleKey, selectedNote.title);
                    } catch (error) {
                        console.error('保存本地备份失败:', error);
                    }

                    // 显示确认对话框
                    e.preventDefault();
                    e.returnValue = '您有未保存的更改，确定要离开吗？';
                    return e.returnValue;
                }
            };

            // 添加事件监听
            window.addEventListener('beforeunload', handleBeforeUnload);

            // 清理函数
            return () => {
                // 移除事件监听
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [editorState.content, lastSavedContent, selectedNote, user, notes, saveToLocalBackup, persistNotesCache, persistUserSession]);

    // 滚动到文档内锚点
    const scrollToHeading = (id: string) => {
        // 如果有选择操作正在进行，先强制重置它
        if (selectionInProgressRef.current) {
            console.log("强制重置未完成的选择操作以确保滚动可以进行");
            selectionInProgressRef.current = false;
        }

        safeDOM(() => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({behavior: 'smooth'});
            }
        });
    }

    // 修改 updateNoteTitle 函数，改进标题保存逻辑
    const updateNoteTitle = async (noteId: string, newTitle: string) => {
        if (!newTitle.trim()) {
            console.log("标题不能为空");
            return false;
        }

        // 保存到本地存储，作为备份
        try {
            const titleKey = `note_title_${noteId}`;
            localStorage.setItem(titleKey, newTitle);
        } catch (error) {
            console.error('保存标题到本地存储失败:', error);
        }

        // 更新本地状态UI立即响应
        const updatedNotes = notes.map(n => {
            if (n.id === noteId) {
                return {...n, title: newTitle};
            }
            return n;
        });

        setNotes(updatedNotes);

        // 如果正在编辑的是当前选中的备忘录，更新selectedNote
        if (selectedNote && selectedNote.id === noteId) {
            setSelectedNote({...selectedNote, title: newTitle});
        }

        // 设置为最后编辑的标题作为新建备忘录的初始标题
        setLastEditedTitle(newTitle);

        try {
            // 保存到数据库
            await updateNote(noteId, {title: newTitle});
            // 成功保存后，可以从本地存储中移除备份
            try {
                localStorage.removeItem(`note_title_${noteId}`);
            } catch (e) {
                // 忽略清理错误
            }
            return true;
        } catch (error) {
            console.error('更新备忘录标题失败:', error);

            // 恢复原标题
            const revertNotes = notes.map(n => {
                if (n.id === noteId) {
                    return {...n, title: selectedNote?.title || newTitle};
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
                        dispatch({type: 'SET_CONTENT', payload: updatedNotes[0].content})
                        extractHeadingsStable()
                    } else {
                        setSelectedNote(null)
                        dispatch({type: 'SET_CONTENT', payload: ''})
                        setDocumentHeadings([])
                    }
                }
            }
        } catch (error) {
            console.error("Error deleting note:", error)
        }
    }

    // 修改格式化时间的函数
    const formatDateTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                console.warn('无效的时间戳，将显示默认值');
                return '时间未知';
            }

            // 使用本地化方法格式化日期时间
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-'); // 确保日期分隔符一致
        } catch (error) {
            console.warn('日期格式化错误，将显示默认值');
            return '时间未知';
        }
    };

    // 仅格式化日期，用于时间列表分组显示
    const formatDateOnly = (timestamp: string) => {
        try {
            const date = new Date(timestamp);

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                return '日期未知';
            }

            // 今天的日期
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 昨天的日期
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // 本周的第一天（周一）
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

            // 比较日期
            const noteDate = new Date(date);
            noteDate.setHours(0, 0, 0, 0);

            if (noteDate.getTime() === today.getTime()) {
                return '今天';
            } else if (noteDate.getTime() === yesterday.getTime()) {
                return '昨天';
            } else if (noteDate >= firstDayOfWeek) {
                // 本周内
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return weekdays[date.getDay()];
            } else {
                // 其他日期
                return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).replace(/\//g, '-');
            }
        } catch (error) {
            console.error('日期格式化错误:', error);
            return '日期未知';
        }
    };

    // 添加一个时间格式化函数，用于显示时分
    const formatTimeOnly = (timestamp: string) => {
        try {
            const date = new Date(timestamp);

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                return '';
            }

            // 只返回时分
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.error('时间格式化错误:', error);
            return '';
        }
    };

    // 修改备忘录排序和过滤逻辑
    const filteredAndSortedNotes = useMemo(() => {
        return notes
            .filter(note => {
                if (!searchTerm) return true;
                return note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    note.content.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [notes, searchTerm]);

    // 修改渲染列表项中的时间显示
    useEffect(() => {
        if (!editingNoteId) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.note-edit-container')) {
                cancelEditingTitle();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingNoteId]);

    // 添加缺失的函数定义
    const startEditingTitle = (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNoteId(note.id);
        setEditingNoteTitle(note.title);
    };

    const cancelEditingTitle = () => {
        setEditingNoteId(null);
        setEditingNoteTitle("");
    };

    const addNewNote = async () => {
        try {
            const newNote = await createNote({
                title: "新建备忘录",
                content: "",
                user_id: user.id
            });

            if (!newNote) {
                console.error('创建备忘录失败: 返回值为空');
                return;
            }

            setNotes([newNote, ...notes]);
            setSelectedNote(newNote);

            // 创建一个合成的MouseEvent
            const fakeEvent = {
                stopPropagation: () => {
                }
            } as React.MouseEvent;

            startEditingTitle(newNote, fakeEvent);
        } catch (error) {
            console.error('创建备忘录失败:', error);
        }
    };

    // 添加处理确认对话框的函数
    const handleSaveConfirmation = (actionToPerform: () => void) => {
        // 如果内容已修改，显示确认对话框
        if (isContentModified && selectedNote) {
            setPendingAction(() => actionToPerform);
            setIsSaveDialogOpen(true);
        } else {
            // 如果内容没有修改，直接执行操作
            actionToPerform();
        }
    };

    // 添加保存并继续的函数
    const handleSaveAndContinue = async () => {
        if (selectedNote && isContentModified) {
            await handleManualSave();
        }

        // 关闭对话框，执行待处理的操作
        setIsSaveDialogOpen(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    // 添加不保存并继续的函数
    const handleContinueWithoutSaving = () => {
        // 关闭对话框，重置内容修改状态，执行待处理的操作
        setIsSaveDialogOpen(false);
        setIsContentModified(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    // 修改 selectNote 函数，使用确认对话框
    const selectNoteWithConfirmation = (note: Note) => {
        // 如果选择的是当前已选中的笔记，不需要确认
        if (selectedNote && selectedNote.id === note.id) {
            return;
        }

        handleSaveConfirmation(() => selectNote(note));
    };

    // 修改删除笔记函数，使用确认对话框
    const deleteNoteWithConfirmation = (noteId: string) => {
        handleSaveConfirmation(() => deleteNoteItem(noteId));
    };

    // 修改添加新笔记函数，使用确认对话框
    const addNewNoteWithConfirmation = () => {
        handleSaveConfirmation(addNewNote);
    };

    // 在成功保存内容后重置修改状态
    const handleManualSave = async () => {
        if (!selectedNote || noteStatus === 'saving') return;

        const noteId = selectedNote.id;
        const currentContent = editorState.content;

        try {
            setNoteStatus('saving');
            console.log(`手动保存备忘录 ${noteId} 内容...`, {
                content_length: currentContent.length,
                title: selectedNote.title
            });

            // 创建本地备份，以防网络请求失败
            saveToLocalBackup(noteId, currentContent);

            // 确保内容是字符串
            const safeContent = typeof currentContent === 'string' ? currentContent : '';

            const updatedNote = await updateNote(noteId, {
                content: safeContent,
                title: selectedNote.title || "无标题备忘录"
            });

            if (!updatedNote) {
                throw new Error("服务器未返回更新后的备忘录数据");
            }

            // 只有当当前选中的备忘录仍然是我们刚保存的备忘录时，才更新状态
            if (selectedNote?.id === noteId) {
                setNoteStatus('saved');
                lastSavedContent.current = currentContent;
                lastAutoSaveContentRef.current = currentContent;
                console.log(`备忘录 ${noteId} 手动保存成功`);

                // 重置内容修改状态
                setIsContentModified(false);

                // 清除本地备份，因为已成功保存到服务器
                clearLocalBackup(noteId);

                // 更新笔记列表中的项目
                setNotes(prevNotes =>
                    prevNotes.map(note =>
                        note.id === noteId
                            ? {...note, content: safeContent, updated_at: new Date().toISOString()}
                            : note
                    )
                );
            } else {
                console.log(`备忘录已切换，放弃更新状态`);
            }
        } catch (error) {
            console.error(`手动保存备忘录 ${noteId} 失败:`, error);
            // 只有当当前选中的备忘录仍然是我们尝试保存的备忘录时，才更新错误状态
            if (selectedNote?.id === noteId) {
                setNoteStatus('error');
            }
        }
    };

    // 在成功自动保存后也要重置修改状态
    const handleAutoSave = useCallback(async () => {
        if (!selectedNote || noteStatus === 'saving') return;

        const currentContent = editorState.content;
        const noteId = selectedNote.id;

        // 如果内容没变，不需要保存
        if (currentContent === lastAutoSaveContentRef.current) return;

        try {
            setNoteStatus('saving');
            console.log(`自动保存备忘录 ${noteId} 内容...`, {
                content_length: currentContent.length,
                title: selectedNote.title
            });

            // 创建本地备份，以防网络请求失败
            saveToLocalBackup(noteId, currentContent);

            // 确保内容是字符串
            const safeContent = typeof currentContent === 'string' ? currentContent : '';

            // 添加重试和错误处理
            let retryCount = 0;
            const maxRetries = 2;
            let success = false;

            while (!success && retryCount <= maxRetries) {
                try {
                    const updatedNote = await updateNote(noteId, {
                        content: safeContent,
                        title: selectedNote.title || "无标题备忘录"
                    });

                    if (!updatedNote) {
                        throw new Error("服务器未返回更新后的备忘录数据");
                    }

                    success = true;
                } catch (saveError) {
                    retryCount++;
                    console.warn(`自动保存尝试 ${retryCount}/${maxRetries + 1} 失败:`, saveError);

                    if (retryCount <= maxRetries) {
                        // 使用指数退避策略
                        const delay = Math.min(500 * Math.pow(2, retryCount), 3000);
                        console.log(`将在 ${delay}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // 达到最大重试次数，抛出错误让外层捕获
                        throw saveError;
                    }
                }
            }

            // 只有当当前选中的备忘录仍然是我们刚保存的备忘录时，才更新状态
            if (selectedNote?.id === noteId) {
                setNoteStatus('saved');
                lastSavedContent.current = currentContent;
                lastAutoSaveContentRef.current = currentContent;
                console.log(`备忘录 ${noteId} 自动保存成功`);

                // 重置内容修改状态
                setIsContentModified(false);

                // 清除本地备份，因为已成功保存到服务器
                clearLocalBackup(noteId);

                // 更新笔记列表中的项目
                setNotes(prevNotes =>
                    prevNotes.map(note =>
                        note.id === noteId
                            ? {...note, content: safeContent, updated_at: new Date().toISOString()}
                            : note
                    )
                );
            } else {
                console.log(`备忘录已切换，放弃更新状态`);
            }
        } catch (error) {
            console.error(`自动保存备忘录 ${noteId} 失败:`, error);
            // 只有当当前选中的备忘录仍然是我们尝试保存的备忘录时，才更新错误状态
            if (selectedNote?.id === noteId) {
                setNoteStatus('error');
            }

            // 错误不会导致退出登录，只是记录本地备份
            // 确保即使API调用失败，用户会话也不会受到影响
        }
    }, [selectedNote, editorState.content, noteStatus, saveToLocalBackup, clearLocalBackup]);

    // 使用防抖包装器包装自动保存函数，避免频繁调用
    const debouncedAutoSave = useMemo(() => {
        return createDebounce(handleAutoSave, 1000); // 1秒防抖
    }, [handleAutoSave, createDebounce]);

    // 设置自动保存定时器，增长间隔，减少API调用频率
    useEffect(() => {
        // 清理之前的定时器
        if (autoSaveIntervalRef.current) {
            clearInterval(autoSaveIntervalRef.current);
        }

        // 设置新的定时器
        if (selectedNote) {
            // 增加到60秒，减轻服务器负担
            autoSaveIntervalRef.current = setInterval(() => {
                // 使用防抖版本的自动保存函数
                debouncedAutoSave();
            }, 60000); // 60秒
        }

        // 清理函数
        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [selectedNote, debouncedAutoSave]);

    // 添加定期会话检查，防止自动退出登录
    useEffect(() => {
        let sessionCheckInterval: NodeJS.Timeout | null = null;

        if (user && mounted) {
            // 每5分钟检查一次会话，但不主动刷新，只是记录状态
            sessionCheckInterval = setInterval(() => {
                // 不用await，避免阻塞UI
                getUserSession()
                    .then(session => {
                        if (!session) {
                            // 如果会话无效但没有自动跳转，记录日志
                            console.warn('会话检查: 会话无效，可能需要重新登录');

                            // 如果需要防止静默失效，可以实现一个本地会话保活机制
                            try {
                                // 尝试从本地恢复会话
                                const cachedSession = localStorage.getItem('user_session');
                                if (cachedSession) {
                                    console.log('尝试使用本地会话继续工作');
                                }
                            } catch (e) {
                                console.error('检查本地会话失败:', e);
                            }
                        }
                    })
                    .catch(err => {
                        console.error('会话检查失败:', err);
                        // 错误不会导致页面跳转，只是记录
                    });
            }, 300000); // 5分钟
        }

        return () => {
            if (sessionCheckInterval) {
                clearInterval(sessionCheckInterval);
            }
        };
    }, [user, mounted]);

    // 添加确认编辑标题的函数
    const confirmEditingTitle = async (noteId: string) => {
        if (!editingNoteTitle.trim()) {
            return;
        }

        try {
            await updateNote(noteId, {title: editingNoteTitle.trim()});
            setNotes(notes.map(note =>
                note.id === noteId
                    ? {...note, title: editingNoteTitle.trim()}
                    : note
            ));
            if (selectedNote?.id === noteId) {
                setSelectedNote({...selectedNote, title: editingNoteTitle.trim()});
            }
        } catch (error) {
            console.error('更新标题失败:', error);
        }

        setEditingNoteId(null);
        setEditingNoteTitle("");
    };

    // 添加处理编辑器装载的函数
    const handleEditorMount = useCallback(() => {
        console.log("编辑器已完全装载并准备好使用");
        editorLoadedRef.current = true;

        // 如果有待处理的备忘录选择操作，立即执行
        if (processingNoteRef.current) {
            console.log(`编辑器装载完成，处理待处理的备忘录: ${processingNoteRef.current}`);
            // 这里不做具体操作，因为选择函数内部会检测编辑器状态
        }
    }, []);

    // 在组件卸载时清理所有定时器
    useEffect(() => {
        return () => {
            if (editorMountTimeoutRef.current) {
                clearTimeout(editorMountTimeoutRef.current);
            }
        };
    }, []);

    // 原来的组件返回内容
    return (
        <>
            {isBrowser && <QuillStyles/>}
            <div className="w-full h-screen overflow-hidden relative bg-card">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* 主侧边栏：笔记列表 */}
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}
                                    className="h-full border-r bg-background/60 backdrop-blur-md">
                        <div className="flex flex-col h-full">
                            {/* 搜索和添加区 */}
                            <div className="flex justify-between items-center p-4 border-b">
                                <div className="flex-1 relative">
                                    <Search
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        placeholder="搜索备忘录..."
                                        className="pl-9 h-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary/30"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={addNewNoteWithConfirmation}
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 ml-2 rounded-full"
                                >
                                    <PlusCircle className="h-5 w-5"/>
                                </Button>
                            </div>

                            {/* 切换类型Tab */}
                            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "titles" | "time")}
                                  className="px-4 py-3 border-b">
                                <TabsList className="grid w-full grid-cols-2 h-9 rounded-full bg-muted/50">
                                    <TabsTrigger value="titles" className="rounded-full text-xs">
                                        <AlignLeft className="h-3.5 w-3.5 mr-2"/>
                                        标题
                                    </TabsTrigger>
                                    <TabsTrigger value="time" className="rounded-full text-xs">
                                        <CalendarDays className="h-3.5 w-3.5 mr-2"/>
                                        时间
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* 备忘录列表 */}
                            <ScrollArea className="flex-grow h-full px-3">
                                {filteredAndSortedNotes.length > 0 ? (
                                    <div className="space-y-2 py-3">
                                        {activeTab === "titles" ? (
                                            // 按标题列表显示
                                            filteredAndSortedNotes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    className={`group flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                                        selectedNote?.id === note.id
                                                            ? 'bg-primary/10 border border-primary/20'
                                                            : 'hover:bg-muted/50 border border-transparent'
                                                    }`}
                                                    onClick={() => selectNoteWithConfirmation(note)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                                            <FileText
                                                                className={`w-4 h-4 ${selectedNote?.id === note.id ? 'text-primary' : 'text-muted-foreground'} flex-shrink-0`}/>
                                                            {editingNoteId === note.id ? (
                                                                <div
                                                                    className="flex items-center space-x-2 flex-1 note-edit-container">
                                                                    <input
                                                                        type="text"
                                                                        value={editingNoteTitle}
                                                                        onChange={(e) => setEditingNoteTitle(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                confirmEditingTitle(note.id);
                                                                            } else if (e.key === 'Escape') {
                                                                                cancelEditingTitle();
                                                                            }
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:ring-1 focus:ring-primary/50 outline-none"
                                                                        autoFocus
                                                                    />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            confirmEditingTitle(note.id);
                                                                        }}
                                                                        className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 transition-colors duration-200"
                                                                    >
                                                                        <Check className="w-4 h-4"/>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            cancelEditingTitle();
                                                                        }}
                                                                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                                                                    >
                                                                        <X className="w-4 h-4"/>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="flex items-center justify-between flex-1">
                                  <span
                                      className={`truncate text-sm font-medium ${selectedNote?.id === note.id ? 'text-foreground' : 'text-foreground'}`}>
                                    {note.title}
                                  </span>
                                                                    <div
                                                                        className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                        <button
                                                                            onClick={(e) => startEditingTitle(note, e)}
                                                                            className="p-1 hover:bg-background rounded-full transition-colors duration-200"
                                                                        >
                                                                            <Edit className="w-3 h-3"/>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteId(note.id);
                                                                                setIsConfirmOpen(true);
                                                                            }}
                                                                            className="p-1 hover:bg-destructive/10 rounded-full text-destructive transition-colors duration-200"
                                                                        >
                                                                            <Trash2 className="w-3 h-3"/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1.5 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1 opacity-70"/>
                                {formatTimeOnly(note.created_at)}
                            </span>
                                                        {note.content && (
                                                            <span className="text-xs text-muted-foreground">
                                {(note.content.replace(/<[^>]*>/g, '').length)} 字
                              </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            // 按时间分组显示 - 修改后的实现
                                            (() => {
                                                // 按日期分组笔记
                                                const notesByDate = filteredAndSortedNotes.reduce((groups: Record<string, Note[]>, note) => {
                                                    const dateKey = formatDateOnly(note.created_at);
                                                    if (!groups[dateKey]) {
                                                        groups[dateKey] = [];
                                                    }
                                                    groups[dateKey].push(note);
                                                    return groups;
                                                }, {});

                                                // 渲染分组后的笔记
                                                return Object.entries(notesByDate).map(([date, dateNotes]) => (
                                                    <div key={date} className="mb-5">
                                                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 rounded-lg">{date}</h3>
                                                        <div className="space-y-2 px-1">
                                                            {dateNotes.map(note => (
                                                                <div
                                                                    key={note.id}
                                                                    className={`group flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                                                        selectedNote?.id === note.id
                                                                            ? 'bg-primary/10 border border-primary/20'
                                                                            : 'hover:bg-muted/50 border border-transparent'
                                                                    }`}
                                                                    onClick={() => selectNoteWithConfirmation(note)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div
                                                                            className="flex items-center space-x-2 min-w-0 flex-1">
                                                                            <FileText
                                                                                className={`w-4 h-4 ${selectedNote?.id === note.id ? 'text-primary' : 'text-muted-foreground'} flex-shrink-0`}/>
                                                                            <div
                                                                                className="flex items-center justify-between flex-1">
                                        <span
                                            className={`truncate text-sm font-medium ${selectedNote?.id === note.id ? 'text-foreground' : 'text-foreground'}`}>
                                          {note.title}
                                        </span>
                                                                                <div
                                                                                    className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                                    <button
                                                                                        onClick={(e) => startEditingTitle(note, e)}
                                                                                        className="p-1 hover:bg-background rounded-full transition-colors duration-200"
                                                                                    >
                                                                                        <Edit className="w-3 h-3"/>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDeleteId(note.id);
                                                                                            setIsConfirmOpen(true);
                                                                                        }}
                                                                                        className="p-1 hover:bg-destructive/10 rounded-full text-destructive transition-colors duration-200"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3"/>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="mt-1.5 flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground flex items-center">
                                      <Clock className="h-3 w-3 mr-1 opacity-70"/>
                                        {formatTimeOnly(note.created_at)}
                                    </span>
                                                                        {note.content && (
                                                                            <span
                                                                                className="text-xs text-muted-foreground">
                                        {(note.content.replace(/<[^>]*>/g, '').length)} 字
                                      </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ));
                                            })()
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-12 px-4">
                                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20"/>
                                        {searchQuery ? "没有找到匹配的备忘录" : "暂无备忘录，点击右上角添加"}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </ResizablePanel>

                    {/* 编辑器区域 */}
                    <ResizablePanel defaultSize={80} className="h-full bg-background">
                        {selectedNote ? (
                            <div className="flex flex-col h-full p-6">
                                {/* 隐藏笔记标题输入，但保留其处理功能 */}
                                <input
                                    type="text"
                                    value={selectedNote.title}
                                    onChange={(e) => updateNoteTitle(selectedNote.id, e.target.value)}
                                    className="hidden"
                                    placeholder="笔记标题"
                                />

                                {/* Quill编辑器容器 */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex-1 overflow-auto relative bg-card border rounded-xl shadow-sm">
                                        <AiEditorApp
                                            key={selectedNote.id}
                                            content={editorState.content}
                                            onChange={handleEditorChange}
                                        />
                                    </div>
                                </div>

                                {/* 底部工具栏 */}
                                <div
                                    className="flex justify-between items-center mt-4 px-4 py-3 bg-muted/30 border rounded-xl">
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>
                    最近一次编辑：{formatDateTime(selectedNote.updated_at || selectedNote.created_at)}
                    </span>
                                        <span>·</span>
                                        <span>共 {editorState.content.replace(/<[^>]*>/g, '').length} 字</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                // 插入当前日期
                                                const editor = editorRef.current?.getEditor();
                                                if (editor) {
                                                    const currentDate = new Date().toLocaleDateString('zh-CN', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    }).replace(/\//g, '-');
                                                    editor.focus();
                                                    const range = editor.getSelection() || {
                                                        index: editor.getLength(),
                                                        length: 0
                                                    };
                                                    editor.insertText(range.index, currentDate);
                                                }
                                            }}
                                            className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                                            title="插入当前日期"
                                        >
                                            <CalendarDays size={16}/>
                                        </button>
                                        <button
                                            onClick={handleManualSave}
                                            className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center space-x-2"
                                        >
                                            <Save size={16}/>
                                            <span>保存</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-muted-foreground">
                                <FileText size={48} className="mb-4 opacity-20"/>
                                <p className="text-lg">选择或创建一个笔记以开始编辑</p>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* 保存确认对话框 */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>是否保存正文</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            您有未保存的更改，是否要保存这些更改？
                        </p>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleContinueWithoutSaving}
                            className="rounded-lg"
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveAndContinue}
                            className="rounded-lg"
                        >
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 确认删除对话框 */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            确定要删除这个备忘录吗？此操作无法撤销。
                        </p>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                            className="rounded-lg"
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setIsConfirmOpen(false);
                                if (deleteId) {
                                    deleteNoteItem(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            className="rounded-lg"
                        >
                            删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default NotesPageClient;