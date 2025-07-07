"use client"
import {useEffect, useRef, useState} from 'react'
import {AiEditor} from "aieditor";
import "aieditor/dist/style.css"
interface AiEditorAppProps {
    content: string;
    onChange: (content: string) => void;
}
function AiEditorApp({ content, onChange }: AiEditorAppProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<AiEditor | null>(null);
    const isInitialized = useRef(false);
    //初始化 AiEditor
    useEffect(() => {
        if (divRef.current && !isInitialized.current) {
            const aiEditor = new AiEditor({
                element: divRef.current,
                placeholder: "点击输入内容...",
                content: content || '', // 确保初始内容不为 undefined
                onChange: (editor: AiEditor) => {
                    // 获取编辑器内容并通知父组件
                    const newContent = editor.getHtml();
                    onChange(newContent);
                }
            });
            editorRef.current = aiEditor;
            isInitialized.current = true;
            return () => {
                aiEditor.destroy();
                isInitialized.current = false;
            }
        }
    }, []);
    // 当content prop变化时更新编辑器内容
    useEffect(() => {
        if (editorRef.current && isInitialized.current) {
            const currentContent = editorRef.current.getHtml();
            // 只有当内容真正不同时才更新
            if (content !== currentContent) {
                editorRef.current.setContent(content || '');
            }
        }
    }, [content]);
    return (
            <div ref={divRef} style={{height: "100%"}} />
    )
}
export default AiEditorApp
