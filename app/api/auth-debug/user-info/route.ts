import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 用户信息API - 返回已认证用户的详细信息
 * 
 * GET /api/auth-debug/user-info
 */
export async function GET() {
  try {
    // 初始化Supabase客户端
    const supabase = await createClient();
    
    // 获取当前会话
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('获取会话时出错:', error);
      return NextResponse.json({ 
        error: '获取会话时出错',
        message: error.message
      }, { status: 500 });
    }
    
    // 如果没有会话，返回未授权
    if (!session) {
      return NextResponse.json({ 
        error: '未授权',
        message: '用户未登录'
      }, { status: 401 });
    }
    
    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.error('获取用户详细信息时出错:', userError);
      
      // 仍然返回基本用户信息
      return NextResponse.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          createdAt: session.user.created_at
        },
        message: '无法获取完整用户资料',
        error: userError.message
      });
    }
    
    // 返回详细用户信息
    return NextResponse.json({
      user: {
        ...userData,
        email: session.user.email
      }
    });
    
  } catch (error) {
    console.error('用户信息API错误:', error);
    return NextResponse.json({ 
      error: '服务器错误',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 