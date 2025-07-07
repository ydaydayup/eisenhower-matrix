"use client"
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import CodeBlock from '@tiptap/extension-code-block'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
}
export default function RichTextEditor({
  content,
  onChange,
  placeholder = '开始输入...',
  editable = true,
}: RichTextEditorProps) {
  const [isCodeBlockActive, setIsCodeBlockActive] = useState(false)
  const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // 使用我们自定义的heading扩展
      }),
      Heading.configure({
        levels: [1, 2, 3, 4],
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-muted p-4 rounded-md my-4 font-mono text-sm overflow-x-auto',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'my-4 border-t border-border',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'mx-auto my-4 max-w-full rounded-md',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])
  useEffect(() => {
    if (editor) {
      setIsCodeBlockActive(editor.isActive('codeBlock'))
    }
  }, [editor])
  // 标题样式
  const toggleHeading = useCallback(
    (level: 1 | 2 | 3 | 4) => {
      if (!editor) return
      editor.chain().focus().toggleHeading({ level }).run()
    },
    [editor]
  )
  // 插入代码块
  const toggleCodeBlock = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleCodeBlock().run()
    setIsCodeBlockActive(!isCodeBlockActive)
  }, [editor, isCodeBlockActive])
  // 插入表格
  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])
  // 插入分割线
  const insertHorizontalRule = useCallback(() => {
    if (!editor) return
    editor.chain().focus().setHorizontalRule().run()
  }, [editor])
  // 处理链接
  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    setLinkUrl(previousUrl || '')
    setIsLinkMenuOpen(true)
  }, [editor])
  const confirmLink = useCallback(() => {
    if (!editor) return
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run()
    }
    setIsLinkMenuOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])
  // 判断是否激活
  const isActive = useCallback(
    (type: string, options = {}) => {
      if (!editor) return false
      return editor.isActive(type, options)
    },
    [editor]
  )
  if (!editor) {
    return null
  }
  return (
    <div className="rich-text-editor">
      <EditorContent editor={editor} className="prose max-w-none w-full" />
    </div>
  )
} 