// "use client";

// import { useEffect, useState } from 'react';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";

// /**
//  * 开发环境认证状态测试组件
//  * 用于显示当前认证绕过状态并提供测试功能
//  */
// export default function DevBypassTest() {
//   const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
//   const [debugInfo, setDebugInfo] = useState<any>(null);
//   const isDevelopment = process.env.NODE_ENV === 'development';
//   const devBypassAuth = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

//   // 检查认证状态
//   useEffect(() => {
//     const checkAuthStatus = async () => {
//       try {
//         // 调用认证调试API
//         const response = await fetch('/api/auth-debug/auth-status');
//         const data = await response.json();
        
//         setAuthStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
//         setDebugInfo(data);
//       } catch (error) {
//         console.error('认证状态检查失败:', error);
//         setAuthStatus('unauthenticated');
//       }
//     };
    
//     checkAuthStatus();
//   }, []);

//   // 仅在开发环境中显示此组件
//   if (!isDevelopment) return null;

//   return (
//     <Alert className={`mb-4 border-2 ${devBypassAuth ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950' : 'border-blue-400 bg-blue-50 dark:bg-blue-950'}`}>
//       <AlertTitle className="flex items-center gap-2">
//         开发模式 
//         <Badge variant="outline" className={`ml-2 ${devBypassAuth 
//           ? 'bg-yellow-200 text-black' 
//           : 'bg-blue-200 text-black'}`}>
//           DEV_BYPASS_AUTH = {devBypassAuth ? '开启' : '关闭'}
//         </Badge>
//       </AlertTitle>
//       <AlertDescription className="mt-2">
//         <div className="text-sm mb-2">
//           当前认证状态: {' '}
//           {authStatus === 'loading' ? (
//             <span>检查中...</span>
//           ) : authStatus === 'authenticated' ? (
//             <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">已认证</Badge>
//           ) : (
//             <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">未认证</Badge>
//           )}
//         </div>
        
//         <div className="text-xs text-muted-foreground mb-2">
//           {devBypassAuth 
//             ? '认证绕过已启用，可以直接访问仪表盘，无需登录' 
//             : '认证绕过已关闭，访问仪表盘需要正常登录'}
//         </div>
        
//         {debugInfo && (
//           <div className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
//             <p>Debug信息: {JSON.stringify(debugInfo)}</p>
//             <p>时间戳: {debugInfo.timestamp}</p>
//           </div>
//         )}
        
//         <div className="flex gap-2 mt-3">
//           <Button 
//             variant="outline" 
//             size="sm" 
//             onClick={() => window.location.href = '/api/auth-debug'}
//           >
//             查看完整认证信息
//           </Button>
//           <Button 
//             variant="outline" 
//             size="sm" 
//             onClick={() => window.location.href = '/login'}
//           >
//             前往登录
//           </Button>
//         </div>
//       </AlertDescription>
//     </Alert>
//   );
// } 