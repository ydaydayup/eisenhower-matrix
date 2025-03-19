import type { NextRequest } from "next/server"
import {updateSession} from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}