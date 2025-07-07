'use client';
import { useState, useEffect, useCallback } from 'react';
import { useClient } from './use-client';
// 状态类型定义
interface PinState {
  isPinned: boolean;
  timestamp: number;
}
/**
 * 使用钉在桌面功能的Hook
 * 提供钉在桌面状态和切换功能
 */
export function usePinWindow() {
  const isClient = useClient();
  const [isPinned, setIsPinned] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // 刷新状态的函数
  const refreshStatus = useCallback(() => {
    if (isClient && typeof window !== 'undefined' && window.electron) {
      try {
        window.electron.send('get-pin-status');
      } catch (err) {
      }
    }
  }, [isClient]);
  // 初始化和监听状态变化
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }
    if (!window.electron) {
      setError('Electron API未加载');
      return;
    }
    // 获取初始状态通过IPC调用
    try {
      window.electron.send('get-pin-status');
    } catch (err) {
      setError('发送状态请求失败');
    }
    // 监听来自主进程的状态更新 - 旧通道，保持兼容性
    try {
      window.electron.receive('pin-window-status', (pinned) => {
        // 强制更新状态，不进行比较
        setIsPinned(!!pinned);
      });
    } catch (err) {
    }
    // 监听来自主进程的状态同步 - 新通道，包含更多信息
    try {
      window.electron.receive('pin-window-state-sync', (state: PinState) => {
        if (state && typeof state === 'object') {
          // 强制更新状态，不进行比较
          setIsPinned(!!state.isPinned);
          setLastUpdate(state.timestamp || Date.now());
        }
      });
    } catch (err) {
      setError('设置状态监听器失败');
    }
    // 组件挂载时请求一次最新状态
    refreshStatus();
    // 组件卸载时的清理
    return () => {};
  }, [isClient, refreshStatus]);
  // 窗口获得焦点时刷新状态
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && window.electron) {
      const handleFocus = () => {
        refreshStatus();
      };
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isClient, refreshStatus]);
  // 切换钉在桌面状态
  const togglePin = () => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }
    if (!window.electron) {
      setError('Electron API未加载');
      return;
    }
    try {
      window.electron.send('toggle-pin-window');
      // 添加延迟检查，确认状态是否已更新
      setTimeout(() => {
        refreshStatus(); // 主动请求刷新状态
      }, 500);
    } catch (err) {
      setError('切换状态失败');
    }
  };
  // 直接设置钉在桌面状态
  const setPinStatus = (status: boolean) => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }
    if (!window.electron) {
      setError('Electron API未加载');
      return;
    }
    // 确保status是布尔值
    const newStatus = !!status;
    try {
      // 使用消息通道直接设置状态
      if (window.electron.send) {
        // 使用send方法，这是预加载脚本中定义的通用方法
        window.electron.send('set-pin-status', newStatus);
        // 添加延迟检查，确认状态是否已更新
        setTimeout(() => {
          if (isPinned !== newStatus) {
            refreshStatus(); // 主动请求刷新状态
          }
        }, 500);
      } else {
        setError('send方法不存在');
        throw new Error('send方法不存在');
      }
    } catch (err) {
      setError('设置状态失败');
      // 尝试使用togglePin作为备选方案
      if (isPinned !== newStatus) {
        try {
          togglePin();
        } catch (toggleErr) {
        }
      }
    }
  };
  return {
    isPinned,
    lastUpdate,
    togglePin,
    setPinStatus,
    refreshStatus,
    error,
    isAvailable: isClient && typeof window !== 'undefined' && !!window.electron
  };
} 