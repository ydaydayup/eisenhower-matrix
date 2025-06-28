'use client';

import { useState, useEffect } from 'react';

/**
 * 检测代码是否在客户端运行的钩子
 * @returns {boolean} 如果代码在客户端运行，则返回true
 */
export function useClient() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
} 