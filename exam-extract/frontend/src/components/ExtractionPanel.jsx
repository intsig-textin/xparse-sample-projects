import React, { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

import PaperMetaCard from './ClassificationCard'
import { countByType, totalScore, totalQuestionCount } from '../utils/normalize'
import { getQuestionTypeColor } from '../constants/questionTypes'

// ─── Markdown 渲染（含 GFM + 原生 HTML 表格 + MathJax 排版） ─────────────────

const MARKDOWN_COMPONENTS = {
  table: (props) => (
    <div className="overflow-x-auto my-2 max-w-full">
      <table {...props} className="border-collapse text-[12px]" />
    </div>
  ),
  th: (props) => (
    <th {...props} className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold" />
  ),
  td: (props) => <td {...props} className="border border-slate-200 px-2 py-1" />,
  img: (props) => (
    <img
      {...props}
      className="inline-block max-w-full max-h-48 my-1 rounded border border-slate-100"
      loading="lazy"
    />
  ),
  a: ({ children }) => <span>{children}</span>,
  p: (props) => <span {...props} className="block my-1" />,
}

function MarkdownContent({ source, className }) {
  if (!source) return null
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MARKDOWN_COMPONENTS}
      >
        {source}
      </Markdown>
    </div>
  )
}

// ─── 单道小题 ──────────────────────────────────────────────────────────────

function QuestionItem({ question, showTypeBadge }) {
  const hasOptions = question.options.length > 0

  return (
    <div className="border-l-2 border-blue-100 pl-3 py-1">
      <div className="flex items-center gap-2 flex-wrap min-w-0 mb-1">
        <span className="text-xs font-bold text-blue-700 flex-shrink-0">
          {question.number || '·'}
        </span>
        {showTypeBadge && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getQuestionTypeColor(
              question.type,
            )}`}
          >
            {question.type}
          </span>
        )}
        {question.score !== null && question.score !== undefined && (
          <span className="text-[10px] text-slate-400">{question.score} 分</span>
        )}
      </div>

      <MarkdownContent source={question.stem} className="text-xs text-slate-700 leading-relaxed" />

      {hasOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1">
          {question.options.map((opt) => (
            <div key={opt.key} className="flex items-start gap-1.5 text-[11px] text-slate-600">
              <span className="w-4 h-4 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {opt.key}
              </span>
              <MarkdownContent
                source={opt.content || '—'}
                className="leading-relaxed flex-1 min-w-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 题组卡片 ───────────────────────────────────────────────────────────────

function GroupCard({ group, globalIdx }) {
  const [expanded, setExpanded] = useState(true)
  const isStandalone = !group.shared_stem && group.questions.length === 1
  const firstType = group.questions[0]?.type ?? '其他'

  return (
    <div className="border border-slate-100 rounded-xl bg-white mb-2 hover:border-slate-200 transition-colors overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {globalIdx}
          </span>
          {isStandalone ? (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getQuestionTypeColor(
                firstType,
              )}`}
            >
              {firstType}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
              题组 · {group.questions.length} 小题
            </span>
          )}
          {group.section && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
              {group.section}
            </span>
          )}
        </div>
        {!isStandalone && (
          <button
            className="flex-shrink-0 text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {group.shared_stem && expanded && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-50/40 border border-amber-100">
          <div className="text-[10px] text-amber-700 font-semibold mb-1">共享题干</div>
          <MarkdownContent
            source={group.shared_stem}
            className="text-xs text-slate-700 leading-relaxed"
          />
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {group.questions.map((q, i) => (
            <QuestionItem
              key={`${group.group_id}-${q.number || i}`}
              question={q}
              showTypeBadge={!isStandalone}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 顶部统计条 ────────────────────────────────────────────────────────────

function StatsBar({ extraction }) {
  const counts = countByType(extraction.groups)
  const score = totalScore(extraction.groups)
  const total = totalQuestionCount(extraction.groups)

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs font-semibold text-slate-700">
        {extraction.groups.length} 题组 / 共 {total} 题
      </span>
      {score !== null && <span className="text-xs text-slate-400">满分 {score} 分</span>}
      {Object.entries(counts).map(([type, count]) => (
        <span
          key={type}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getQuestionTypeColor(
            type,
          )}`}
        >
          {type} ×{count}
        </span>
      ))}
    </div>
  )
}

// ─── Main ExtractionPanel ──────────────────────────────────────────────────

export default function ExtractionPanel({
  extraction,
  extractionPhase,
  extractionError,
  progressText,
}) {
  const isExtracting = extractionPhase === 'extracting'
  const isDone = extractionPhase === 'done'

  const listRef = useRef(null)
  useEffect(() => {
    if (extraction?.groups?.length) {
      // 内容更新后重新 typeset 公式
      window.MathJax?.typesetPromise?.(listRef.current ? [listRef.current] : undefined)
    }
  }, [extraction])

  if (extractionPhase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">等待试卷上传</p>
      </div>
    )
  }

  if (extractionPhase === 'error' && extractionError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">抽取失败</p>
          <p className="text-xs text-slate-400 mt-1">{extractionError}</p>
        </div>
      </div>
    )
  }

  let runningIdx = 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-slate-100 space-y-2">
        <PaperMetaCard paperMeta={extraction?.paper_meta ?? null} />

        {isExtracting && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin flex-shrink-0" />
            {progressText ?? '正在抽取题目...'}
          </div>
        )}

        {isDone && extraction && <StatsBar extraction={extraction} />}

        {isDone && (extraction?.warnings ?? []).length > 0 && (
          <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>{(extraction?.warnings ?? []).join('；')}</div>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {isExtracting && !extraction && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <div className="w-6 h-6 bg-slate-200 rounded-full flex-shrink-0" />
                  <div className="w-16 h-4 bg-slate-200 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {extraction && extraction.groups.length === 0 && isDone && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">未识别到题目</p>
          </div>
        )}

        {extraction?.groups.map((g) => {
          runningIdx += 1
          return (
            <GroupCard key={g.group_id || `group-${runningIdx}`} group={g} globalIdx={runningIdx} />
          )
        })}
      </div>
    </div>
  )
}
