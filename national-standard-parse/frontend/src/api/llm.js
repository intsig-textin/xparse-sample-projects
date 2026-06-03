/**
 * LLM 抽取代理 —— 当前 demo 不调用,留作二次开发的口子。
 * 例如:基于 Chunk 自动生成摘要、抽取条款字段、构建知识库索引等。
 *
 * @param {{ prompt: string, markdown?: string, model?: string }} params
 * @returns {Promise<{ llm_json: any, raw_json: any }>}
 */
export async function callLlmExtract(params) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`LLM 调用失败 (${response.status}): ${errText}`)
  }
  const data = await response.json()
  return data?.result ?? {}
}
