import React, { useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { SECTION_LABELS, FIELD_LABELS } from '../constants.js'
import { findInRawJson } from '../api/llm.js'

function StatusBadge({ status }) {
  if (!status) return null
  const s = String(status)
  let cls = 'bg-slate-100 text-slate-600'
  if (s.includes('↑') || s.includes('偏高') || s.includes('阳性')) {
    cls = 'bg-red-50 text-red-600 border border-red-200'
  } else if (s.includes('↓') || s.includes('偏低')) {
    cls = 'bg-blue-50 text-blue-600 border border-blue-200'
  } else if (s.includes('正常') || s.includes('阴性')) {
    cls = 'bg-green-50 text-green-600 border border-green-200'
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {s}
    </span>
  )
}

function NullValue() {
  return <span className="text-slate-300">—</span>
}

function FieldRow({ label, value, isActive, onClick, hasHighlight }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-start py-1.5 px-2 rounded-lg">
        <span className="text-slate-400 text-xs w-28 flex-shrink-0 mt-0.5">{label}</span>
        <NullValue />
      </div>
    )
  }

  const displayValue = Array.isArray(value) ? value.filter(Boolean).join('、') : String(value)

  return (
    <div
      className={`
        flex items-start py-1.5 px-2 rounded-lg transition-all duration-150 group
        ${hasHighlight ? 'cursor-pointer hover:bg-amber-50' : ''}
        ${isActive ? 'bg-amber-50 ring-1 ring-amber-300 field-active' : ''}
      `}
      onClick={hasHighlight ? onClick : undefined}
      title={hasHighlight ? '点击定位原文' : undefined}
    >
      <span className="text-slate-400 text-xs w-28 flex-shrink-0 mt-0.5 leading-4">{label}</span>
      <span className="text-slate-800 text-xs flex-1 leading-5 break-all">{displayValue}</span>
      {hasHighlight && (
        <MapPin
          size={12}
          className={`flex-shrink-0 ml-1 mt-0.5 transition-colors ${isActive ? 'text-amber-500' : 'text-slate-300 group-hover:text-amber-400'}`}
        />
      )}
    </div>
  )
}

/** Derive column list from items array (union of all keys, preserving first-seen order) */
function deriveColumns(items) {
  const seen = new Set()
  const cols = []
  items.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(k => {
        if (!seen.has(k)) { seen.add(k); cols.push(k) }
      })
    }
  })
  return cols
}

/** "状态" / "status" column gets color-coded badge */
const STATUS_COLS = new Set(['状态', 'status'])

function DynamicTable({ items, sectionPath, rawJson, activeField, onFieldClick }) {
  if (!items || !Array.isArray(items) || items.length === 0) return null

  const cols = deriveColumns(items)
  if (cols.length === 0) return null

  return (
    <div className="overflow-x-auto mt-2">
      <table className="exam-table">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c}>{FIELD_LABELS[c] || c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIdx) => {
            if (!item || typeof item !== 'object') return null
            return (
              <tr key={rowIdx}>
                {cols.map(col => {
                  const keyPath = `${sectionPath}[${rowIdx}].${col}`
                  const rawLeaf = findInRawJson(rawJson, keyPath)
                  const isActive = activeField?.keyPath === keyPath
                  // Unwrap {"value": "..."} if present
                  const raw = item[col]
                  const val = (raw && typeof raw === 'object' && 'value' in raw) ? raw.value : raw

                  return (
                    <td
                      key={col}
                      className={`
                        transition-colors
                        ${rawLeaf ? 'cursor-pointer hover:bg-amber-50' : ''}
                        ${isActive ? 'bg-amber-50 ring-1 ring-amber-300' : ''}
                      `}
                      onClick={rawLeaf ? () => onFieldClick(keyPath, rawLeaf) : undefined}
                    >
                      {STATUS_COLS.has(col)
                        ? <StatusBadge status={val} />
                        : val !== null && val !== undefined
                          ? <span className="text-xs">{String(val)}</span>
                          : <NullValue />
                      }
                      {rawLeaf && (
                        <MapPin size={10} className={`inline ml-1 ${isActive ? 'text-amber-500' : 'text-slate-300'}`} />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="mb-3 border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-slate-700 text-sm">{title}</span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 py-2">
          {children}
        </div>
      )}
    </div>
  )
}

/** Detect {"value": "..."} wrapped leaf from LLM output */
function isValueWrapped(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && 'value' in v && Object.keys(v).length === 1
}

function renderObjectFields(obj, sectionKey, rawJson, activeField, onFieldClick) {
  if (!obj || typeof obj !== 'object') return null

  return Object.entries(obj).map(([key, value]) => {
    const keyPath = sectionKey ? `${sectionKey}.${key}` : key

    // Wrapped leaf: {"value": "..."} — LLM output format for backend coordinate matching
    if (isValueWrapped(value)) {
      const label = FIELD_LABELS[key] || key
      const rawLeaf = findInRawJson(rawJson, keyPath)
      const isActive = activeField?.keyPath === keyPath
      return (
        <FieldRow
          key={key}
          label={label}
          value={value.value}
          keyPath={keyPath}
          isActive={isActive}
          hasHighlight={!!rawLeaf}
          onClick={() => rawLeaf && onFieldClick(keyPath, rawLeaf)}
        />
      )
    }

    // Skip array rendering inline
    if (Array.isArray(value)) {
      // exam_items and medications (and any other array-of-objects) get table rendering
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        const label = FIELD_LABELS[key] || key
        return (
          <div key={key} className="mb-2">
            <div className="text-xs font-semibold text-slate-500 px-2 mb-1">{label}</div>
            <DynamicTable
              items={value}
              sectionPath={keyPath}
              rawJson={rawJson}
              activeField={activeField}
              onFieldClick={onFieldClick}
            />
          </div>
        )
      }
      // Generic array of strings
      const label = FIELD_LABELS[key] || key
      const displayVal = value.filter(Boolean).join('、') || null
      const rawLeaf = findInRawJson(rawJson, keyPath)
      const isActive = activeField?.keyPath === keyPath
      return (
        <FieldRow
          key={key}
          label={label}
          value={displayVal}
          keyPath={keyPath}
          isActive={isActive}
          hasHighlight={!!rawLeaf}
          onClick={() => rawLeaf && onFieldClick(keyPath, rawLeaf)}
        />
      )
    }

    // Nested object
    if (value !== null && typeof value === 'object') {
      const label = FIELD_LABELS[key] || key
      return (
        <div key={key} className="mb-1">
          <div className="text-xs font-semibold text-slate-500 px-2 py-1">{label}</div>
          <div className="pl-3 border-l-2 border-slate-100">
            {renderObjectFields(value, keyPath, rawJson, activeField, onFieldClick)}
          </div>
        </div>
      )
    }

    // Primitive value
    const label = FIELD_LABELS[key] || key
    const rawLeaf = findInRawJson(rawJson, keyPath)
    const isActive = activeField?.keyPath === keyPath
    return (
      <FieldRow
        key={key}
        label={label}
        value={value}
        keyPath={keyPath}
        isActive={isActive}
        hasHighlight={!!rawLeaf}
        onClick={() => rawLeaf && onFieldClick(keyPath, rawLeaf)}
      />
    )
  })
}

export default function ExtractionPanel({ extractResult, activeField, onFieldClick }) {
  const { llm_json, raw_json } = extractResult || {}

  if (!llm_json) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        暂无抽取结果
      </div>
    )
  }

  const handleFieldClick = useCallback((keyPath, rawLeaf) => {
    if (!rawLeaf?.bounding_regions?.length) return
    onFieldClick({
      keyPath,
      regions: rawLeaf.bounding_regions,
    })
  }, [onFieldClick])

  // Report type badge at top — unwrap {"value": "..."} if needed
  const reportType = llm_json.report_type?.value ?? llm_json.report_type

  const SECTIONS = [
    { key: 'patient_info', label: SECTION_LABELS.patient_info },
    { key: 'report_info', label: SECTION_LABELS.report_info },
    { key: 'diagnosis', label: SECTION_LABELS.diagnosis },
    { key: 'examination', label: SECTION_LABELS.examination },
    { key: 'treatment', label: SECTION_LABELS.treatment },
    { key: 'prognosis', label: SECTION_LABELS.prognosis },
  ]

  return (
    <div className="h-full overflow-y-auto px-1">
      {/* Report type */}
      {reportType && (
        <div className="flex items-center gap-2 mb-3 px-1 pt-1">
          <span className="text-xs text-slate-500">报告类型：</span>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            {reportType}
          </span>
        </div>
      )}

      {/* Source trace hint */}
      <div className="flex items-center gap-1.5 mb-3 px-2 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <MapPin size={12} className="text-amber-500 flex-shrink-0" />
        <span className="text-xs text-amber-700">点击带有定位图标的字段可在左侧高亮显示原文位置</span>
      </div>

      {SECTIONS.map(({ key, label }) => {
        const sectionData = llm_json[key]
        if (!sectionData) return null

        return (
          <Section key={key} title={label}>
            {renderObjectFields(sectionData, key, raw_json, activeField, handleFieldClick)}
          </Section>
        )
      })}
    </div>
  )
}
