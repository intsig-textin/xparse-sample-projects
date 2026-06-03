import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Download, Info } from 'lucide-react'
import MarkdownIt from 'markdown-it'
import multimdTable from 'markdown-it-multimd-table'
import ToggleSwitch from './ToggleSwitch'

const md = new MarkdownIt({ html: true, breaks: false }).use(multimdTable, {
  multiline: true,
  rowspan: true,
  headerless: true,
})

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pathDepth(path) {
  return path ? path.split(' › ').length - 1 : 0
}

function indentLevel(chunk) {
  if (chunk.type === 'heading') return Math.max(0, pathDepth(chunk.path) - 1)
  return Math.min(pathDepth(chunk.path), 3)
}

const LEVEL_BORDER = [
  'border-l-blue-500',
  'border-l-blue-300',
  'border-l-slate-300',
  'border-l-slate-200',
]

const BADGE = {
  heading: 'bg-blue-50 text-blue-700 border-blue-200',
  table: 'bg-green-50 text-green-700 border-green-200',
  body: 'bg-slate-50 text-slate-600 border-slate-200',
}
const LABEL = {
  heading: '标题块',
  table: '表格',
  body: '正文块',
}

function ChunkCard({ chunk, isActive, matchedTerms, onClick }) {
  const cardRef = useRef(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (isActive) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [isActive])

  const level = Math.max(0, indentLevel(chunk))
  const borderClass = LEVEL_BORDER[Math.min(level, LEVEL_BORDER.length - 1)]
  const indentPx = level * 12

  const pathParts = chunk.path ? chunk.path.split(' › ') : []
  const breadcrumb = chunk.type === 'heading' ? pathParts.slice(0, -1) : pathParts

  const plainText = stripHtml(chunk.text)
  const snippet = plainText.length > 140 ? plainText.slice(0, 140) + '…' : plainText

  const expandedHtml = useMemo(() => md.render(chunk.text), [chunk.text])

  useEffect(() => {
    if (expanded) window.MathJax?.typesetPromise?.()
  }, [expanded, expandedHtml])

  return (
    <div
      ref={cardRef}
      style={{ marginLeft: indentPx + 12 }}
      className={`mr-3 mb-1.5 rounded-xl border-l-[3px] border border-slate-200 bg-white transition-all duration-150 ${borderClass} ${
        isActive
          ? 'ring-1 ring-amber-400 border-amber-200 bg-amber-50/40'
          : 'hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="p-3 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{chunk.id}</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${
              BADGE[chunk.type] ?? BADGE.body
            }`}
          >
            {LABEL[chunk.type] ?? chunk.type}
          </span>
          {chunk.type === 'heading' && pathParts.length > 0 && (
            <span className="text-[10px] font-mono bg-blue-600 text-white px-1 py-0.5 rounded flex-shrink-0">
              H{Math.max(1, pathParts.length)}
            </span>
          )}
        </div>

        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            {breadcrumb.map((part, i) => (
              <React.Fragment key={i}>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {part}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-[10px] text-slate-300">›</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        <p className="text-xs font-semibold text-slate-800 mb-1.5 leading-snug">{chunk.title}</p>

        {snippet && chunk.type !== 'heading' && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{snippet}</p>
        )}

        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          {matchedTerms && matchedTerms.length > 0 && (
            <span className="text-[10px] text-blue-500">
              关键词: {matchedTerms.slice(0, 3).join('、')}
            </span>
          )}
          <button
            className="ml-auto text-[10px] text-slate-400 hover:text-blue-500 flex items-center gap-0.5 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            {expanded ? '收起' : '展开全文'}
            <svg
              className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="border-t border-slate-100 px-3 py-2 bg-slate-50/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chunk-content" dangerouslySetInnerHTML={{ __html: expandedHtml }} />
        </div>
      )}
    </div>
  )
}

export default function ChunkPanel({
  chunks,
  searchResults,
  hasSearched,
  activeChunkId,
  fileName,
  includeParatext,
  onSelectChunk,
  onSearch,
  onToggleParatext,
}) {
  const [inputValue, setInputValue] = useState('')
  const [showInfo, setShowInfo] = useState(false)

  function handleSearch(e) {
    e.preventDefault()
    onSearch(inputValue)
  }

  function handleExport() {
    const data = chunks.map((c) => ({
      chunk_id: c.id,
      title: c.title,
      path: c.path,
      type: c.type,
      page: c.page,
      tokens: c.tokens,
      text: c.text,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName ? fileName.replace(/\.[^.]+$/, '_chunks.json') : 'chunks.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const showingResults = hasSearched && inputValue.trim()
  const listToRender = showingResults
    ? searchResults.map((r) => ({ chunk: r.chunk, score: r.score, terms: r.matchedTerms }))
    : chunks.map((c) => ({ chunk: c, score: undefined, terms: undefined }))

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-slate-100 bg-white">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606z"
              />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="检索"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            搜索
          </button>
          {hasSearched && (
            <button
              type="button"
              onClick={() => {
                setInputValue('')
                onSearch('')
              }}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              清除
            </button>
          )}
        </form>
      </div>

      {/* Stats + export */}
      <div className="flex-shrink-0 flex items-center px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        {showingResults ? (
          <p className="text-xs text-slate-500">
            找到 <span className="font-semibold text-slate-700">{searchResults.length}</span> 条结果
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            共 <span className="font-semibold text-slate-700">{chunks.length}</span> 个分块
            <span className="text-slate-400 ml-2">· 点击定位原文</span>
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ToggleSwitch
            checked={includeParatext}
            onChange={onToggleParatext}
            label="含页眉页脚"
            title="开启后,页眉页脚内容将混入 Chunk,可观察对知识库质量的影响"
          />

          <div className="w-px h-3 bg-slate-200" />

          <div className="relative">
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              title="分块策略说明"
            >
              <Info size={13} />
            </button>
            {showInfo && (
              <div className="absolute right-0 top-6 z-10 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-2">分块策略（标题层级驱动）</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">■</span>
                    <span>
                      <b>标题块</b>:遇到 H1/H2/H3 开新 Chunk,对应章/节/条
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-400 mt-0.5">■</span>
                    <span>
                      <b>正文块</b>:段落追加到当前标题块
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">■</span>
                    <span>
                      <b>表格</b>:独立 Chunk,含表格标题
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  依据 TextIn outline_level 字段判断层级
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 border border-slate-200 rounded-lg hover:bg-white hover:text-slate-700 transition-colors"
          >
            <Download size={11} />
            导出 JSON
          </button>
        </div>
      </div>

      {/* Chunk list */}
      <div
        className="flex-1 overflow-auto py-2"
        onClick={() => {
          if (showInfo) setShowInfo(false)
        }}
      >
        {listToRender.length === 0 && showingResults ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 py-12">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606z"
              />
            </svg>
            <p className="text-sm">未找到相关条款</p>
            <p className="text-xs text-slate-400">尝试更换关键词</p>
          </div>
        ) : (
          listToRender.map(({ chunk, terms }) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              isActive={activeChunkId === chunk.id}
              matchedTerms={terms}
              onClick={() => onSelectChunk(chunk.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
