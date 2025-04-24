import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

// 检查是否需要创建user_preferences表
const ensurePreferencesTable = async (supabase: any) => {
  try {
    // 直接尝试查询表而不检查表是否存在
    const { data, error } = await supabase
      .from('user_preferences')
      .select('count(*)')
      .limit(1);

    // 如果出错，说明表可能不存在
    if (error && error.code === '42P01') {
      console.log('user_preferences表不存在，将尝试创建');
      
      try {
        // 创建表 - 注意：普通用户可能没有此权限
        const { error: createError } = await supabase.rpc('create_preferences_table');
        
        if (createError) {
          console.error('创建表时出错，可能需要管理员手动创建:', createError);
          console.log('将使用本地缓存代替');
          return false;
        }
        
        return true;
      } catch (err) {
        console.error('执行创建表操作失败:', err);
        console.log('将使用本地缓存代替');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('检查表时出错:', error);
    console.log('将使用本地缓存代替');
    return false;
  }
};

/**
 * 获取用户侧边栏排序偏好设置
 *
 * GET /api/user/preferences?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 从URL参数中获取userId
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    // 初始化Supabase客户端
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // 如果没有提供userId，尝试从当前会话获取
    if (!userId) {
      // 获取当前会话
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json({ 
          error: '未登录，无法访问',
          useLocalCache: true 
        }, { status: 401 });
      }
      
      userId = session.user.id;
    }

    // 验证用户
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ 
        error: '无效的用户ID',
        useLocalCache: true 
      }, { status: 401 });
    }

    try {
      // 确保表存在
      const tableExists = await ensurePreferencesTable(supabase);
      
      if (!tableExists) {
        // 如果表不存在且无法创建，告诉客户端使用本地缓存
        return NextResponse.json({
          message: '后端存储不可用，请使用本地缓存',
          settings: null,
          useLocalCache: true
        });
      }
      
      // 尝试获取偏好设置
      const { data, error } = await supabase
        .from('user_preferences')
        .select('sidebar_order')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果表不存在，告诉客户端使用本地缓存
        if (error.code === '42P01') {
          return NextResponse.json({
            message: '表不存在，请使用本地缓存',
            settings: null,
            useLocalCache: true
          });
        }
        
        // 如果是"没有结果"错误，返回空结果
        if (error.code === 'PGRST116') {
          return NextResponse.json({
            message: '未找到偏好设置',
            settings: null,
            useLocalCache: true
          });
        }
        
        console.error('从数据库获取偏好设置失败:', error);
        return NextResponse.json({ 
          error: '获取偏好设置失败',
          useLocalCache: true 
        }, { status: 500 });
      }

      // 返回成功结果
      return NextResponse.json({
        message: '成功获取偏好设置',
        settings: {
          sidebarOrder: data.sidebar_order
        }
      });
      
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return NextResponse.json({
        message: '数据库操作失败，请使用本地缓存',
        settings: null,
        useLocalCache: true
      });
    }

  } catch (error) {
    console.error('处理偏好设置请求时出错:', error);
    return NextResponse.json({ 
      error: '服务器错误',
      useLocalCache: true 
    }, { status: 500 });
  }
}

/**
 * 保存用户侧边栏排序偏好设置
 *
 * POST /api/user/preferences
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    let { userId, sidebarOrder } = body;

    // 初始化Supabase客户端
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // 如果没有提供userId，尝试从当前会话获取
    if (!userId) {
      // 获取当前会话
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json({ 
          error: '未登录，无法保存偏好设置',
          useLocalCache: true
        }, { status: 401 });
      }
      
      userId = session.user.id;
    }

    // 验证请求体是否有必要的数据
    if (!sidebarOrder) {
      return NextResponse.json({ 
        error: '偏好设置数据必需提供',
        useLocalCache: true 
      }, { status: 400 });
    }

    // 验证用户
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ 
        error: '无效的用户ID',
        useLocalCache: true 
      }, { status: 401 });
    }

    try {
      // 确保表存在
      const tableExists = await ensurePreferencesTable(supabase);
      
      if (!tableExists) {
        // 如果表不存在且无法创建，告诉客户端使用本地缓存
        return NextResponse.json({
          message: '后端存储不可用，已保存到本地缓存',
          success: false,
          useLocalCache: true
        });
      }

      // 保存偏好设置
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          sidebar_order: sidebarOrder,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('保存偏好设置到数据库失败:', error);
        
        // 如果表不存在，告诉客户端使用本地缓存
        if (error.code === '42P01') {
          return NextResponse.json({
            message: '表不存在，已保存到本地缓存',
            success: false,
            useLocalCache: true
          });
        }
        
        return NextResponse.json({ 
          error: '保存偏好设置失败',
          useLocalCache: true
        }, { status: 500 });
      }

      return NextResponse.json({ 
        message: '偏好设置已成功保存',
        success: true
      });
      
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return NextResponse.json({
        message: '数据库操作失败，已保存到本地缓存',
        success: false,
        useLocalCache: true
      });
    }

  } catch (error) {
    console.error('处理偏好设置保存请求时出错:', error);
    return NextResponse.json({ 
      error: '服务器错误',
      useLocalCache: true 
    }, { status: 500 });
  }
} 