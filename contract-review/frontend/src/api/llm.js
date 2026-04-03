const LLM_URL = '/api/extract'

export async function callLLM(prompt, markdown) {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, markdown }),
  })

  if (!response.ok) throw new Error(`LLM 请求失败: HTTP ${response.status}`)

  const json = await response.json()
  if (json.code !== 200) throw new Error(`LLM 错误: ${json.message}`)

  return {
    llm_json: json.result.llm_json,
    raw_json: json.result.raw_json || null,
  }
}

export function parseLLMJson(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    let s = String(raw).trim()
    s = s.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '')
    return JSON.parse(s)
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch (_) {} }
    return null
  }
}
