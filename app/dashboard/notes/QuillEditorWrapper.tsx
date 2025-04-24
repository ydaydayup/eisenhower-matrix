'use client';

import { useEffect, useState, forwardRef, useRef } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { applyToolbarTranslations } from '@/app/dashboard/components/toolbar-translations';

// 动态导入QuillEditor组件以避免SSR问题
const DynamicQuillEditor = dynamic(
  () => import('@/app/dashboard/components/quill-editor').then(mod => mod.QuillEditor), 
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[calc(100vh-15rem)] rounded-xl bg-background/30 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent border-primary/50"></div>
          <p className="text-muted-foreground mt-4 text-sm font-medium">加载编辑器中...</p>
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
  onMount?: () => void;
  className?: string;
}

// 使用forwardRef将ref传递给动态加载的组件
const QuillEditorWrapper = forwardRef<any, QuillEditorWrapperProps>((props, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkAttempts = useRef(0);
  
  useEffect(() => {
    setIsMounted(true);
    
    return () => {
      if (editorCheckIntervalRef.current) {
        clearInterval(editorCheckIntervalRef.current);
      }
    };
  }, []);

  // 加载Quill所需CSS
  useEffect(() => {
    if (typeof window !== 'undefined' && isMounted) {
      // 使用require而不是import加载CSS
      try {
        require('quill/dist/quill.snow.css');
        // 加载自定义样式
        require('@/app/dashboard/components/quill-custom.css');
        setIsStylesLoaded(true);
      } catch (e) {
        console.error('无法加载Quill样式:', e);
      }
    }
  }, [isMounted]);

  // 检查编辑器是否已准备好
  useEffect(() => {
    if (isMounted && isStylesLoaded && ref) {
      const checkEditorReady = () => {
        checkAttempts.current += 1;
        
        // 每5次检查输出一次日志
        if (checkAttempts.current % 5 === 0) {
          console.log(`QuillEditorWrapper: 检查编辑器实例 (尝试 ${checkAttempts.current})`);
        }
        
        try {
          // 通过ref检查编辑器是否已准备好
          const editorInstance = (ref as any).current;
          if (editorInstance && typeof editorInstance.getEditor === 'function') {
            const editor = editorInstance.getEditor();
            if (editor && editor.root) {
              console.log('QuillEditorWrapper: 编辑器已完全加载');
              setIsEditorReady(true);
              props.onMount?.();
              
              // 停止检查
              if (editorCheckIntervalRef.current) {
                clearInterval(editorCheckIntervalRef.current);
                editorCheckIntervalRef.current = null;
              }
            }
          }
        } catch (e) {
          // 忽略错误，继续尝试
        }
        
        // 最多尝试60次（约30秒）
        if (checkAttempts.current >= 60) {
          console.warn('QuillEditorWrapper: 检查编辑器实例超时');
          if (editorCheckIntervalRef.current) {
            clearInterval(editorCheckIntervalRef.current);
            editorCheckIntervalRef.current = null;
          }
        }
      };
      
      // 设置500ms的检查间隔
      editorCheckIntervalRef.current = setInterval(checkEditorReady, 500);
      
      return () => {
        if (editorCheckIntervalRef.current) {
          clearInterval(editorCheckIntervalRef.current);
          editorCheckIntervalRef.current = null;
        }
      };
    }
  }, [isMounted, isStylesLoaded, ref, props]);

  // 应用自定义样式到列表项
  useEffect(() => {
    if (isEditorReady && ref) {
      try {
        const editorInstance = (ref as any).current;
        if (editorInstance && typeof editorInstance.getEditor === 'function') {
          const editor = editorInstance.getEditor();
          const editorElement = editor.root;
          
          // 找到所有已勾选的列表项并应用样式
          const checkedItems = editorElement.querySelectorAll('ul[data-checked="true"] > li');
          checkedItems.forEach((item: HTMLElement) => {
            item.style.textDecoration = 'line-through';
            item.style.color = '#6b7280';
          });
          
          // 应用工具栏翻译
          applyToolbarTranslations(editor);
        }
      } catch (e) {
        console.error('应用自定义样式时出错:', e);
      }
    }
  }, [isEditorReady, ref, props.content]);

  if (!isMounted || !isStylesLoaded) {
    return (
      <div className="min-h-[calc(100vh-15rem)] rounded-xl bg-background/30 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-t-transparent border-primary/50"></div>
          <p className="text-muted-foreground mt-4 text-sm font-medium">初始化编辑器...</p>
        </div>
      </div>
    );
  }

  // 从props中解构，过滤掉我们不想传递给QuillEditor的属性
  const { className, onMount, ...editorProps } = props;

  // 确保ref正确传递给动态加载的组件
  return (
    <div className={cn("h-full flex flex-col", className)}>
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