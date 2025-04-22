import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware";

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === "development"
// 读取环境变量中的配置，如果未设置则默认为false
const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" ? true : false

export async function middleware(request: NextRequest) {
  // 打印请求路径，便于调试
  console.log(`[Middleware] 处理请求: ${request.nextUrl.pathname}`);
  console.log(`[Middleware] 环境: ${isDevelopment ? '开发环境' : '生产环境'}`);
  console.log(`[Middleware] 绕过认证设置: ${DEV_BYPASS_AUTH ? '启用' : '禁用'}`);
  
  // 开发环境下，只有当DEV_BYPASS_AUTH为true时才绕过对dashboard路径的认证拦截
  if (isDevelopment && DEV_BYPASS_AUTH && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log(`[DEV Middleware] 开发环境：允许直接访问仪表盘: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }
  
  // 输出请求的cookie信息，便于调试
  console.log(`[Middleware] Cookie 数量: ${request.cookies.size}`);
  if (request.cookies.size > 0) {
    const cookieNames = request.cookies.getAll().map(c => c.name).join(', ');
    console.log(`[Middleware] Cookie 名称: ${cookieNames}`);
  }
  
  // 检查日志后再进行重定向
  const response = await updateSession(request);
  
  // 打印重定向信息，如果适用
  if (response.headers.get("Location")) {
    console.log(`[Middleware] 重定向到: ${response.headers.get("Location")}`);
  } else {
    console.log(`[Middleware] 允许访问: ${request.nextUrl.pathname}`);
  }
  
  return response;
}

// 只匹配需要处理的路径
// export const config = {
//     matcher: ["/", "/dashboard/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
// }

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - manifest.json and icons for PWA
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|fonts|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}