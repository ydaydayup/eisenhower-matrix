"use client"
import { getSupabaseClient, supabase } from "./supabase/client"
// 定义标签类型
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}
// 获取用户的所有标签
export const getUserTags = async (userId: string): Promise<Tag[]> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name")
  if (error) {
    return []
  }
  return data || []
}
// 创建新标签
export const createTag = async (tag: Omit<Tag, "id" | "created_at">): Promise<Tag | null> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client.from("tags").insert([tag]).select().single()
  if (error) {
    return null
  }
  return data
}
// 更新标签
export const updateTag = async (id: string, updates: Partial<Tag>): Promise<Tag | null> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client.from("tags").update(updates).eq("id", id).select().single()
  if (error) {
    return null
  }
  return data
}
// 删除标签
export const deleteTag = async (id: string): Promise<boolean> => {
  const client = supabase || await getSupabaseClient()
  const { error } = await client.from("tags").delete().eq("id", id)
  if (error) {
    return false
  }
  return true
}
