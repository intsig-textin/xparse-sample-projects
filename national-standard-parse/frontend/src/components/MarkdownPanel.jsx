import React, { useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import Markdown from 'react-markdown'
import {
  MARKDOWN_REMARK_PLUGINS,
  MARKDOWN_REHYPE_PLUGINS,
  useKatexAutoRender,
} from '../utils/markdownMath'

const HIGHLIGHT_CLASS =
  'cursor-pointer rounded transition-colors hover:bg-blue-50 border border-transparent'
const ACTIVE_CLASS = '!border-blue-500 !bg-blue-50 ring-2 ring-blue-200'

function lineFromNode(node) {
  return node?.position?.start?.line
}

export default function MarkdownPanel({
  markdown,
  fileName,
  lineToDetail,
  activeDetailIndex,
  onSelectDetail,
}) {
  const containerRef = useRef(null)
  useKatexAutoRender(containerRef, [markdown])

  useEffect(() => {
    if (activeDetailIndex == null || !containerRef.current) return
    const el = containerRef.current.querySelector(`[data-detail-idx="${activeDetailIndex}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeDetailIndex])

  function handleDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName ? fileName.replace(/\.[^.]+$/, '_parsed.md') : 'parsed.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-sm">暂无解析结果</p>
      </div>
    )
  }

  // 通用 block 渲染:识别 line → detail,附点击/高亮
  const wrap = (Tag) => {
    const Wrapped = ({ node, children, ...props }) => {
      const line = lineFromNode(node)
      const detailIdx = line != null ? lineToDetail.get(line) : undefined
      if (detailIdx == null) return <Tag {...props}>{children}</Tag>
      const isActive = detailIdx === activeDetailIndex
      return (
        <Tag
          {...props}
          data-detail-idx={detailIdx}
          className={[props.className, HIGHLIGHT_CLASS, isActive ? ACTIVE_CLASS : '']
            .filter(Boolean)
            .join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            onSelectDetail(detailIdx)
          }}
        >
          {children}
        </Tag>
      )
    }
    Wrapped.displayName = `Wrapped(${Tag})`
    return Wrapped
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-500">
          Markdown 解析结果 · {markdown.length.toLocaleString()} 字符
          <span className="text-slate-400 ml-2">· 点击任意段落/标题/表格在左侧定位原文位置</span>
        </p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 border border-slate-200 rounded-lg hover:bg-white hover:text-slate-700 transition-colors"
        >
          <Download size={11} />
          下载 .md
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div ref={containerRef} className="markdown-content text-sm">
          <Markdown
            remarkPlugins={MARKDOWN_REMARK_PLUGINS}
            rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
            components={{
              p: wrap('p'),
              h1: wrap('h1'),
              h2: wrap('h2'),
              h3: wrap('h3'),
              h4: wrap('h4'),
              h5: wrap('h5'),
              h6: wrap('h6'),
              table: wrap('table'),
              img: ({ node, ...props }) => {
                const line = lineFromNode(node)
                const detailIdx = line != null ? lineToDetail.get(line) : undefined
                if (detailIdx == null) return <img {...props} />
                const isActive = detailIdx === activeDetailIndex
                return (
                  <img
                    {...props}
                    data-detail-idx={detailIdx}
                    className={[props.className, HIGHLIGHT_CLASS, isActive ? ACTIVE_CLASS : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectDetail(detailIdx)
                    }}
                  />
                )
              },
            }}
          >
            {markdown}
          </Markdown>
        </div>
      </div>
    </div>
  )
}
