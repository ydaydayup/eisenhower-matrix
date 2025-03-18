import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing in middleware")
    return NextResponse.next()
  }

  // 创建响应对象
  const res = NextResponse.next()

  try {
    // 创建中间件客户端
    const supabase = createMiddlewareClient({ req: request, res })

    // 获取会话
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // 获取请求路径
    const path = request.nextUrl.pathname

    // 调试信息
    console.log(`Middleware: Path=${path}, Session=${session ? "exists" : "null"}`)

    // 如果用户未登录且访问需要认证的路径
    if (!session && path.startsWith("/dashboard")) {
      console.log("Middleware: Redirecting to /login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // 如果用户已登录并访问登录/注册页面
    if ((path === "/login" || path === "/register" || path === "/" || path === "/forgot-password") && session) {
      console.log("Middleware: Redirecting to /dashboard")
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  } catch (error) {
    console.error("Error in middleware:", error)
  }

  return res
}

// 只匹配需要处理的路径
export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
}

