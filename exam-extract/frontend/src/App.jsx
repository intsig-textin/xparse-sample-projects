import React, { useState, useCallback, useEffect } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'

import UploadZone from './components/UploadZone'
import StepIndicator from './components/StepIndicator'
import ResultLayout from './components/ResultLayout'
import ExportActions from './components/ExportActions'

import { parseDocument, downloadAllPageImages } from './api/textin'
import { extractFieldsStream } from './api/llm'
import { DEMO_NAME, FEATURE_TAGS } from './constants'

// ─── Loading overlay ─────────────────────────────────────────────────────────
function LoadingOverlay({ text }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '2px solid #e2e8f0', borderTopColor: '#2563eb' }}
        />
        <div className="text-slate-700 font-medium text-sm text-center">{text}</div>
      </div>
    </div>
  )
}

// ─── Error banner ────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss, onRetry }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
      <div className="bg-white border border-red-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm mb-0.5">操作失败</div>
          <div className="text-slate-500 text-xs break-words">{message}</div>
          {onRetry && (
            <button
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              onClick={onRetry}
            >
              <RefreshCw size={12} /> 重试
            </button>
          )}
        </div>
        <button
          className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={onDismiss}
        >
          <X size={14} className="text-slate-400" />
        </button>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function App() {
  // 加载 MathJax(用于题干 / 选项内容里的公式渲染)
  useEffect(() => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [
            ['$', '$'],
            ['\\(', '\\)'],
          ],
          displayMath: [
            ['$$', '$$'],
            ['\\[', '\\]'],
          ],
        },
        options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] },
      }
      const s = document.createElement('script')
      s.src = 'https://static.textin.com/deps/mathjax@3.2.2/es5/tex-mml-chtml.js'
      s.async = true
      document.head.appendChild(s)
    }
  }, [])

  const [phase, setPhase] = useState('upload')
  const [extractionPhase, setExtractionPhase] = useState('idle')
  const [file, setFile] = useState(null)
  const [ocrResult, setOcrResult] = useState(null)
  const [extraction, setExtraction] = useState(null)
  const [pageImages, setPageImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [retryHint, setRetryHint] = useState(null)
  const [loadingText, setLoadingText] = useState('')
  const [batchProgressText, setBatchProgressText] = useState(null)
  const [error, setError] = useState(null)

  const reset = useCallback(() => {
    setPhase('upload')
    setExtractionPhase('idle')
    setFile(null)
    setOcrResult(null)
    setExtraction(null)
    setPageImages([])
    setLoadingImages(false)
    setRetryHint(null)
    setBatchProgressText(null)
    setError(null)
  }, [])

  // ─── Background: page images ────────────────────────────────────────────
  const loadImages = useCallback(async (ocr) => {
    if (!ocr.pages?.length) return
    setLoadingImages(true)
    await downloadAllPageImages(
      ocr.pages,
      (img) => setPageImages((prev) => [...prev, img]),
      (hint) => setRetryHint(hint),
    )
    setLoadingImages(false)
    setRetryHint(null)
  }, [])

  // ─── Background: extract via SSE ────────────────────────────────────────
  const runExtraction = useCallback(async (ocr) => {
    setExtractionPhase('extracting')
    setError(null)

    try {
      const ext = await extractFieldsStream(ocr, {
        onProgress: (done, total) => {
          if (total > 1) setBatchProgressText(`正在抽取题目... (${done}/${total} 批次)`)
          else setBatchProgressText('正在抽取题目...')
        },
      })
      setBatchProgressText(null)
      setExtraction(ext)
      setExtractionPhase('done')
    } catch (err) {
      console.error('Extraction error:', err)
      setExtractionPhase('error')
      setError(err.message || 'AI 抽取失败，请重试')
    }
  }, [])

  // ─── Parse ────────────────────────────────────────────────────────────────
  const handleParse = useCallback(async () => {
    if (!file) return
    setPhase('parsing')
    setLoadingText('正在进行 OCR 解析，请稍候...')
    setError(null)
    setOcrResult(null)
    setExtraction(null)
    setPageImages([])
    setExtractionPhase('idle')

    try {
      const ocr = await parseDocument(file)
      if (!ocr.detail?.length && !ocr.markdown) {
        throw new Error('解析返回数据为空，请检查文档内容')
      }
      setOcrResult(ocr)
      setPhase('result')
      setLoadingText('')

      loadImages(ocr)
      runExtraction(ocr)
    } catch (err) {
      console.error('Parse error:', err)
      setError(err.message || '解析失败，请重试')
      setPhase('upload')
      setLoadingText('')
    }
  }, [file, loadImages, runExtraction])

  // ─── Render ────────────────────────────────────────────────────────────────
  const isOcrLoading = phase === 'parsing'
  const hasResult = !!ocrResult

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {isOcrLoading && <LoadingOverlay text={loadingText} />}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={phase === 'upload' ? () => handleParse() : null}
        />
      )}

      {!hasResult ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-700 rounded-2xl mb-4 shadow-lg">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-7 h-7 text-white"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{DEMO_NAME}</h1>
              <p className="text-slate-500 text-sm">
                上传试卷，AI 自动识别并结构化抽取所有题目，可直接入题库
              </p>
            </div>

            <div className="mb-8">
              <StepIndicator phase={phase} extractionPhase={extractionPhase} />
            </div>

            <UploadZone onFileSelect={(f) => setFile(f)} disabled={isOcrLoading} />

            {file && (
              <div className="mt-6 flex justify-center">
                <button
                  className="flex items-center gap-2.5 px-8 py-3 rounded-xl font-semibold text-sm bg-blue-700 text-white hover:bg-blue-800 hover:shadow-md active:scale-95 transition-all duration-200 shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  onClick={handleParse}
                  disabled={isOcrLoading}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  开始抽取
                </button>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {FEATURE_TAGS.map((t) => (
                <span
                  key={t.label}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium ${t.color}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-0">
              <StepIndicator phase={phase} extractionPhase={extractionPhase} />
            </div>

            {file && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="w-3 h-3"
                    stroke="#1d4ed8"
                    strokeWidth={1.5}
                  >
                    <path d="M3 2h7l3 3v9H3V2z" />
                    <path d="M10 2v3h3" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 font-medium max-w-[160px] truncate">
                  {file.name}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              <ExportActions extraction={extraction} disabled={extractionPhase !== 'done'} />
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                onClick={reset}
                title="上传新文件"
              >
                <X size={14} />
                <span className="hidden sm:inline">新文件</span>
              </button>
            </div>
          </div>

          {/* Result layout */}
          <div className="flex-1 min-h-0">
            <ResultLayout
              ocrResult={ocrResult}
              pageImages={pageImages}
              extraction={extraction}
              extractionPhase={extractionPhase}
              extractionError={error}
              progressText={batchProgressText}
              loadingImages={loadingImages}
              retryHint={retryHint}
            />
          </div>
        </div>
      )}
    </div>
  )
}
