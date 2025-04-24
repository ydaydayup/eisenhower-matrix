"use client";

import React from 'react';

export const QuillStyles = () => {
  return (
    <style jsx global>{`
      /* 编辑器容器样式 */
      .quill-editor-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      /* 编辑器主容器 */
      .quill-container {
        height: calc(100vh - 3rem);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      /* 工具栏样式 */
      .ql-toolbar {
        display: block !important; 
        padding: 8px !important;
      }
      
      /* 给工具栏添加样式 */
      .ql-toolbar.ql-snow {
        border: 1px solid #e2e8f0 !important;
        border-top-left-radius: 0.375rem !important;
        border-top-right-radius: 0.375rem !important;
        background-color: #f8fafc !important;
        padding: 8px 5px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        overflow: visible !important;
      }
      
      /* 确保工具栏按钮和下拉菜单对齐 */
      .ql-formats {
        display: inline-flex !important;
        align-items: center !important;
        margin-right: 10px !important;
        margin-bottom: 5px !important;
        flex-wrap: nowrap !important;
      }
      
      /* 改进下拉菜单样式，避免文字换行 */
      .ql-picker {
        white-space: nowrap !important;
      }
      
      .ql-picker-label, .ql-picker-options {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      /* 调整选择器宽度 */
      .ql-header, .ql-size, .ql-font, .ql-align {
        width: auto !important;
        min-width: 80px !important;
      }
      
      /* 下拉菜单选项容器 */
      .ql-picker-options {
        width: auto !important;
        min-width: 100% !important;
      }
      
      /* 全局设置下拉菜单显示方式 */
      .ql-picker-options {
        top: 100% !important;
        padding: 5px 0 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        border-radius: 4px !important;
      }
      
      /* 内容区域 */
      .ql-container {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 1rem;
        line-height: 1.6;
        flex: 1;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-top: none;
        border-bottom-left-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
        height: calc(100vh - 12rem);
      }
      
      /* 更新内容区域样式 */
      .ql-container.ql-snow {
        border: 1px solid #e2e8f0 !important;
        border-top: none !important;
        border-bottom-left-radius: 0.375rem !important;
        border-bottom-right-radius: 0.375rem !important;
        flex: 1 !important;
        height: auto !important;
        overflow: auto !important;
      }
      
      /* 编辑区域 */
      .ql-editor {
        min-height: calc(100vh - 15rem) !important;
        padding: 1rem;
      }
      
      /* 标题样式 */
      .ql-editor h1 {
        font-size: 1.875rem;
        font-weight: 700;
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
      
      /* 代码块样式 */
      .ql-editor pre.ql-syntax {
        background-color: #282c34;
        color: #abb2bf;
        overflow: auto;
        padding: 1rem;
        border-radius: 0.375rem;
      }
      
      /* 复选框列表样式改进 */
      .ql-editor ul[data-checked] {
        pointer-events: auto;
      }
      
      .ql-editor ul[data-checked] > li {
        position: relative;
        padding-left: 2em;
        list-style-type: none;
      }
      
      .ql-editor ul[data-checked] > li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.2em;
        width: 1.2em;
        height: 1.2em;
        border: 1px solid #ccc;
        border-radius: 2px;
        background-color: white;
        cursor: pointer;
      }
      
      .ql-editor ul[data-checked=true] > li::before {
        content: '✓';
        color: white;
        background-color: #10b981;
        border-color: #10b981;
        font-size: 0.8em;
        line-height: 1.2em;
        text-align: center;
      }
      
      .ql-editor ul[data-checked=true] > li {
        text-decoration: line-through;
        color: #9ca3af;
      }
      
      /* 更多中文翻译 */
      .ql-snow .ql-picker.ql-align .ql-picker-label::before {
        content: '对齐方式';
      }
      
      .ql-snow .ql-picker.ql-align .ql-picker-item[data-value=""]::before,
      .ql-snow .ql-picker.ql-align .ql-picker-label[data-value=""]::before {
        content: '左对齐';
      }
      
      .ql-snow .ql-picker.ql-align .ql-picker-item[data-value="center"]::before,
      .ql-snow .ql-picker.ql-align .ql-picker-label[data-value="center"]::before {
        content: '居中';
      }
      
      .ql-snow .ql-picker.ql-align .ql-picker-item[data-value="right"]::before,
      .ql-snow .ql-picker.ql-align .ql-picker-label[data-value="right"]::before {
        content: '右对齐';
      }
      
      .ql-snow .ql-picker.ql-align .ql-picker-item[data-value="justify"]::before,
      .ql-snow .ql-picker.ql-align .ql-picker-label[data-value="justify"]::before {
        content: '两端对齐';
      }
      
      .ql-snow .ql-picker.ql-font .ql-picker-label::before {
        content: '字体';
      }
      
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before,
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before {
        content: '无衬线体';
      }
      
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before,
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before {
        content: '衬线体';
      }
      
      .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before,
      .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before {
        content: '等宽字体';
      }
      
      /* 标题翻译 */  
      .ql-snow .ql-picker.ql-header .ql-picker-label::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item::before {
        content: '正文';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
        content: '标题1';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
        content: '标题2';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
        content: '标题3';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
        content: '标题4';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
        content: '标题5';
      }
      
      .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
      .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
        content: '标题6';
      }
      
      /* 字号翻译 */
      .ql-snow .ql-picker.ql-size .ql-picker-label::before,
      .ql-snow .ql-picker.ql-size .ql-picker-item::before {
        content: '标准';
      }
      
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before,
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
        content: '小号';
      }
      
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before,
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
        content: '大号';
      }
      
      .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before,
      .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
        content: '超大';
      }

      /* 添加复选框自定义样式 */
      .ql-editor ul[data-checked=true] > li {
        text-decoration: line-through;
        color: #6b7280; /* 使文本颜色变淡 */
        position: relative;
      }
      
      .ql-editor ul[data-checked=false] > li {
        position: relative;
      }

      /* 显示对号而不是默认的填充 */
      .ql-editor ul[data-checked=true] > li::before {
        content: '✓' !important;
        color: #10b981 !important; /* 绿色对号 */
        font-weight: bold !important;
        font-size: 14px !important;
        border: 1px solid #10b981 !important;
        border-radius: 2px !important;
        background-color: transparent !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 16px !important;
        height: 16px !important;
        margin-right: 5px !important;
      }
      
      /* 美化未选中的复选框 */
      .ql-editor ul[data-checked=false] > li::before {
        content: '' !important;
        border: 1px solid #d1d5db !important;
        border-radius: 2px !important;
        background-color: white !important;
        width: 16px !important;
        height: 16px !important;
        margin-right: 5px !important;
      }
      
      /* 使复选框垂直居中对齐文本 */
      .ql-editor ul[data-checked] > li::before {
        top: 50% !important;
        transform: translateY(-50%) !important;
      }
      
      /* 移除编辑器默认的padding，让文本填充整个区域 */
      .ql-editor {
        padding: 16px !important;
      }
      
      /* 移除编辑器上方的边框 */
      .ql-container.ql-snow {
        border-top: none !important;
      }
    `}</style>
  );
};

export default { QuillStyles }; 