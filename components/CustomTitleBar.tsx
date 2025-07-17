'use client';
import React, { useState, useEffect } from 'react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import { useClient } from '@/lib/hooks/use-client';
import PinWindowButton from './PinWindowButton';
// 更新 electron 接口定义
declare global {
  interface Window {
    electron?: {
      send: (channel: string, ...args: any[]) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke?: (channel: string, ...args: any[]) => Promise<any>;
    };
    windowControls?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
    };
  }
}
const CustomTitleBar: React.FC = () => {
  const isClient = useClient();
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    if (!isClient) return;
    const checkMaximized = async () => {
      if (window.windowControls?.isMaximized) {
        const maximized = await window.windowControls.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
    // 监听窗口大小变化
    const handleResize = () => {
      checkMaximized();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);
  if (!isClient) {
    return null; // 在服务器端渲染时不显示
  }
  const handleMinimize = () => {
    if (window.windowControls?.minimize) {
      window.windowControls.minimize();
    } else {
      // 使用消息通道
      window.electron?.send('window-control', 'minimize');
    }
  };
  const handleMaximize = () => {
    if (window.windowControls?.maximize) {
      window.windowControls.maximize();
    } else {
      // 使用消息通道
      window.electron?.send('window-control', 'maximize');
    }
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => {
    if (window.windowControls?.close) {
      window.windowControls.close();
    } else {
      // 使用消息通道
      window.electron?.send('window-control', 'close');
    }
  };
  return (
    <div className="app-title-bar flex items-center justify-between h-[30px] bg-white border-b border-gray-200 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* 左侧: 应用图标和名称 */}
      <div className="flex items-center px-3 gap-2">
        <div className="w-5 h-5 relative">
          <Image 
            src="/icons/icon-64x64.png" 
            alt="App Icon" 
            width={20} 
            height={20}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">艾森豪威尔矩阵</span>
      </div>
      {/* 右侧: 窗口控制按钮 */}
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* 添加钉住按钮 */}
        <PinWindowButton />
        <button 
          onClick={handleMinimize}
          className="w-10 h-[30px] flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Minus className="h-3.5 w-3.5 text-gray-600" />
        </button>
        <button 
          onClick={handleMaximize}
          className="w-10 h-[30px] flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          {isMaximized ? 
            <Square className="h-3.5 w-3.5 text-gray-600" /> : 
            <Maximize2 className="h-3.5 w-3.5 text-gray-600" />
          }
        </button>
        <button 
          onClick={handleClose}
          className="w-10 h-[30px] flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
export default CustomTitleBar; 