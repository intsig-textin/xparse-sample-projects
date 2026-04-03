import { useState } from 'react'
import IssueCard from './IssueCard'

const CATEGORIES = ['错漏', '一致性', '格式', '修订']
const CAT_COLORS = {
  '错漏':   '#dc2626',
  '一致性': '#d97706',
  '格式':   '#0891b2',
  '修订':   '#7c3aed',
}
const SEV_BADGE = {
  '高': { bg: '#fee2e2', color: '#dc2626' },
  '中': { bg: '#fef3c7', color: '#b45309' },
  '低': { bg: '#d1fae5', color: '#059669' },
}

function findRawLocation(rawJson, catKey, idx) {
  const entry = rawJson?.norm_review?.[catKey]?.[idx]
  if (!entry) return null
  if (entry.value?.bounding_regions?.length) return entry.value.bounding_regions[0]
  for (const v of Object.values(entry)) {
    if (v?.bounding_regions?.length) return v.bounding_regions[0]
  }
  return null
}

export default function NormReview({ normLlmJson, normRawJson, onLocate, loading, error }) {
  const [collapsed, setCollapsed] = useState({})
  const reviewData = normLlmJson?.norm_review ?? {}
  const toggle = key => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
        <svg className="w-8 h-8 spinner text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <p className="text-sm text-slate-500">AI 正在检查规范性问题…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (!normLlmJson) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-400">
        <p className="text-sm">暂无规范审阅数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {CATEGORIES.map(catKey => {
        const items = reviewData[catKey] ?? []
        const color = CAT_COLORS[catKey]
        const isOpen = !collapsed[catKey]

        return (
          <div key={catKey} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(catKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-semibold text-sm text-slate-700">{catKey}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + '22', color }}>
                  {items.length} 项
                </span>
              </div>
              <svg
                className="w-4 h-4 text-slate-400 transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            <div className={`section-body ${isOpen ? 'open' : 'closed'}`}>
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  <svg className="w-7 h-7 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  未发现问题
                </div>
              ) : (
                items.map((item, idx) => {
                  const region = findRawLocation(normRawJson, catKey, idx)
                  const badgeStyle = SEV_BADGE[item.severity] ?? { bg: '#f1f5f9', color: '#64748b' }
                  return (
                    <IssueCard
                      key={idx}
                      item={item}
                      badgeLabel={item.severity ?? '中'}
                      badgeStyle={badgeStyle}
                      hasPin={!!region}
                      onClick={() => {
                        if (region) onLocate({ page: region.page_id ?? 1, position: region.position })
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
