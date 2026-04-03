import React, { useState } from 'react'
import { Download, FileText, FileJson, ChevronDown, Check } from 'lucide-react'

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getTimestamp() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ExportActions({ parseResult, extractResult, disabled }) {
  const [open, setOpen] = useState(false)
  const [justClicked, setJustClicked] = useState(null)
  const ts = getTimestamp()

  const handleExport = (type) => {
    setOpen(false)
    setJustClicked(type)
    setTimeout(() => setJustClicked(null), 1500)

    switch (type) {
      case 'parse-md':
        if (parseResult?.markdown) {
          downloadBlob(parseResult.markdown, `医疗报告解析_${ts}.md`, 'text/markdown;charset=utf-8')
        }
        break

      case 'parse-json':
        if (parseResult) {
          const content = JSON.stringify({
            markdown: parseResult.markdown,
            pages: parseResult.pages,
          }, null, 2)
          downloadBlob(content, `医疗报告解析_${ts}.json`, 'application/json;charset=utf-8')
        }
        break

      case 'extract-json':
        if (extractResult) {
          const content = JSON.stringify(extractResult.llm_json, null, 2)
          downloadBlob(content, `医疗报告抽取_${ts}.json`, 'application/json;charset=utf-8')
        }
        break

      default:
        break
    }
  }

  const canExportParse = !!parseResult?.markdown
  const canExportExtract = !!extractResult?.llm_json

  const options = [
    {
      id: 'parse-md',
      label: '导出解析结果 (.md)',
      icon: FileText,
      disabled: !canExportParse,
      description: 'Markdown 格式',
    },
    {
      id: 'parse-json',
      label: '导出解析结果 (.json)',
      icon: FileJson,
      disabled: !canExportParse,
      description: 'JSON 格式（含页面数据）',
    },
    {
      id: 'extract-json',
      label: '导出抽取结果 (.json)',
      icon: FileJson,
      disabled: !canExportExtract,
      description: '结构化抽取 JSON',
    },
  ]

  return (
    <div className="relative">
      <button
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
          ${disabled || (!canExportParse && !canExportExtract)
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm hover:shadow'
          }
        `}
        onClick={() => !disabled && (canExportParse || canExportExtract) && setOpen(o => !o)}
        disabled={disabled || (!canExportParse && !canExportExtract)}
      >
        <Download size={15} />
        导出
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-20">
            {options.map((opt) => {
              const Icon = opt.icon
              const isJust = justClicked === opt.id
              return (
                <button
                  key={opt.id}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${opt.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-slate-50 cursor-pointer'
                    }
                  `}
                  onClick={() => !opt.disabled && handleExport(opt.id)}
                  disabled={opt.disabled}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isJust ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {isJust
                      ? <Check size={15} className="text-green-600" />
                      : <Icon size={15} className="text-slate-500" />
                    }
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">{opt.label}</div>
                    <div className="text-xs text-slate-400">{opt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
