export async function* OpenAIStream(response: Response) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('No reader available')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const json = JSON.parse(data)
          const text = json.choices[0]?.delta?.content || ''
          if (text) {
            yield text
          }
        } catch (e) {
          console.error('Error parsing JSON:', e)
        }
      }
    }
  }
} 