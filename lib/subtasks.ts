"use client"
import { getSupabaseClient, supabase } from "./supabase/client"
// 定义子任务类型
export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  created_at: string
}
// 获取任务的所有子任务
export const getTaskSubtasks = async (taskId: string): Promise<Subtask[]> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client
    .from("subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
  if (error) {
    return []
  }
  return data || []
}
// 创建新子任务
export const createSubtask = async (subtask: Omit<Subtask, "id" | "created_at">): Promise<Subtask | null> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client.from("subtasks").insert([subtask]).select().single()
  if (error) {
    return null
  }
  return data
}
// 更新子任务
export const updateSubtask = async (id: string, updates: Partial<Subtask>): Promise<Subtask | null> => {
  const client = supabase || await getSupabaseClient()
  const { data, error } = await client.from("subtasks").update(updates).eq("id", id).select().single()
  if (error) {
    return null
  }
  return data
}
// 删除子任务
export const deleteSubtask = async (id: string): Promise<boolean> => {
  const client = supabase || await getSupabaseClient()
  const { error } = await client.from("subtasks").delete().eq("id", id)
  if (error) {
    return false
  }
  return true
} 