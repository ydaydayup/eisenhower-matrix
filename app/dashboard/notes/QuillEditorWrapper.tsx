'use client';

import { useEffect, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';

// 动态导入QuillEditor组件以避免SSR问题
const DynamicQuillEditor = dynamic(
  () => import('@/app/dashboard/components/quill-editor').then(mod => mod.QuillEditor), 
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[calc(100vh-15rem)] rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent border-blue-500/70 dark:border-blue-400/70"></div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-4 text-sm font-medium">加载编辑器中...</p>
        </div>
      </div>
    )
  }
);

// 动态导入QuillStyles组件
const DynamicQuillStyles = dynamic(
  () => import('@/app/dashboard/components/quill-editor').then(mod => mod.QuillStyles),
  { ssr: false }
);

interface QuillEditorWrapperProps {
  content: string;
  onChange: (content: string) => void;
  onHeadingsExtracted?: (headings: any[]) => void;
  className?: string;
}

// 使用forwardRef将ref传递给动态加载的组件
const QuillEditorWrapper = forwardRef<any, QuillEditorWrapperProps>((props, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 加载Quill所需CSS
  useEffect(() => {
    if (typeof window !== 'undefined' && isMounted) {
      // 使用require而不是import加载CSS
      try {
        require('quill/dist/quill.snow.css');
        setIsStylesLoaded(true);
      } catch (e) {
        console.error('无法加载Quill样式:', e);
      }
    }
  }, [isMounted]);

  if (!isMounted || !isStylesLoaded) {
    return (
      <div className="min-h-[calc(100vh-15rem)] rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent border-blue-500/70 dark:border-blue-400/70"></div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-4 text-sm font-medium">初始化编辑器...</p>
        </div>
      </div>
    );
  }

  // 从props中解构，过滤掉我们不想传递给QuillEditor的属性
  const { className, ...editorProps } = props;

  // 确保ref正确传递给动态加载的组件
  return (
    <div className="h-full flex flex-col">
      <DynamicQuillStyles />
      <DynamicQuillEditor
        {...editorProps}
        ref={ref}
      />
    </div>
  );
});

QuillEditorWrapper.displayName = "QuillEditorWrapper";

export default QuillEditorWrapper; 