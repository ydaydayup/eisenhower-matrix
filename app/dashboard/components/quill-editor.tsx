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
    // 计算点击位置是否在checkbox上
    const isCheckboxClick = clickTarget.className === 'ql-ui' && 
                           clickTarget.innerHTML === '☐'; // 或者其他checkbox识别方式
    // 获取点击的列表项
    const listItem = clickTarget.tagName === 'LI' ?
                     clickTarget :
                     clickTarget.closest('li');
    // 如果点击的是勾选框项目
    if (listItem && listItem.parentElement?.hasAttribute('data-checked')) {
      // 计算点击是否在勾选框上
      const rect = listItem.getBoundingClientRect();
      const offsetLeft = e.clientX - rect.left;
      // 如果点击位置在列表项的左侧（勾选框位置）
      if (offsetLeft < 20) {
        // 切换勾选状态
        const isChecked = listItem.parentElement.getAttribute('data-checked') === 'true';
        // 更新DOM属性
        listItem.parentElement.setAttribute('data-checked', isChecked ? 'false' : 'true');
        // 应用或移除样式
        if (!isChecked) {
          // 勾选时 - 添加样式
          listItem.style.textDecoration = 'line-through';
          listItem.style.color = '#6b7280';
        } else {
          // 取消勾选时 - 移除样式
          listItem.style.textDecoration = 'none';
          listItem.style.color = '';
        }
      }
    }
  });
  // 在初始化和内容更改时应用样式
  const applyCheckedStyles = () => {
    if (typeof document === 'undefined' || !quill.container) return;
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
        border-color: #e5e7eb;
      }
      .ql-editor {
        min-height: calc(100vh - 15rem); 
        padding: 1.25rem;
        font-size: 1rem;
        line-height: 1.7;
        color: #374151;
      }
      .dark .ql-editor {
        color: #e5e7eb;
      }
      /* Quill 2.0特定样式 */
      .ql-toolbar {
        border-top-left-radius: 0.375rem;
        border-top-right-radius: 0.375rem;
        border-color: #e5e7eb;
        background-color: #f9fafb;
      }
      .dark .ql-toolbar {
        background-color: #1e293b;
        border-color: #334155;
      }
      .dark .ql-container {
        border-color: #334155;
      }
      .ql-container {
        border-bottom-left-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
        font-family: inherit;
      }
      /* 改进标题样式 */
      .ql-editor h1 {
        font-size: 1.875rem;
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 1rem;
      }
      .ql-editor h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.75rem;
      }
      .ql-editor h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }
      .ql-editor h4 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-top: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .ql-editor {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        min-height: 100%;
        height: 100%;
        line-height: 1.5;
        font-size: 1rem;
        padding: 1.5rem;
      }
      .dark .ql-editor {
        color: #e2e8f0;
      }
      .ql-editor h1 {
        font-size: 1.75rem;
        line-height: 2.25rem;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      .ql-editor h2 {
        font-size: 1.5rem;
        line-height: 2rem;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      .ql-editor h3 {
        font-size: 1.25rem;
        line-height: 1.75rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      .ql-toolbar {
        border-bottom: 1px solid #e2e8f0;
        padding: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .dark .ql-toolbar {
        border-color: #2d3748;
      }
      /* Obsidian风格的列表连接线 */
      .ql-editor ul, .ql-editor ol {
        position: relative;
        padding-left: 1.5em;
      }
      /* 无序列表样式 */
      .ql-editor ul > li {
        position: relative;
      }
      .ql-editor ul > li::before {
        content: '';
        position: absolute;
        left: -1.5em;
        top: 0.8em;
        height: calc(100% - 0.6em);
        width: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ul > li::before {
        background-color: #4a5568;
      }
      .ql-editor ul > li:last-child::before {
        height: 0;
      }
      .ql-editor ul > li::after {
        content: '';
        position: absolute;
        left: -1.5em;
        top: 0.8em;
        width: 0.75em;
        height: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ul > li::after {
        background-color: #4a5568;
      }
      /* 有序列表样式 */
      .ql-editor ol > li {
        position: relative;
      }
      .ql-editor ol > li::before {
        content: '';
        position: absolute;
        left: -1.2em;
        top: 0.8em;
        height: calc(100% - 0.6em);
        width: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ol > li::before {
        background-color: #4a5568;
      }
      .ql-editor ol > li:last-child::before {
        height: 0;
      }
      .ql-editor ol > li::after {
        content: '';
        position: absolute;
        left: -1.2em;
        top: 0.8em;
        width: 0.5em;
        height: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ol > li::after {
        background-color: #4a5568;
      }
      /* 勾选列表样式 */
      .ql-editor ul[data-checked] > li {
        position: relative;
      }
      .ql-editor ul[data-checked] > li::before {
        content: '';
        position: absolute;
        left: -1.5em;
        top: 0.8em;
        height: calc(100% - 0.6em);
        width: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ul[data-checked] > li::before {
        background-color: #4a5568;
      }
      .ql-editor ul[data-checked] > li:last-child::before {
        height: 0;
      }
      .ql-editor ul[data-checked] > li::after {
        content: '';
        position: absolute;
        left: -1.5em;
        top: 0.8em;
        width: 0.75em;
        height: 1.5px;
        background-color: #e2e8f0;
      }
      .dark .ql-editor ul[data-checked] > li::after {
        background-color: #4a5568;
      }
      /* 已勾选的项目样式 */
      .ql-editor ul[data-checked="true"] > li {
        text-decoration: line-through;
        color: #6b7280;
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
        );
      } catch (e) {
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
          // 给按钮添加中文提示和显示
          buttons.forEach(button => {
            if (button.className.includes('ql-bold')) {
              button.setAttribute('title', '加粗 (Ctrl+B)');
              addTooltipSpan(button, '加粗');
              // 添加可见标签
              button.innerHTML = '<strong>B</strong>';
            } else if (button.className.includes('ql-italic')) {
              button.setAttribute('title', '斜体 (Ctrl+I)');
              addTooltipSpan(button, '斜体');
              button.innerHTML = '<em>I</em>';
            } else if (button.className.includes('ql-underline')) {
              button.setAttribute('title', '下划线 (Ctrl+U)');
              addTooltipSpan(button, '下划线');
              button.innerHTML = '<u>U</u>';
            } else if (button.className.includes('ql-strike')) {
              button.setAttribute('title', '删除线');
              addTooltipSpan(button, '删除线');
              button.innerHTML = '<s>S</s>';
            } else if (button.className.includes('ql-blockquote')) {
              button.setAttribute('title', '引用');
              addTooltipSpan(button, '引用');
              button.innerHTML = '『』';
            } else if (button.className.includes('ql-code-block')) {
              button.setAttribute('title', '代码块');
              addTooltipSpan(button, '代码块');
              button.innerHTML = '{ }';
            } else if (button.className.includes('ql-link')) {
              button.setAttribute('title', '添加链接');
              addTooltipSpan(button, '链接');
              button.innerHTML = '链接';
            } else if (button.className.includes('ql-image')) {
              button.setAttribute('title', '添加图片');
              addTooltipSpan(button, '图片');
              button.innerHTML = '图片';
            } else if (button.className.includes('ql-clean')) {
              button.setAttribute('title', '清除格式');
              addTooltipSpan(button, '清除格式');
              button.innerHTML = '清除';
            }
          });
          // 辅助函数：为按钮添加可视化提示
          function addTooltipSpan(buttonElement: Element, text: string) {
            // 检查是否已添加提示，避免重复
            if (!buttonElement.querySelector('.tooltip-text')) {
              const tooltipSpan = document.createElement('span');
              tooltipSpan.className = 'tooltip-text';
              tooltipSpan.textContent = text;
              tooltipSpan.style.display = 'none';
              buttonElement.appendChild(tooltipSpan);
              // 显示提示的hover效果
              buttonElement.addEventListener('mouseover', () => {
                tooltipSpan.style.display = 'block';
                tooltipSpan.style.position = 'absolute';
                tooltipSpan.style.backgroundColor = 'rgba(0,0,0,0.7)';
                tooltipSpan.style.color = 'white';
                tooltipSpan.style.padding = '2px 6px';
                tooltipSpan.style.borderRadius = '3px';
                tooltipSpan.style.fontSize = '12px';
                tooltipSpan.style.bottom = '100%';
                tooltipSpan.style.left = '50%';
                tooltipSpan.style.transform = 'translateX(-50%)';
                tooltipSpan.style.marginBottom = '5px';
                tooltipSpan.style.zIndex = '1000';
              });
              buttonElement.addEventListener('mouseout', () => {
                tooltipSpan.style.display = 'none';
              });
            }
          }
          // 给下拉菜单添加中文提示
          selects.forEach(select => {
            if (select.className.includes('ql-header')) {
              select.setAttribute('title', '标题格式');
              // 创建并添加一个样式元素，以便在显示下拉菜单前添加"标题"标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '标题';
              labelSpan.style.position = 'absolute';
              labelSpan.style.left = '5px';
              labelSpan.style.top = '50%';
              labelSpan.style.transform = 'translateY(-50%)';
              labelSpan.style.pointerEvents = 'none';
              labelSpan.style.fontSize = '13px';
              labelSpan.style.color = '#444';
              select.parentElement?.appendChild(labelSpan);
              // 调整选择框样式，为标签腾出空间
              select.style.paddingLeft = '40px';
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
              // 创建并添加标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '字体';
              labelSpan.style.position = 'absolute';
              labelSpan.style.left = '5px';
              labelSpan.style.top = '50%';
              labelSpan.style.transform = 'translateY(-50%)';
              labelSpan.style.pointerEvents = 'none';
              labelSpan.style.fontSize = '13px';
              labelSpan.style.color = '#444';
              select.parentElement?.appendChild(labelSpan);
              // 调整选择框样式
              select.style.paddingLeft = '40px';
              // 翻译字体选项
              const fontOptions = select.querySelectorAll('option');
              fontOptions.forEach(option => {
                if (option.value === 'sans-serif') option.textContent = '无衬线';
                if (option.value === 'serif') option.textContent = '衬线';
                if (option.value === 'monospace') option.textContent = '等宽';
              });
            } else if (select.className.includes('ql-size')) {
              select.setAttribute('title', '字号大小');
              // 创建并添加标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '字号';
              labelSpan.style.position = 'absolute';
              labelSpan.style.left = '5px';
              labelSpan.style.top = '50%';
              labelSpan.style.transform = 'translateY(-50%)';
              labelSpan.style.pointerEvents = 'none';
              labelSpan.style.fontSize = '13px';
              labelSpan.style.color = '#444';
              select.parentElement?.appendChild(labelSpan);
              // 调整选择框样式
              select.style.paddingLeft = '40px';
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
              // 创建并添加标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '对齐';
              labelSpan.style.position = 'absolute';
              labelSpan.style.left = '5px';
              labelSpan.style.top = '50%';
              labelSpan.style.transform = 'translateY(-50%)';
              labelSpan.style.pointerEvents = 'none';
              labelSpan.style.fontSize = '13px';
              labelSpan.style.color = '#444';
              select.parentElement?.appendChild(labelSpan);
              // 调整选择框样式
              select.style.paddingLeft = '40px';
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
              // 为颜色添加标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '颜色';
              labelSpan.style.fontSize = '12px';
              labelSpan.style.position = 'absolute';
              labelSpan.style.bottom = '-15px';
              labelSpan.style.left = '50%';
              labelSpan.style.transform = 'translateX(-50%)';
              select.parentElement?.appendChild(labelSpan);
            } else if (select.className.includes('ql-background')) {
              select.setAttribute('title', '背景颜色');
              // 为背景颜色添加标签
              const labelSpan = document.createElement('span');
              labelSpan.innerHTML = '背景';
              labelSpan.style.fontSize = '12px';
              labelSpan.style.position = 'absolute';
              labelSpan.style.bottom = '-15px';
              labelSpan.style.left = '50%';
              labelSpan.style.transform = 'translateX(-50%)';
              select.parentElement?.appendChild(labelSpan);
            }
          });
          // 翻译列表按钮
          const listButtons = toolbarEl.querySelectorAll('.ql-list');
          listButtons.forEach(button => {
            const value = button.getAttribute('value');
            if (value === 'ordered') {
              button.setAttribute('title', '有序列表');
              addTooltipSpan(button, '有序列表');
              button.innerHTML = '1.';
            } else if (value === 'bullet') {
              button.setAttribute('title', '无序列表');
              addTooltipSpan(button, '无序列表');
              button.innerHTML = '•';
            } else if (value === 'check') {
              button.setAttribute('title', '勾选列表');
              addTooltipSpan(button, '勾选列表');
              button.innerHTML = '☑';
            }
          });
          // 翻译缩进按钮
          const indentButtons = toolbarEl.querySelectorAll('.ql-indent');
          indentButtons.forEach(button => {
            const value = button.getAttribute('value');
            if (value === '-1') {
              button.setAttribute('title', '减少缩进');
              addTooltipSpan(button, '减少缩进');
              button.innerHTML = '←';
            }
            if (value === '+1') {
              button.setAttribute('title', '增加缩进');
              addTooltipSpan(button, '增加缩进');
              button.innerHTML = '→';
            }
          });
          // 给颜色选择器添加提示
          const colorButtons = toolbarEl.querySelectorAll('.ql-color, .ql-background');
          colorButtons.forEach(button => {
            if (button.className.includes('ql-color')) {
              button.setAttribute('title', '文字颜色');
              addTooltipSpan(button, '文字颜色');
            } else if (button.className.includes('ql-background')) {
              button.setAttribute('title', '背景颜色');
              addTooltipSpan(button, '背景颜色');
            }
          });
        }
      } catch (error) {
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
          <div ref={editorRef} className="h-full rounded-b-lg overflow-hidden" />
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