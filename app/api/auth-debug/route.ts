import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * 认证调试API - 返回当前用户会话信息
 * 
 * GET /api/auth-debug
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
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      
      return NextResponse.json({ 
        authenticated: false,
        message: '用户未登录',
        session: null,
        debugInfo: {
          hasCookies: allCookies.length > 0,
          cookieNames: allCookies.map(c => c.name)
        }
      }, { status: 200 });
    }
    
    // 返回脱敏后的会话信息（不返回敏感令牌）
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    return NextResponse.json({
      authenticated: true,
      message: '用户已登录',
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        lastSignInAt: session.user.last_sign_in_at,
        createdAt: session.user.created_at
      },
      debugInfo: {
        sessionExpiresAt: session.expires_at,
        hasCookies: allCookies.length > 0,
        cookieNames: allCookies.map(c => c.name),
        hasAuthCookie: allCookies.some(c => c.name.includes('supabase'))
      }
    });
    
  } catch (error) {
    console.error('认证调试API错误:', error);
    return NextResponse.json({ 
      error: '服务器错误',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 