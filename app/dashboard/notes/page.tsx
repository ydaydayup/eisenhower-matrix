"use client"

import React, {useEffect, useRef, useState} from "react"
import {FileText, PlusCircle, Save} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {useRouter} from "next/navigation"
import {getUserSession} from "@/lib/auth"
import {createNote, deleteNote, getUserNotes, type Note, updateNote} from "@/lib/notes"
import AiEditorApp from "@/app/dashboard/components/AiEditor"

const NotesPageClient = () => {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [content, setContent] = useState("");
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteTitle, setEditingNoteTitle] = useState<string>("");

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
            setIsLoading(true);
            const userNotes = await getUserNotes(userId);
            setNotes(userNotes);

            // 自动选择第一个备忘录
            if (userNotes.length > 0) {
                selectNote(userNotes[0]);
            }
        } catch (error) {
            console.error("加载用户备忘录失败:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 选择备忘录
    const selectNote = (note: Note) => {
        setSelectedNote(note);
        setContent(note.content || '');
    };

    // 处理编辑器内容变化
    const handleEditorChange = (newContent: string) => {
        setContent(newContent);
    };

    // 添加新笔记
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
            setEditingNoteId(newNote.id);
            setEditingNoteTitle(newNote.title);
        } catch (error) {
            console.error('创建备忘录失败:', error);
        }
    };

    // 开始编辑标题
    const startEditingTitle = (note: Note) => {
        setEditingNoteId(note.id);
        setEditingNoteTitle(note.title);
    };

    // 取消编辑标题
    const cancelEditingTitle = () => {
        setEditingNoteId(null);
        setEditingNoteTitle("");
    };

    // 确认编辑标题
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

    // 保存笔记
    const handleSave = async () => {
        if (!selectedNote) return;

        try {
            await updateNote(selectedNote.id, {
                title: selectedNote.title,
                content: content
            });
        } catch (error) {
            console.error('保存笔记失败:', error);
        }
    };

    return (
        <div className="w-full h-screen overflow-hidden relative bg-card">
            <div className="flex h-full">
                {/* 侧边栏：笔记列表 */}
                <div className="w-64 h-full border-r bg-background/60 backdrop-blur-md">
                    <div className="flex flex-col h-full">
                        {/* 添加按钮 */}
                        <div className="p-4 border-b">
                            <Button
                                onClick={addNewNote}
                                className="w-full"
                            >
                                <PlusCircle className="h-4 w-4 mr-2"/>
                                新建笔记
                            </Button>
                        </div>

                        {/* 笔记列表 */}
                        <div className="flex-1 overflow-auto p-4">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    className={`group flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                        selectedNote?.id === note.id
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-muted/50 border border-transparent'
                                    }`}
                                    onClick={() => selectNote(note)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                                            {editingNoteId === note.id ? (
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <Input
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
                                                        className="flex-1"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between flex-1">
                                                    <span className="truncate text-sm font-medium">
                                                        {note.title}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditingTitle(note);
                                                        }}
                                                        className="p-1 hover:bg-background rounded-full transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <FileText className="w-3 h-3"/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 编辑器区域 */}
                <div className="flex-1 h-full bg-background">
                    {selectedNote ? (
                        <div className="flex flex-col h-full p-6">
                            {/* 编辑器容器 */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex-1 overflow-auto relative bg-card border rounded-xl shadow-sm">
                                    <AiEditorApp
                                        key={selectedNote.id}
                                        content={content}
                                        onChange={handleEditorChange}
                                    />
                                </div>
                            </div>

                            {/* 底部工具栏 */}
                            <div className="flex justify-end items-center mt-4 px-4 py-3 bg-muted/30 border rounded-xl">
                                <Button
                                    onClick={handleSave}
                                    className="flex items-center space-x-2"
                                >
                                    <Save size={16}/>
                                    <span>保存</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-muted-foreground">
                            <FileText size={48} className="mb-4 opacity-20"/>
                            <p className="text-lg">选择或创建一个笔记以开始编辑</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotesPageClient;