import React, { useEffect, useMemo, useRef } from 'react'
import { Image as ImageIcon, Table as TableIcon, ChevronRight } from 'lucide-react'

/** 从 image item 的 content 中抽取图片 url（http/https 直链或 markdown ![](url)） */
function extractImageUrl(content) {
  if (!content) return null
  const trimmed = content.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const md = content.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (md) return md[1]
  return null
}

function PathBreadcrumb({ path }) {
  if (!path) return null
  const parts = path.split(' › ').filter(Boolean)
  if (!parts.length) return null
  return (
    <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 text-[11px] text-slate-500">
      {parts.map((p, idx) => (
        <React.Fragment key={`${p}-${idx}`}>
          {idx > 0 && <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />}
          <span className={idx === parts.length - 1 ? 'text-slate-700 font-medium' : ''}>{p}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

function TableCard({ item, active, onSelect }) {
  const contentRef = useRef(null)

  useEffect(() => {
    if (!item.content) return
    const node = contentRef.current
    const mj = window.MathJax
    if (!mj?.typesetPromise) return
    mj.typesetPromise(node ? [node] : undefined)
  }, [item.content])

  return (
    <div
      className={`border rounded-xl bg-white hover:shadow-sm transition-all overflow-hidden cursor-pointer ${
        active
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/40'
          : 'border-slate-200 hover:border-blue-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-[11px] font-bold">
            {item.index}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-800 truncate">
              {item.caption || `未命名表格 ${item.index}`}
            </div>
            <div className="mt-0.5">
              <PathBreadcrumb path={item.path} />
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-1">p.{item.page}</span>
      </div>
      <div className="px-3 py-2 max-h-[180px] overflow-auto bg-white">
        {item.content ? (
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none [&>table]:text-[11px] [&>table]:border-collapse [&>table_th]:border [&>table_th]:border-slate-200 [&>table_th]:bg-slate-50 [&>table_th]:px-2 [&>table_th]:py-1 [&>table_td]:border [&>table_td]:border-slate-200 [&>table_td]:px-2 [&>table_td]:py-1"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        ) : (
          <div className="text-xs text-slate-400">（无表格内容）</div>
        )}
      </div>
    </div>
  )
}

function ImageCard({ item, active, onSelect }) {
  const url = useMemo(() => extractImageUrl(item.content), [item.content])
  return (
    <div
      className={`border rounded-xl bg-white hover:shadow-sm transition-all overflow-hidden cursor-pointer ${
        active
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/40'
          : 'border-slate-200 hover:border-blue-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0 text-[11px] font-bold">
            {item.index}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-800 truncate">
              {item.caption || `未命名图片 ${item.index}`}
            </div>
            <div className="mt-0.5">
              <PathBreadcrumb path={item.path} />
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-1">p.{item.page}</span>
      </div>
      <div className="px-3 py-3 flex items-center justify-center bg-slate-50/40">
        {url ? (
          <img
            src={url}
            alt={item.caption || `image-${item.index}`}
            className="max-h-[200px] w-auto object-contain rounded border border-slate-100"
            loading="lazy"
          />
        ) : (
          <div className="text-xs text-slate-400 py-6">（图片资源不可用）</div>
        )}
      </div>
    </div>
  )
}

export default function MediaPanel({ type, items, activeMediaId, onSelectMedia }) {
  if (!items.length) {
    const Icon = type === 'table' ? TableIcon : ImageIcon
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
        <Icon size={36} />
        <p className="text-sm">暂无{type === 'table' ? '表格' : '图片'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-500">
          共 {items.length} 个{type === 'table' ? '表格' : '图片'}
          <span className="text-slate-400 ml-2">· 点击卡片在左侧定位原文位置</span>
        </p>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {items.map((item) =>
          type === 'table' ? (
            <TableCard
              key={item.id}
              item={item}
              active={item.id === activeMediaId}
              onSelect={() => onSelectMedia(item.id)}
            />
          ) : (
            <ImageCard
              key={item.id}
              item={item}
              active={item.id === activeMediaId}
              onSelect={() => onSelectMedia(item.id)}
            />
          ),
        )}
      </div>
    </div>
  )
}
