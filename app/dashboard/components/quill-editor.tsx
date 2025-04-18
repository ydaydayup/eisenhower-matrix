"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 只在客户端导入实际的Quill类
let QuillInstance: any = null;
let DeltaInstance: any = null;

// 动态加载Quill和插件
if (typeof window !== 'undefined') {
  // 动态导入实际的Quill库
  import('quill').then((module) => {
    QuillInstance = module.default;
    DeltaInstance = module.Delta;
  }).catch(err => {
    console.error('Quill导入失败:', err);
  });
}

// 使用dynamic import导入Markdown插件
const MarkdownShortcuts = dynamic(() => import('quill-markdown-shortcuts'), { 
  ssr: false 
});

// 为没有类型定义的模块创建声明
declare module 'quill-markdown-shortcuts';

// 复制CheckboxModule逻辑，适配Quill 2.0
const CheckboxModule = function(quill: any) {
  // 确保只在客户端执行
  if (typeof document === 'undefined') return;
  
  quill.container.addEventListener('click', (e: MouseEvent) => {
    const clickTarget = e.target as HTMLElement;
    
    // 查找最近的复选框列表项
    if (clickTarget.tagName === 'LI' || 
        clickTarget.parentElement?.tagName === 'LI') {
      
      const listItem = clickTarget.tagName === 'LI' ? 
                      clickTarget : clickTarget.parentElement;
      
      // 确保是复选框列表项
      if (listItem && listItem.parentElement?.hasAttribute('data-checked')) {
        // 获取点击位置相对于列表项的水平位置
        const rect = listItem.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // 只有当点击在列表项的左侧区域(复选框区域)时才处理
        if (clickX < 25) {
          const isChecked = listItem.parentElement.getAttribute('data-checked') === 'true';
          
          // 切换复选框状态
          listItem.parentElement.setAttribute('data-checked', isChecked ? 'false' : 'true');
          
          // 更新删除线样式
          if (isChecked) {
            listItem.style.textDecoration = 'none';
            listItem.style.color = '';
          } else {
            listItem.style.textDecoration = 'line-through';
            listItem.style.color = '#6b7280';
          }
          
          // 从DOM计算行号并更新Quill内容
          try {
            const format = quill.getFormat();
            const range = quill.getSelection();
            
            if (range) {
              // 使用Quill的formatLine方法更新line格式
              quill.formatLine(range.index, 1, 'checked', !isChecked);
              
              // 手动触发text-change事件以保存更改
              // 创建空的Delta对象 - Quill 2.0使用新的Delta API
              const emptyDelta = DeltaInstance ? new DeltaInstance() : { ops: [] };
              quill.emit('text-change', emptyDelta, emptyDelta, 'user');
            }
          } catch (error) {
            console.error('Checkbox处理错误:', error);
          }
          
          // 防止事件冒泡和默认行为
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  });
  
  // 在初始化和内容更改时应用样式
  const applyCheckedStyles = () => {
    // 确保只在客户端执行
    if (typeof document === 'undefined') return;
    
    const container = quill.container;
    const checkedItems = container.querySelectorAll('ul[data-checked=true] > li');
    const uncheckedItems = container.querySelectorAll('ul[data-checked=false] > li');
    
    // 应用已选中项的样式
    checkedItems.forEach((item: HTMLElement) => {
      item.style.textDecoration = 'line-through';
      item.style.color = '#6b7280';
    });
    
    // 移除未选中项的样式
    uncheckedItems.forEach((item: HTMLElement) => {
      item.style.textDecoration = 'none';
      item.style.color = '';
    });
  };
  
  // 监听文本变化，应用样式
  quill.on('text-change', applyCheckedStyles);
  
  // 初始加载时应用样式
  setTimeout(applyCheckedStyles, 0);
};

// 创建一个简单的QuillCSS组件
export const QuillStyles = () => {
  return (
    <style jsx global>{`
      /* 必要的样式放在这里 */
      .quill-editor-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      /* 确保编辑器占满可用空间 */
      .ql-container {
        height: calc(100% - 42px); /* 减去工具栏高度 */
      }
      
      .ql-editor {
        min-height: calc(100vh - 15rem); 
        padding: 1rem;
      }
      
      /* Quill 2.0特定样式 */
      .ql-toolbar {
        border-top-left-radius: 0.375rem;
        border-top-right-radius: 0.375rem;
      }
      
      .ql-container {
        border-bottom-left-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
      }
    `}</style>
  );
};

// 自定义Quill编辑器组件
interface CustomQuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  toolbar?: boolean;
}

interface QuillEditorRef {
  getEditor: () => any | null;
  getEditorContents: () => string;
  focus: () => void;
}

// 定义标题项的类型
interface Heading {
  id: string;
  text: string;
  level: number;
}

// 在客户端初始化时动态加载CSS和插件
const useQuillDeps = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // 使用require加载CSS
        require('quill/dist/quill.snow.css');
        
        // 动态加载Markdown插件
        import('quill-markdown-shortcuts').catch(err => 
          console.error('加载Markdown插件失败:', err)
        );
      } catch (e) {
        console.error('加载Quill依赖失败:', e);
      }
    }
  }, []);
};

const CustomQuillEditor = forwardRef<QuillEditorRef, CustomQuillEditorProps>(
  ({ value, onChange, placeholder = '开始编辑备忘录...', className = '', readOnly = false, toolbar = true }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any | null>(null);
    const isInitializedRef = useRef(false);
    const [isMounted, setIsMounted] = useState(false);
    
    // 确保组件挂载后再执行DOM操作
    useEffect(() => {
      setIsMounted(true);
    }, []);
    
    // 将Quill实例方法暴露给父组件
    useImperativeHandle(ref, () => ({
      getEditor: () => quillRef.current,
      getEditorContents: () => {
        return quillRef.current && typeof window !== 'undefined' ? quillRef.current.root.innerHTML : '';
      },
      focus: () => {
        if (quillRef.current && isMounted && typeof window !== 'undefined') {
          quillRef.current.focus();
        }
      }
    }), [isMounted]);
    
    // 初始化Quill编辑器
    useEffect(() => {
      // 确保在客户端环境，Quill库已加载，DOM已准备好，且还未初始化
      if (!isMounted || typeof window === 'undefined' || !QuillInstance || !editorRef.current || isInitializedRef.current) return;
      
      try {
        // 异步加载Markdown插件
        import('quill-markdown-shortcuts').then((MarkdownModule) => {
          const MarkdownShortcuts = MarkdownModule.default;
          
          // 通过Quill.register注册插件
          if (QuillInstance && typeof QuillInstance.register === 'function') {
            // 注册Markdown模块
            QuillInstance.register('modules/markdownShortcuts', MarkdownShortcuts);
            // 注册复选框模块
            QuillInstance.register('modules/checkbox', CheckboxModule);
          }
          
          // 初始化编辑器配置
          initializeEditor();
        }).catch(error => {
          console.error('加载Markdown插件失败，继续初始化编辑器:', error);
          // 即使没有Markdown插件也初始化编辑器
          initializeEditor();
        });
        
        // 初始化编辑器的函数
        function initializeEditor() {
          if (!QuillInstance || !editorRef.current || isInitializedRef.current) return;
          
          // 配置Quill工具栏
          const modules = {
            toolbar: toolbar ? {
              container: [
                [{ 'font': [] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'size': ['small', false, 'large', 'huge'] }], 
                ['bold', 'italic', 'underline', 'strike'],      
                [{ 'color': [] }, { 'background': [] }],         
                [{ 'align': [] }],                              
                [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }], 
                [{ 'indent': '-1'}, { 'indent': '+1' }],       
                ['blockquote', 'code-block'],                  
                ['link', 'image'],                              
                ['clean']                                       
              ]
            } : false,
            markdownShortcuts: {},
            checkbox: true
          };
          
          // 创建Quill 2.0实例
          quillRef.current = new QuillInstance(editorRef.current, {
            modules,
            placeholder,
            theme: 'snow',
            readOnly
          });
          
          // 设置初始内容
          if (value) {
            quillRef.current.clipboard.dangerouslyPasteHTML(value);
          }
          
          // 监听内容变化
          quillRef.current.on('text-change', () => {
            if (quillRef.current) {
              onChange(quillRef.current.root.innerHTML);
            }
          });
          
          // 应用自定义样式和翻译
          applyCustomStyles();
          
          isInitializedRef.current = true;
        }
      } catch (error) {
        console.error('初始化编辑器失败:', error);
      }
    }, [value, onChange, placeholder, isMounted, readOnly, toolbar]);
    
    // 应用自定义样式函数
    const applyCustomStyles = () => {
      if (!quillRef.current || typeof document === 'undefined') return;
      
      try {
        // 移除编辑器内嵌边框
        const editorElement = editorRef.current?.querySelector('.ql-editor');
        if (editorElement) {
          (editorElement as HTMLElement).style.border = 'none';
        }
        
        // 自定义工具栏翻译
        const toolbarEl = editorRef.current?.querySelector('.ql-toolbar');
        if (toolbarEl) {
          // 添加工具提示
          const buttons = toolbarEl.querySelectorAll('button');
          const selects = toolbarEl.querySelectorAll('select');
          
          // 给按钮添加中文提示
          buttons.forEach(button => {
            if (button.className.includes('ql-bold')) {
              button.setAttribute('title', '加粗');
            } else if (button.className.includes('ql-italic')) {
              button.setAttribute('title', '斜体');
            } else if (button.className.includes('ql-underline')) {
              button.setAttribute('title', '下划线');
            } else if (button.className.includes('ql-strike')) {
              button.setAttribute('title', '删除线');
            } else if (button.className.includes('ql-blockquote')) {
              button.setAttribute('title', '引用');
            } else if (button.className.includes('ql-code-block')) {
              button.setAttribute('title', '代码块');
            } else if (button.className.includes('ql-link')) {
              button.setAttribute('title', '添加链接');
            } else if (button.className.includes('ql-image')) {
              button.setAttribute('title', '添加图片');
            } else if (button.className.includes('ql-clean')) {
              button.setAttribute('title', '清除格式');
            } else if (button.className.includes('ql-list[value="ordered"]')) {
              button.setAttribute('title', '有序列表');
            } else if (button.className.includes('ql-list[value="bullet"]')) {
              button.setAttribute('title', '无序列表');
            } else if (button.className.includes('ql-list[value="check"]')) {
              button.setAttribute('title', '任务列表');
            } else if (button.className.includes('ql-indent[value="-1"]')) {
              button.setAttribute('title', '减少缩进');
            } else if (button.className.includes('ql-indent[value="+1"]')) {
              button.setAttribute('title', '增加缩进');
            }
          });
          
          // 给下拉菜单添加中文提示
          selects.forEach(select => {
            if (select.className.includes('ql-header')) {
              select.setAttribute('title', '标题格式');
              
              // 翻译下拉选项
              const headerOptions = select.querySelectorAll('option');
              headerOptions.forEach(option => {
                if (option.value === '1') option.textContent = '标题1';
                if (option.value === '2') option.textContent = '标题2';
                if (option.value === '3') option.textContent = '标题3';
                if (option.value === '4') option.textContent = '标题4';
                if (option.value === '5') option.textContent = '标题5';
                if (option.value === '6') option.textContent = '标题6';
                if (option.value === '') option.textContent = '正文';
              });
            } else if (select.className.includes('ql-font')) {
              select.setAttribute('title', '字体');
              
              // 翻译字体选项
              const fontOptions = select.querySelectorAll('option');
              fontOptions.forEach(option => {
                if (option.value === 'sans-serif') option.textContent = '无衬线';
                if (option.value === 'serif') option.textContent = '衬线';
                if (option.value === 'monospace') option.textContent = '等宽';
              });
            } else if (select.className.includes('ql-size')) {
              select.setAttribute('title', '字号大小');
              
              // 翻译字号选项
              const sizeOptions = select.querySelectorAll('option');
              sizeOptions.forEach(option => {
                if (option.value === 'small') option.textContent = '小号';
                if (option.value === 'large') option.textContent = '大号';
                if (option.value === 'huge') option.textContent = '超大';
                if (option.value === '') option.textContent = '标准';
              });
            } else if (select.className.includes('ql-align')) {
              select.setAttribute('title', '对齐方式');
              
              // 翻译对齐选项
              const alignOptions = select.querySelectorAll('option');
              alignOptions.forEach(option => {
                if (option.value === 'center') option.textContent = '居中';
                if (option.value === 'right') option.textContent = '右对齐';
                if (option.value === 'justify') option.textContent = '两端对齐';
                if (option.value === '') option.textContent = '左对齐';
              });
            } else if (select.className.includes('ql-color')) {
              select.setAttribute('title', '文字颜色');
            } else if (select.className.includes('ql-background')) {
              select.setAttribute('title', '背景颜色');
            }
          });
          
          // 翻译列表相关按钮
          const listButtons = toolbarEl.querySelectorAll('.ql-list');
          listButtons.forEach(button => {
            const value = button.getAttribute('value');
            if (value === 'ordered') button.setAttribute('title', '有序列表');
            if (value === 'bullet') button.setAttribute('title', '无序列表'); 
            if (value === 'check') button.setAttribute('title', '任务清单');
          });
          
          // 翻译缩进按钮
          const indentButtons = toolbarEl.querySelectorAll('.ql-indent');
          indentButtons.forEach(button => {
            const value = button.getAttribute('value');
            if (value === '-1') button.setAttribute('title', '减少缩进');
            if (value === '+1') button.setAttribute('title', '增加缩进');
          });
        }
      } catch (error) {
        console.error('应用自定义样式失败:', error);
      }
    };
    
    // 加载依赖
    useQuillDeps();
    
    // 如果还没挂载，显示占位内容
    if (!isMounted) {
      return <div className={`${className} border rounded-md p-4`}>编辑器加载中...</div>;
    }
    
    return (
      <>
        <QuillStyles />
        <div className={`quill-editor-container ${className}`}>
          <div ref={editorRef} className="h-full" />
        </div>
      </>
    );
  }
);

CustomQuillEditor.displayName = 'CustomQuillEditor';

// 定义QuillEditor组件
interface QuillEditorProps {
  content: string;
  onChange: (content: string) => void;
  onHeadingsExtracted?: (headings: Heading[]) => void;
}

export const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(
  ({ content, onChange, onHeadingsExtracted }, ref) => {
    const internalQuillEditorRef = useRef<QuillEditorRef>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    // 合并内部ref和外部传入的ref
    useImperativeHandle(ref, () => ({
      getEditor: () => internalQuillEditorRef.current?.getEditor() || null,
      getEditorContents: () => internalQuillEditorRef.current?.getEditorContents() || '',
      focus: () => {
        if (internalQuillEditorRef.current) {
          internalQuillEditorRef.current.focus();
        }
      }
    }), [internalQuillEditorRef]);
    
    // 确保组件挂载后再执行DOM操作
    useEffect(() => {
      setIsMounted(true);
    }, []);
    
    // 提取标题
    useEffect(() => {
      if (!isMounted || !internalQuillEditorRef.current || typeof window === 'undefined') return;
      
      const extractHeadings = () => {
        if (typeof window === 'undefined' || !internalQuillEditorRef.current) return;
        
        const editor = internalQuillEditorRef.current?.getEditor();
        if (!editor) return;
        
        try {
          const content = editor.root.innerHTML;
          // 创建一个临时元素来解析HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          
          const headings: Heading[] = [];
          const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4');
          
          headingElements.forEach((el, index) => {
            const level = parseInt(el.tagName.substring(1), 10);
            const id = `heading-${index}`;
            
            headings.push({
              id,
              text: el.textContent || '',
              level
            });
          });
          
          if (onHeadingsExtracted) {
            onHeadingsExtracted(headings);
          }
        } catch (error) {
          console.error('提取标题失败:', error);
        }
      };
      
      // 延迟提取以确保内容已经渲染
      const timer = setTimeout(extractHeadings, 100);
      return () => clearTimeout(timer);
    }, [content, onHeadingsExtracted, isMounted]);
    
    // 如果还没挂载，显示占位内容
    if (!isMounted) {
      return <div className="min-h-[calc(100vh-15rem)] border rounded-md p-4">编辑器加载中...</div>;
    }
    
    return (
      <CustomQuillEditor
        ref={internalQuillEditorRef}
        value={content}
        onChange={onChange}
        className="min-h-[calc(100vh-15rem)]"
      />
    );
  }
); 

QuillEditor.displayName = 'QuillEditor'; 