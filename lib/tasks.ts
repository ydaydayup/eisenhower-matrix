"use client"

import { getSupabaseClient } from "./supabase/client"

// 定义任务类型
export interface Task {
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

  // 确保日期时间格式正确
  const taskWithFormattedDate = {
    ...task,
    due_date: task.due_date ? formatDateTimeForDB(task.due_date) : null
  }

  const { data, error } = await supabase.from("tasks").insert([taskWithFormattedDate]).select().single()

  if (error) {
    console.error("Error creating task:", error)
    return null
  }

  return data
}

// 更新任务
export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
  const supabase = getSupabaseClient()

  // 处理日期时间格式
  const updatesWithFormattedDate = {
    ...updates,
    due_date: updates.due_date ? formatDateTimeForDB(updates.due_date) : null
  }

  console.log("提交到数据库的日期时间:", updatesWithFormattedDate.due_date)

  const { data, error } = await supabase.from("tasks").update(updatesWithFormattedDate).eq("id", id).select().single()

  if (error) {
    console.error("Error updating task:", error)
    return null
  }

  console.log("数据库返回的日期时间:", data.due_date)
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

// 辅助函数：确保日期时间格式正确
export const formatDateTimeForDB = (dateTimeString: string): string => {
  // 检查日期时间格式
  console.log("原始日期时间:", dateTimeString)
  
  try {
    // 处理只有日期没有时间的情况
    if (dateTimeString.length === 10) {
      dateTimeString = `${dateTimeString}T00:00:00`;
    }
    
    // 处理有日期和时间但没有秒的情况
    if (dateTimeString.length === 16) {
      dateTimeString = `${dateTimeString}:00`;
    }
    
    // 确保是ISO格式 (YYYY-MM-DDTHH:MM:SS)
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      throw new Error('无效的日期时间格式');
    }
    
    // 格式化为带有时区的ISO字符串
    return date.toISOString();
  } catch (error) {
    console.error("日期时间格式化错误:", error);
    // 如果解析失败，尝试只保留日期部分
    const datePart = dateTimeString.split('T')[0];
    return `${datePart}T00:00:00.000Z`;
  }
}

