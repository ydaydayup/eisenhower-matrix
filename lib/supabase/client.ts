import { createClient } from "@supabase/supabase-js"

// 使用单例模式确保只有一个 Supabase 客户端实例
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  // 服务器端渲染时返回模拟客户端
  if (typeof window === "undefined") {
    return createMockClient()
  }

  // 如果实例已存在，直接返回
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing")
    return createMockClient(true)
  }

  // 创建新实例
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "eisenhower-matrix-auth",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce", // 使用 PKCE 流程增强安全性
    },
  })

  return supabaseInstance
}

// 创建模拟客户端
function createMockClient(isError = false) {
  return {
    auth: {
      signInWithPassword: () =>
        Promise.resolve({
          data: {},
          error: isError ? new Error("Supabase configuration missing") : null,
        }),
      signUp: () =>
        Promise.resolve({
          data: {},
          error: isError ? new Error("Supabase configuration missing") : null,
        }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      resetPasswordForEmail: () =>
        Promise.resolve({
          error: isError ? new Error("Supabase configuration missing") : null,
        }),
      updateUser: () =>
        Promise.resolve({
          error: isError ? new Error("Supabase configuration missing") : null,
        }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resend: () =>
        Promise.resolve({
          error: isError ? new Error("Supabase configuration missing") : null,
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }
}

// 导出单例实例
export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null

