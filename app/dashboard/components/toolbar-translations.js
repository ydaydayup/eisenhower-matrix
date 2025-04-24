// Quill编辑器工具栏按钮中文翻译配置

const toolbarTranslations = {
  // 格式按钮
  'bold': '加粗',
  'italic': '斜体',
  'underline': '下划线',
  'strike': '删除线',
  
  // 列表按钮
  'list-ordered': '有序列表',
  'list-bullet': '无序列表',
  'list-check': '勾选列表',
  
  // 缩进按钮
  'indent-minus': '减少缩进',
  'indent-plus': '增加缩进',
  
  // 对齐方式
  'align': '对齐方式',
  'align-left': '左对齐',
  'align-center': '居中对齐',
  'align-right': '右对齐',
  'align-justify': '两端对齐',
  
  // 链接和媒体
  'link': '添加链接',
  'image': '插入图片',
  
  // 引用和代码块
  'blockquote': '引用',
  'code-block': '代码块',
  
  // 标题
  'header': '标题',
  'header-1': '标题1',
  'header-2': '标题2',
  'header-3': '标题3',
  'header-4': '标题4',
  'header-5': '标题5',
  'header-6': '标题6',
  
  // 字体和大小
  'font': '字体',
  'size': '字号',
  'size-small': '小',
  'size-normal': '正常',
  'size-large': '大',
  'size-huge': '超大',
  
  // 颜色
  'color': '文字颜色',
  'background': '背景颜色',
  
  // 其他
  'clean': '清除格式',
};

// 应用翻译到工具栏按钮的函数
const applyToolbarTranslations = (editor) => {
  if (!editor || typeof document === 'undefined') return;
  
  const toolbarEl = editor.container.querySelector('.ql-toolbar');
  if (!toolbarEl) return;
  
  // 处理工具栏按钮
  const buttons = toolbarEl.querySelectorAll('button');
  buttons.forEach(button => {
    // 找出按钮类型
    const className = Array.from(button.classList)
      .find(cls => cls.startsWith('ql-') && cls !== 'ql-picker');
    
    if (!className) return;
    
    // 提取按钮名称
    const buttonType = className.replace('ql-', '');
    const translation = toolbarTranslations[buttonType];
    
    if (translation) {
      // 设置工具提示
      button.setAttribute('title', translation);
      
      // 对于一些特殊按钮，可以直接替换内容
      if (['bold', 'italic', 'underline', 'strike'].includes(buttonType)) {
        // 保留原始样式但加入中文
        if (buttonType === 'bold') button.innerHTML = '<strong>B</strong>';
        if (buttonType === 'italic') button.innerHTML = '<em>I</em>';
        if (buttonType === 'underline') button.innerHTML = '<u>U</u>';
        if (buttonType === 'strike') button.innerHTML = '<s>S</s>';
      } else if (['blockquote', 'code-block', 'link', 'image', 'clean'].includes(buttonType)) {
        // 直接使用中文
        button.innerHTML = translation;
      } else if (buttonType === 'list' && button.value === 'ordered') {
        button.innerHTML = '1.';
      } else if (buttonType === 'list' && button.value === 'bullet') {
        button.innerHTML = '•';
      } else if (buttonType === 'list' && button.value === 'check') {
        button.innerHTML = '☑';
      }
    }
  });
  
  // 处理下拉选择器
  const selects = toolbarEl.querySelectorAll('select');
  selects.forEach(select => {
    const className = Array.from(select.classList)
      .find(cls => cls.startsWith('ql-'));
    
    if (!className) return;
    
    const selectType = className.replace('ql-', '');
    const translation = toolbarTranslations[selectType];
    
    if (translation) {
      // 为选择器添加标签
      const selectContainer = select.parentElement;
      if (selectContainer) {
        // 检查是否已有标签
        if (!selectContainer.querySelector('.select-label')) {
          const labelSpan = document.createElement('span');
          labelSpan.className = 'select-label';
          labelSpan.innerHTML = translation;
          labelSpan.style.position = 'absolute';
          labelSpan.style.left = '5px';
          labelSpan.style.top = '50%';
          labelSpan.style.transform = 'translateY(-50%)';
          labelSpan.style.pointerEvents = 'none';
          labelSpan.style.fontSize = '13px';
          labelSpan.style.color = 'var(--foreground)';
          selectContainer.appendChild(labelSpan);
          
          // 调整选择框样式
          select.style.paddingLeft = '40px';
        }
      }
      
      // 翻译下拉选项
      if (selectType === 'header') {
        const options = select.querySelectorAll('option');
        options.forEach(option => {
          const value = option.value;
          if (value === '') {
            option.textContent = '正文';
          } else {
            const headerTranslation = toolbarTranslations[`header-${value}`];
            if (headerTranslation) {
              option.textContent = headerTranslation;
            }
          }
        });
      }
    }
  });
};

export { toolbarTranslations, applyToolbarTranslations }; 