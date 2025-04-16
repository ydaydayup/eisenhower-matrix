"use client"

import { getSupabaseClient } from "./supabase/client"

// 定义标签类型
export type Tag = {
  id: string
  user_id: string
  name: string
}

// 获取用户的所有标签
export const getUserTags = async (userId: string): Promise<Tag[]> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching tags:", error)
    return []
  }

  return data || []
}

// 创建新标签
export const createTag = async (tag: Omit<Tag, "id">): Promise<Tag | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("tags").insert([tag]).select().single()

  if (error) {
    console.error("Error creating tag:", error)
    return null
  }

  return data
}

// 更新标签
export const updateTag = async (id: string, name: string): Promise<Tag | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("tags").update({ name }).eq("id", id).select().single()

  if (error) {
    console.error("Error updating tag:", error)
    return null
  }

  return data
}

// 删除标签
export const deleteTag = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("tags").delete().eq("id", id)

  if (error) {
    console.error("Error deleting tag:", error)
    return false
  }

  return true
}

