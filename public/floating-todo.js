// 这个文件将由构建过程生成
// 在开发环境中，我们可以使用以下简单的代码加载React组件
(function() {
  // 获取任务数据
  function loadTasks() {
    try {
      const savedTasks = localStorage.getItem('floatingTasks');
      return savedTasks ? JSON.parse(savedTasks) : [];
    } catch (error) {
      return [];
    }
  }
  // 创建简单的DOM结构
  function createBasicUI() {
    const root = document.getElementById('root');
    if (!root) return;
    // 创建容器
    const container = document.createElement('div');
    container.id = 'floating-window';
    container.className = 'floating-container';
    // 创建明显的标题栏
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.style.cssText = 'background-color: #ffffff; height: 30px; -webkit-app-region: drag;';
    const titleText = document.createElement('div');
    titleText.className = 'title-text';
    titleText.textContent = '待办事项';
    const controls = document.createElement('div');
    controls.className = 'window-controls';
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'control-button minimize';
    minimizeBtn.textContent = '_';
    minimizeBtn.onclick = () => {
      if (window.electronAPI && window.electronAPI.minimizeFloatingWindow) {
        window.electronAPI.minimizeFloatingWindow();
      }
    };
    const closeBtn = document.createElement('button');
    closeBtn.className = 'control-button close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      if (window.electronAPI && window.electronAPI.closeFloatingWindow) {
        window.electronAPI.closeFloatingWindow();
      }
    };
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    titleBar.appendChild(titleText);
    titleBar.appendChild(controls);
    // 整个窗口可拖动，但控件区域不可拖动
    container.style.cssText = '-webkit-app-region: drag;';
    controls.style.cssText = '-webkit-app-region: no-drag;';
    // 创建内容容器（与标题栏分离）
    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';
    contentContainer.style.cssText = '-webkit-app-region: no-drag;';
    // 创建任务列表容器
    const taskList = document.createElement('div');
    taskList.className = 'task-list';
    taskList.style.cssText = '-webkit-app-region: no-drag;'; // 任务列表不可拖动，确保可以选择文本和点击复选框
    // 加载任务
    const tasks = loadTasks();
    if (tasks.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = '没有待办事项';
      taskList.appendChild(emptyMessage);
    } else {
      tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item quadrant-${task.quadrant || 4}`;
        if (task.completed) {
          taskItem.classList.add('completed');
        }
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.onchange = () => {
          task.completed = checkbox.checked;
          localStorage.setItem('floatingTasks', JSON.stringify(tasks));
          taskItem.classList.toggle('completed', checkbox.checked);
        };
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        const taskTitle = document.createElement('div');
        taskTitle.className = 'task-title';
        taskTitle.textContent = task.title;
        taskContent.appendChild(taskTitle);
        if (task.due_date) {
          const dueDate = document.createElement('div');
          dueDate.className = 'due-date';
          dueDate.textContent = new Date(task.due_date).toLocaleDateString();
          taskContent.appendChild(dueDate);
        }
        if (task.tags && task.tags.length > 0) {
          const tagsContainer = document.createElement('div');
          tagsContainer.className = 'tags-container';
          task.tags.forEach(tag => {
            const tagBadge = document.createElement('span');
            tagBadge.className = 'tag-badge';
            tagBadge.textContent = tag;
            tagsContainer.appendChild(tagBadge);
          });
          taskContent.appendChild(tagsContainer);
        }
        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskContent);
        taskList.appendChild(taskItem);
      });
    }
    // 添加"打开主窗口"按钮
    const openMainBtn = document.createElement('button');
    openMainBtn.className = 'open-main-button';
    openMainBtn.textContent = '打开主窗口';
    openMainBtn.style.cssText = '-webkit-app-region: no-drag;'; // 按钮不可拖动，确保可以点击
    openMainBtn.onclick = () => {
      if (window.electronAPI && window.electronAPI.openMainWindow) {
        window.electronAPI.openMainWindow();
      }
    };
    // 组装UI
    contentContainer.appendChild(taskList);
    contentContainer.appendChild(openMainBtn);
    container.appendChild(titleBar);
    container.appendChild(contentContainer);
    root.appendChild(container);
  }
  // 初始化
  document.addEventListener('DOMContentLoaded', createBasicUI);
})(); 