'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 扩展Navigator接口以支持Safari的standalone属性
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function PWAInstallButton() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallTip, setShowInstallTip] = useState(false);

  useEffect(() => {
    // 检查session storage中是否已经显示过提示
    const hasShownPrompt = sessionStorage.getItem('pwa-prompt-shown');
    
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
      
      // 只有在本次会话中没有显示过提示时才显示
      if (!hasShownPrompt) {
        setShowInstallTip(true);
        // 标记本次会话已显示过提示
        sessionStorage.setItem('pwa-prompt-shown', 'true');
      }
    };

    // 检测是否已安装
    const checkIsInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler as any);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallTip(false);
    });

    checkIsInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!promptInstall) return;
    
    try {
      await promptInstall.prompt();
      const choiceResult = await promptInstall.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallTip(false);
      }
    } catch (error) {
      console.error('PWA安装失败', error);
    }
  };

  if (!supportsPWA || isInstalled) return null;

  return (
    <>
      {showInstallTip && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span>将应用添加到主屏幕，离线使用更方便</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleInstallClick}>
              <Download className="h-4 w-4 mr-1" />
              安装
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowInstallTip(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
} 