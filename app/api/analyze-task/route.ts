import { NextResponse } from 'next/server'
import { OpenAIStream } from '@/lib/openai-stream'

export async function POST(request: Request) {
  try {
    const { title } = await request.json()

    // 调用 Moonshot API 生成任务分析
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{
          role: 'user',
          content: `请分析以下任务并生成详细的执行计划：${title}
          
请按照以下格式输出：
1. 任务目标：
2. 关键步骤：
3. 所需资源：
4. 潜在风险：
5. 时间建议：`
        }],
        stream: true // 启用流式输出
      })
    })

    if (!response.ok) {
      throw new Error('API request failed')
    }

    // 创建流式响应
    const stream = OpenAIStream(response)
    
    // 返回流式响应
    return new Response(stream)

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
} 