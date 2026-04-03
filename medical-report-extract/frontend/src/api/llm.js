import { LLM_EXTRACTION_URL, LLM_MODEL, LLM_PROMPT } from '../constants.js'

export function findInRawJson() { return null }

/**
 * Extract key information from OCR result using LLM via backend.
 * @param {string} markdown
 * @param {Array} pages
 * @returns {Promise<{ llm_json: object, raw_json: object, pages: Array }>}
 */
export async function extractKeyInfo(markdown) {
  const body = {
    prompt: LLM_PROMPT,
    model: LLM_MODEL,
    markdown,
  }

  const response = await fetch(LLM_EXTRACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI 抽取失败 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const result = data.result || data

  return {
    llm_json: result.llm_json || {},
    raw_json: result.raw_json || {},
    pages: result.pages || [],
  }
}
