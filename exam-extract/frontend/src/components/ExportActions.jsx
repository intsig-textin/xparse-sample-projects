import React, { useState } from 'react'

export default function ExportActions({ extraction, disabled }) {
  const [open, setOpen] = useState(false)
  const canExport = !!extraction && !disabled

  const handleExportJson = () => {
    if (!extraction) return
    setOpen(false)
    const data = {
      paper_title: extraction.paper_title,
      paper_meta: extraction.paper_meta,
      groups: extraction.groups,
      warnings: extraction.warnings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
    a.href = url
    a.download = `exam_extract_${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportMarkdown = () => {
    if (!extraction) return
    setOpen(false)

    const lines = []
    if (extraction.paper_title) lines.push(`# ${extraction.paper_title}`, '')
    if (extraction.paper_meta) {
      const meta = extraction.paper_meta
      lines.push(`> 学科：${meta.subject} · 年级：${meta.grade_level} · 类型：${meta.exam_type}`, '')
    }

    let lastSection
    extraction.groups.forEach((g) => {
      if (g.section !== lastSection) {
        lines.push(`## ${g.section ?? '（未分类）'}`, '')
        lastSection = g.section
      }
      if (g.shared_stem) {
        lines.push('> **共享题干**', '>')
        g.shared_stem.split('\n').forEach((ln) => lines.push(`> ${ln}`))
        lines.push('')
      }
      g.questions.forEach((q) => {
        const score = q.score != null ? `，${q.score} 分` : ''
        lines.push(`### ${q.number}. ${q.type}${score}`, '')
        if (q.stem) lines.push(q.stem, '')
        q.options.forEach((o) => lines.push(`- **${o.key}.** ${o.content}`))
        if (q.options.length) lines.push('')
        lines.push(`<sub>第 ${q.source_page} 页</sub>`, '', '---', '')
      })
    })

    if (extraction.warnings.length) {
      lines.push('## 警告', '')
      extraction.warnings.forEach((w) => lines.push(`- ${w}`))
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
    a.href = url
    a.download = `exam_extract_${ts}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    if (!extraction) return
    setOpen(false)

    const seenKeys = new Set()
    extraction.groups.forEach((g) => {
      g.questions.forEach((q) => {
        q.options.forEach((o) => {
          if (o.key) seenKeys.add(o.key)
        })
      })
    })
    const optionKeys = Array.from(seenKeys).sort()

    const header = [
      '题组ID',
      '大题',
      '共享题干',
      '题号',
      '类型',
      '分值',
      '题干',
      ...optionKeys.map((k) => `选项${k}`),
      '页码',
    ]

    const rows = [header]

    extraction.groups.forEach((g) => {
      g.questions.forEach((q) => {
        const optionMap = new Map(q.options.map((o) => [o.key, o.content]))
        rows.push([
          g.group_id,
          g.section ?? '',
          (g.shared_stem ?? '').replace(/\n/g, ' '),
          q.number,
          q.type,
          q.score ?? '',
          q.stem.replace(/\n/g, ' '),
          ...optionKeys.map((k) => (optionMap.get(k) ?? '').replace(/\n/g, ' ')),
          q.source_page,
        ])
      })
    })

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
    a.href = url
    a.download = `exam_extract_${ts}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canExport) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        导出
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[120px]">
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={handleExportMarkdown}
            >
              导出 Markdown
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={handleExportJson}
            >
              导出 JSON
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={handleExportCsv}
            >
              导出 CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}
