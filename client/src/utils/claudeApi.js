export async function fetchVerdict({ placeId, name, address, rating, priceLevel, reviews, redditSnippets }) {
  const res = await fetch('/api/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      place_id: placeId,
      name,
      address,
      rating,
      price_level: priceLevel,
      reviews,
      reddit_snippets: redditSnippets,
    }),
  })
  if (!res.ok) throw new Error(`Verdict API error: ${res.status}`)
  return res.json()
}

export async function* streamChat({ messages, userProfile }) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, user_profile: userProfile }),
  })

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const text = line.slice(6)
      if (text === '[DONE]') return
      yield text.replace(/\\n/g, '\n')
    }
  }
}
