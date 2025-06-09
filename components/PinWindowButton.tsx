'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pin, PinOff, AlertCircle } from 'lucide-react';
import { usePinWindow } from '@/lib/hooks/use-pin-window';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PinWindowButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  debug?: boolean;
  isCollapsed?: boolean;
}

export function PinWindowButton({ 
  variant = 'outline', 
  size = 'default',
  className = '',
  debug = false,
  isCollapsed = false
}: PinWindowButtonProps) {
  const { isPinned, togglePin, refreshStatus, error, isAvailable } = usePinWindow();
  const [buttonState, setButtonState] = useState(false);
  
  // 初始化和状态变化时更新按钮状态
  useEffect(() => {
    setButtonState(isPinned);
    
    // 组件挂载时刷新状态
    refreshStatus();
    
    // 定期刷新状态
    const intervalId = setInterval(() => {
      refreshStatus();
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isPinned, refreshStatus]);
  
  // 显示调试信息
  if (debug) {
    console.log('[PinWindowButton]', { isPinned, buttonState, error, isAvailable });
  }
  
  // 功能不可用时，可以选择显示一个禁用的按钮或返回null
  if (!isAvailable) {
    if (debug) {
      return (
        <Button variant="outline" size={size} disabled className={className}>
          <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
          不支持钉在桌面
        </Button>
      );
    }
    return null;
  }
  
  // 有错误时显示错误按钮
  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size={size}
              className={className}
              onClick={() => console.error('[PinWindowButton] 错误:', error)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              钉在桌面
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="text-red-500">错误: {error}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const handleToggle = () => {
    togglePin();
    // 立即更新按钮状态，提供即时反馈
    setButtonState(!buttonState);
    // 延迟后再次刷新状态，确保与主进程同步
    setTimeout(refreshStatus, 500);
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleToggle}
            className={className}
          >
            {buttonState ? (
              <>
                <PinOff className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
                <span className={`transition-opacity duration-300 ease-in-out whitespace-nowrap ${
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}>
                  取消钉在桌面
                </span>
              </>
            ) : (
              <>
                <Pin className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
                <span className={`transition-opacity duration-300 ease-in-out whitespace-nowrap ${
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}>
                  钉在桌面
                </span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {buttonState ? "取消置顶窗口" : "将窗口固定在最上层"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PinWindowButton; 