import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// 使用单例模式确保只有一个 Supabase 客户端实例

export const getSupabaseClient = () => {
  return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


// 导出单例实例
export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null

