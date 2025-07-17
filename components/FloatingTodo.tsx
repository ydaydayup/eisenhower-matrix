import React, { useState, useEffect } from 'react';
import { X, Minus, Settings, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Task } from '@/lib/tasks';
// 声明 Electron IPC 接口
declare global {
  interface Window {
    electronAPI: {
      closeFloatingWindow: () => void;
      minimizeFloatingWindow: () => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      saveWindowPosition: (position: { x: number; y: number }) => void;
      setOpacity: (opacity: number) => void;
      openMainWindow: () => void;
      startDrag: () => void;
    };
  }
}
interface FloatingTodoProps {
  initialTasks?: Task[];
}
const FloatingTodo: React.FC<FloatingTodoProps> = ({ initialTasks = [] }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [opacity, setOpacity] = useState<number>(0.9);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  // 从本地存储加载任务数据
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('floatingTasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
    }
  }, []);
  // 保存任务到本地存储
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('floatingTasks', JSON.stringify(tasks));
    }
  }, [tasks]);
  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    // 使用Electron的原生拖拽API
    if (window.electronAPI && window.electronAPI.startDrag) {
      window.electronAPI.startDrag();
    }
  };
  // 切换任务完成状态
  const toggleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };
  // 处理透明度变化
  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    if (window.electronAPI) {
      window.electronAPI.setOpacity(newOpacity);
    }
  };
  // 关闭窗口
  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeFloatingWindow();
    }
  };
  // 最小化窗口
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeFloatingWindow();
    }
  };
  // 打开主窗口
  const handleOpenMainWindow = () => {
    if (window.electronAPI) {
      window.electronAPI.openMainWindow();
    }
  };
  // 根据任务的紧急性和重要性确定颜色
  const getTaskColor = (quadrant: number) => {
    switch(quadrant) {
      case 1: return 'bg-red-100 border-red-500'; // 紧急且重要
      case 2: return 'bg-blue-100 border-blue-500'; // 重要不紧急
      case 3: return 'bg-yellow-100 border-yellow-500'; // 紧急不重要
      case 4: return 'bg-green-100 border-green-500'; // 不紧急不重要
      default: return 'bg-gray-100 border-gray-500';
    }
  };
  return (
    <div 
      id="floating-window"
      className={cn(
        "flex flex-col w-full h-full bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        isDragging && "cursor-grabbing"
      )}
      style={{ 
        opacity,
        WebkitAppRegion: 'drag' 
      } as React.CSSProperties}
    >
      {/* 窗口标题栏 - 明显的白色 */}
      <div 
        className="flex items-center justify-between px-3 h-[30px] bg-white border-b border-gray-200"
        onMouseDown={handleDragStart}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-500 cursor-grab" />
          <span className="text-sm font-medium text-gray-800">待办事项</span>
        </div>
        <div 
          className="flex items-center gap-1" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Settings className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <button 
            onClick={handleMinimize}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Minus className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <button 
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>
      {/* 内容区域 */}
      <div 
        className="flex flex-col flex-1 overflow-hidden"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 设置面板 */}
        {showSettings && (
          <div 
            className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">透明度</label>
                <input 
                  type="range" 
                  min="0.3" 
                  max="1" 
                  step="0.1" 
                  value={opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <button 
                onClick={handleOpenMainWindow}
                className="w-full text-xs py-1 px-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                打开主窗口
              </button>
            </div>
          </div>
        )}
        {/* 任务列表 */}
        <div 
          className="flex-1 overflow-y-auto p-2 space-y-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {tasks.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              没有待办事项
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id}
                className={cn(
                  "p-2 rounded border-l-4 shadow-sm",
                  getTaskColor(task.quadrant),
                  task.completed && "opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={cn("text-sm", task.completed && "line-through text-gray-500")}>
                      {task.title}
                    </p>
                    {/* 显示截止日期 */}
                    {task.due_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                    {/* 显示标签 */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default FloatingTodo; 