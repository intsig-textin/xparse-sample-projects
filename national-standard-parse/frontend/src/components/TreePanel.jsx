import React, { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'

function TreeNode({ item, depth, onPageJump }) {
  const hasChildren = item.children && item.children.length > 0
  const [expanded, setExpanded] = useState(depth < 2)

  const indent = depth * 16

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-slate-100 group transition-colors"
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded((v) => !v)
          if (item.page_id) onPageJump(item.page_id - 1)
        }}
      >
        {hasChildren ? (
          <ChevronRight
            size={12}
            className={`text-slate-400 flex-shrink-0 transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <div className="w-3 flex-shrink-0" />
        )}

        <span
          className={`text-xs leading-snug flex-1 min-w-0 ${
            depth === 0
              ? 'font-semibold text-slate-800'
              : depth === 1
              ? 'font-medium text-slate-700'
              : 'text-slate-600'
          }`}
        >
          {item.text}
        </span>

        {item.page_id && (
          <span className="text-[10px] text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            p.{item.page_id}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {item.children.map((child, i) => (
            <TreeNode key={i} item={child} depth={depth + 1} onPageJump={onPageJump} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TreePanel({ catalog, onPageJump }) {
  if (!catalog.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
        <FileText size={36} />
        <p className="text-sm">暂无目录结构</p>
        <p className="text-xs text-slate-400">文档需包含标题层级</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs text-slate-500">
          目录树 · {catalog.length} 个顶级章节
          <span className="text-slate-400 ml-2">· 点击跳转到对应页面</span>
        </p>
      </div>
      <div className="flex-1 overflow-auto py-2 px-2">
        {catalog.map((item, i) => (
          <TreeNode key={i} item={item} depth={0} onPageJump={onPageJump} />
        ))}
      </div>
    </div>
  )
}
