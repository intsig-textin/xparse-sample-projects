// SSE 客户端：消费 /api/extract_stream 推送的批次进度与最终抽取结果。
// 由于 SSE 这条流通过 POST 触发（前端要送 OCR 结果），不能用原生 EventSource，
// 改用 fetch + ReadableStream 自己拼 "data: ...\n\n" 的 chunk。

export async function extractFieldsStream(ocr, { onProgress, onDone, onError, signal } = {}) {
  let resp
  try {
    resp = await fetch('/api/extract_stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: ocr.pages, detail: ocr.detail }),
      signal,
    })
  } catch (err) {
    if (err.name !== 'AbortError') onError?.(err)
    throw err
  }

  if (!resp.ok || !resp.body) {
    let msg = `LLM 流式抽取失败 (HTTP ${resp.status})`
    try {
      const data = await resp.json()
      if (data?.detail) msg = data.detail
    } catch {
      /* ignore */
    }
    const err = new Error(msg)
    onError?.(err)
    throw err
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE 事件以 "\n\n" 分隔，每条以 "data: " 开头
      let sepIdx
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)

        const lines = rawEvent.split('\n')
        const dataLines = lines
          .filter((ln) => ln.startsWith('data:'))
          .map((ln) => ln.slice(5).trimStart())
        if (!dataLines.length) continue

        let payload
        try {
          payload = JSON.parse(dataLines.join('\n'))
        } catch {
          continue
        }

        if (payload.type === 'progress') {
          onProgress?.(payload.done, payload.total)
        } else if (payload.type === 'done') {
          onDone?.(payload.extraction)
          return payload.extraction
        } else if (payload.type === 'error') {
          const err = new Error(payload.message || 'LLM 抽取失败')
          onError?.(err)
          throw err
        }
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }
  return null
}
