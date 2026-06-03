import { useEffect } from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import renderMathInElement from 'katex/contrib/auto-render'

export const MARKDOWN_REMARK_PLUGINS = [remarkGfm, remarkMath]
export const MARKDOWN_REHYPE_PLUGINS = [rehypeRaw, rehypeKatex]

const KATEX_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
]

export function renderKatexInElement(el) {
  if (!el) return
  try {
    renderMathInElement(el, {
      delimiters: KATEX_DELIMITERS,
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    })
  } catch {
    /* 公式异常不应阻塞页面渲染 */
  }
}

export function useKatexAutoRender(ref, deps) {
  useEffect(() => {
    renderKatexInElement(ref.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
