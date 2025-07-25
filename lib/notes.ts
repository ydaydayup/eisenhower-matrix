"use client"
import { getSupabaseClient, supabase } from "./supabase/client"
// 定义笔记类型
export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  tags?: string[]
  quadrant?: 1 | 2 | 3 | 4 | null
  created_at: string
  updated_at: string
  is_pinned?: boolean
}
// 获取用户的所有笔记
export const getUserNotes = async (userId: string): Promise<Note[]> => {
  try {
    if (!userId) {
      return []
    }
    const client = supabase || await getSupabaseClient()
    if (!client) {
      return []
    }
    const { data, error } = await client
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
    if (error) {
      return []
    }
    return data || []
  } catch (err) {
    return []
  }
}
// 创建新笔记
export const createNote = async (note: Omit<Note, "id" | "created_at" | "updated_at">): Promise<Note | null> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client.from("notes").insert([note]).select().single()
  if (error) {
    return null
  }
  return data
}
// 更新笔记
export const updateNote = async (id: string, updates: Partial<Note>): Promise<Note | null> => {
  const client = supabase || await getSupabaseClient()
  // 添加更新时间
  const updatesWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await client
    .from("notes")
    .update(updatesWithTimestamp)
    .eq("id", id)
    .select()
    .single()
  if (error) {
    return null
  }
  return data
}
// 删除笔记
export const deleteNote = async (id: string): Promise<boolean> => {
  const client = supabase || await getSupabaseClient()
  const { error } = await client.from("notes").delete().eq("id", id)
  if (error) {
    return false
  }
  return true
}
// 搜索笔记
export const searchNotes = async (
  userId: string,
  query: string,
  options: {
    searchInTitle?: boolean
    searchInContent?: boolean
    tags?: string[]
    quadrant?: 1 | 2 | 3 | 4 | null
  } = {}
): Promise<Note[]> => {
  const client = supabase || await getSupabaseClient()
  // 构建基础查询
  let supabaseQuery = client.from("notes").select("*").eq("user_id", userId)
  // 添加搜索条件
  if (query) {
    const searchConditions = []
    if (options.searchInTitle !== false) {
      searchConditions.push(`title.ilike.%${query}%`)
    }
    if (options.searchInContent !== false) {
      searchConditions.push(`content.ilike.%${query}%`)
    }
    if (searchConditions.length > 0) {
      supabaseQuery = supabaseQuery.or(searchConditions.join(','))
    }
  }
  // 添加标签过滤
  if (options.tags && options.tags.length > 0) {
    // 在当前版本数据库中，notes表没有tags列，所以不应该使用此条件
    // 暂时注释掉，待数据库结构更新后再启用
    // supabaseQuery = supabaseQuery.contains('tags', options.tags)
  }
  // 添加象限过滤
  if (options.quadrant) {
    supabaseQuery = supabaseQuery.eq('quadrant', options.quadrant)
  }
  // 执行查询
  const { data, error } = await supabaseQuery
    .order("updated_at", { ascending: false })
  if (error) {
    return []
  }
  return data || []
}
