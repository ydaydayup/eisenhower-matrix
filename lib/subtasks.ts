"use client"

import { getSupabaseClient } from "./supabase/client"

// 定义子任务类型
export type Subtask = {
  id: string
  task_id: string
  title: string
  completed: boolean
  created_at: string
}

// 获取任务的所有子任务
export const getTaskSubtasks = async (taskId: string): Promise<Subtask[]> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching subtasks:", error)
    return []
  }

  return data || []
}

// 创建新子任务
export const createSubtask = async (subtask: Omit<Subtask, "id" | "created_at">): Promise<Subtask | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("subtasks").insert([subtask]).select().single()

  if (error) {
    console.error("Error creating subtask:", error)
    return null
  }

  return data
}

// 更新子任务
export const updateSubtask = async (id: string, updates: Partial<Subtask>): Promise<Subtask | null> => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("subtasks").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("Error updating subtask:", error)
    return null
  }

  return data
}

// 删除子任务
export const deleteSubtask = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("subtasks").delete().eq("id", id)

  if (error) {
    console.error("Error deleting subtask:", error)
    return false
  }

  return true
} 