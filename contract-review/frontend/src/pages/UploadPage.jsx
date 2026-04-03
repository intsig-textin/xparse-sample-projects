import { useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { parseDocumentWithTextIn } from '../api/textin'
import { callLLM, parseLLMJson } from '../api/llm'
import { CLAUSE_PROMPT, NORM_PROMPT } from '../prompts'

const IconDoc = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)
const IconShield = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

export default function UploadPage() {
  const { dispatch } = useApp()
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  function validateAndSet(f) {
    setError('')
    if (!f) return
    const name = f.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.doc') && !name.endsWith('.docx')) {
      setError('请上传 PDF 或 Word 格式文件')
      return
    }
    if (f.size > 50 * 1024 * 1024) { setError('文件大小不能超过 50MB'); return }
    setFile(f)
  }

  async function startReview() {
    if (!file) return
    dispatch({ type: 'SET_FILE', payload: file })
    dispatch({ type: 'SET_VIEW', payload: 'loading' })
    dispatch({ type: 'SET_LOADING_ERROR', payload: '' })
    dispatch({ type: 'SET_STEP_STATUS', payload: ['waiting'] })

    try {
      // Step 1 — OCR (sequential, must complete before anything else)
      dispatch({ type: 'SET_STEP_STATUS', payload: ['active'] })
      const { markdown, pages } = await parseDocumentWithTextIn(file)
      dispatch({ type: 'SET_OCR_RESULT', payload: { markdown, pages } })
      dispatch({ type: 'SET_STEP_STATUS', payload: ['done'] })

      // Navigate to results immediately — LLM calls run in parallel in the background
      dispatch({ type: 'SET_CLAUSE_LOADING', payload: true })
      dispatch({ type: 'SET_NORM_LOADING',   payload: true })
      dispatch({ type: 'SET_VIEW', payload: 'results' })

      callLLM(CLAUSE_PROMPT, markdown)
        .then(res => dispatch({ type: 'SET_CLAUSE_RESULT', payload: { llm: parseLLMJson(res.llm_json), raw: res.raw_json } }))
        .catch(err => dispatch({ type: 'SET_CLAUSE_ERROR', payload: err.message || '条款审阅请求失败' }))

      callLLM(NORM_PROMPT, markdown)
        .then(res => dispatch({ type: 'SET_NORM_RESULT', payload: { llm: parseLLMJson(res.llm_json), raw: res.raw_json } }))
        .catch(err => dispatch({ type: 'SET_NORM_ERROR', payload: err.message || '规范审阅请求失败' }))

    } catch (err) {
      console.error(err)
      dispatch({ type: 'SET_LOADING_ERROR', payload: err.message || 'OCR 解析失败，请重试' })
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 45%, #dbeafe 100%)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight font-heading" style={{ color: '#0f172a' }}>合同智审</h1>
        </div>
        <p className="text-base font-light" style={{ color: '#1d4ed8' }}>AI 驱动的智能合同风险审查平台</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-xl fade-in-up-delay">
        <div className="bg-white rounded-3xl shadow-2xl p-8">

          {/* Drop zone */}
          <div
            className={`drop-zone ${dragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); validateAndSet(e.dataTransfer.files[0]) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => validateAndSet(e.target.files[0])} />

            {!file ? (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-navy-700" style={{ background: '#f0f4ff' }}>
                  <IconDoc />
                </div>
                <p className="text-slate-700 font-semibold text-lg mb-1">拖拽文件至此处，或点击上传</p>
                <p className="text-slate-400 text-sm mb-3">支持 PDF / Word 合同文件，最大 50MB</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#f0f4ff', color: '#1a2744' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  PDF · DOC · DOCX
                </span>
              </div>
            ) : (
              <div className="fade-in-up">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-emerald-600" style={{ background: '#f0fdf4' }}>
                  <IconCheck />
                </div>
                <p className="text-slate-800 font-semibold text-base mb-0.5 truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-slate-400 text-sm">{formatFileSize(file.size)}</p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="mt-3 text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer underline"
                >
                  重新选择
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={startReview}
            disabled={!file}
            className="mt-6 w-full py-3.5 rounded-xl font-semibold text-base text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-heading"
            style={file
              ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }
              : { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' }
            }
          >
            <IconShield />
            开始智能审查
          </button>
        </div>

        {/* Feature badges */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: '条款风险识别', desc: '5大风险类型' },
            { label: '规范性检查',   desc: '错漏·一致性·格式' },
          ].map(f => (
            <div key={f.label} className="bg-white/80 rounded-xl px-3 py-3 text-center shadow-sm border border-blue-100 backdrop-blur-sm">
              <p className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>{f.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#3b82f6' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
