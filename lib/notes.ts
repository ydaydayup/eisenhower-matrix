"use client"

import { getSupabaseClient } from "./supabase/client"

// 定义备忘录类型
export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

// 获取用户的所有备忘录
export const getUserNotes = async (userId: string): Promise<Note[]> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching notes:", error)
    return []
  }

  return data || []
}

// 创建新备忘录
export const createNote = async (note: Omit<Note, "id" | "created_at" | "updated_at">): Promise<Note | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("notes").insert([note]).select().single()

  if (error) {
    console.error("Error creating note:", error)
    return null
  }

  return data
}

// 更新备忘录
export const updateNote = async (
  id: string,
  updates: Partial<Omit<Note, "id" | "created_at" | "updated_at">>,
): Promise<Note | null> => {
  const supabase = getSupabaseClient()
  
  try {
    console.log(`准备更新备忘录 ${id}`, {
      title_length: updates.title?.length,
      content_length: updates.content?.length,
      timestamp: new Date().toISOString()
    });
    
    // 确保content是字符串类型
    const safeUpdates = {
      ...updates,
      content: typeof updates.content === 'string' ? updates.content : '',
      updated_at: new Date().toISOString()
    };
    
    // 执行更新操作
    const { data, error } = await supabase
      .from("notes")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating note:", error);
      console.error("Error details:", error.message, error.details, error.hint);
      return null;
    }

    console.log(`备忘录 ${id} 更新成功`, {
      returned_data: !!data,
      updated_at: data?.updated_at
    });
    
    return data;
  } catch (err) {
    console.error(`更新备忘录时发生意外错误:`, err);
    return null;
  }
}

// 删除备忘录
export const deleteNote = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("notes").delete().eq("id", id)

  if (error) {
    console.error("Error deleting note:", error)
    return false
  }

  return true
}

