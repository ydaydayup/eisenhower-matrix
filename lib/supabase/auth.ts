import { createNextServerClient } from "./server";
import { cookies } from "next/headers";

/**
 * 通过用户ID获取用户信息
 * 
 * @param userId 用户ID
 * @returns 找到则返回用户信息，未找到则返回null
 */
export async function getUserById(userId: string) {
  try {
    if (!userId) {
      return null;
    }

    const cookieStore = cookies();
    const supabase = await createNextServerClient();
    
    // 使用profiles表获取用户信息，不使用admin API
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (profileError) {
      console.error("获取用户资料时出错:", profileError);
      
      // 尝试获取当前会话并检查userId是否匹配
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user?.id === userId) {
        // 如果当前登录用户ID与请求的ID匹配，返回基本信息
        return {
          id: userId,
          email: sessionData.session.user.email,
          name: sessionData.session.user.email?.split("@")[0] || "",
          created_at: sessionData.session.user.created_at
        };
      }
      
      return null;
    }
    
    // 返回找到的用户资料
    return {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name || profileData.email?.split("@")[0] || "",
      created_at: profileData.created_at
    };
  } catch (error) {
    console.error("getUserById错误:", error);
    return null;
  }
} 