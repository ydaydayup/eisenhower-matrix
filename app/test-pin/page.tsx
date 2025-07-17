'use client';
import { Button } from "@/components/ui/button";
import PinWindowButton from "@/components/PinWindowButton";
import { usePinWindow } from "@/lib/hooks/use-pin-window";
export default function TestPinPage() {
  const { isPinned, togglePin, error, isAvailable } = usePinWindow();
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">钉在桌面功能测试</h1>
      <div className="space-y-6 p-6 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div className="font-medium">功能可用:</div>
          <div>{isAvailable ? '✅ 可用' : '❌ 不可用'}</div>
          <div className="font-medium">当前状态:</div>
          <div>{isPinned ? '📌 已钉在桌面' : '📎 未钉在桌面'}</div>
          <div className="font-medium">错误信息:</div>
          <div className="text-red-500">{error || '无'}</div>
        </div>
        <div className="flex space-x-4 pt-4 border-t">
          <Button onClick={togglePin}>
            {isPinned ? '取消钉在桌面' : '钉在桌面'} (直接调用)
          </Button>
          <PinWindowButton debug={true} variant="default" />
        </div>
        <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
          <h3 className="font-medium mb-2">调试信息</h3>
          <pre className="whitespace-pre-wrap">
            isPinned: {String(isPinned)}<br />
            isAvailable: {String(isAvailable)}<br />
            error: {error || 'null'}<br />
            window.electron: {typeof window !== 'undefined' && window.electron ? '存在' : '不存在'}
          </pre>
        </div>
      </div>
    </div>
  );
} 