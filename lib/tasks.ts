"use client"

import { getSupabaseClient } from "./supabase/client"

// 定义任务类型
export type Task = {
  id: string
  user_id: string
  title: string
  quadrant: 1 | 2 | 3 | 4
  due_date: string | null
  tags: string[]
  notes: string
  completed: boolean
  created_at: string
}

// 获取用户的所有任务
export const getUserTasks = async (userId: string): Promise<Task[]> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data || []
}

// 创建新任务
export const createTask = async (task: Omit<Task, "id" | "created_at">): Promise<Task | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("tasks").insert([task]).select().single()

  if (error) {
    console.error("Error creating task:", error)
    return null
  }

  return data
}

// 更新任务
export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("Error updating task:", error)
    return null
  }

  return data
}

// 删除任务
export const deleteTask = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("tasks").delete().eq("id", id)

  if (error) {
    console.error("Error deleting task:", error)
    return false
  }

  return true
}

