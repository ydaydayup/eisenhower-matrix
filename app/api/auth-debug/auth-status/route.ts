import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 认证状态检查API - 简单返回用户是否已认证
 * 
 * GET /api/auth-debug/auth-status
 */
export async function GET() {
  try {
    // 初始化Supabase客户端
    const supabase = await createClient();
    
    // 获取当前会话
    const { data: { session } } = await supabase.auth.getSession();
    
    // 返回简单的认证状态
    return NextResponse.json({
      authenticated: !!session,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('认证状态检查API错误:', error);
    return NextResponse.json({ 
      error: '服务器错误',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 