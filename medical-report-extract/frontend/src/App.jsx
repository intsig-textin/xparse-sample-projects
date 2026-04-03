import { useState, useCallback, useRef } from 'react'
import { ScanLine, Brain, AlertCircle, RefreshCw, X } from 'lucide-react'

import UploadZone from './components/UploadZone.jsx'
import StepIndicator from './components/StepIndicator.jsx'
import ResultLayout from './components/ResultLayout.jsx'
import ExportActions from './components/ExportActions.jsx'

import { parseDocument, downloadPageImage } from './api/textin.js'
import { extractKeyInfo } from './api/llm.js'

// ============================================================
// Helpers
// ============================================================

function LoadingOverlay({ text }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full spinner" style={{ borderWidth: 3 }} />
        <div className="text-slate-700 font-medium text-sm text-center">{text}</div>
      </div>
    </div>
  )
}

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

// ============================================================
// Main App
// ============================================================

export default function App() {
  const [phase, setPhase] = useState('upload')
  const [file, setFile] = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [extractResult, setExtractResult] = useState(null)
  const [pageImages, setPageImages] = useState({})
  const [loadingImages, setLoadingImages] = useState(false)

  const [activeTab, setActiveTab] = useState('extract')
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const abortRef = useRef(false)

  // ============================================================
  // Handle file select
  // ============================================================
  const handleFileSelect = useCallback((selectedFile) => {
    setFile(selectedFile)
    if (!selectedFile) {
      setPhase('upload')
      setParseResult(null)
      setExtractResult(null)
      setPageImages({})
    }
  }, [])

  const loadPageImages = useCallback(async (ocrPages) => {
    abortRef.current = false
    setLoadingImages(true)
    setPageImages({})
    for (const page of ocrPages) {
      if (abortRef.current) break
      if (!page.image_id) continue
      try {
        const blobUrl = await downloadPageImage(page.image_id)
        setPageImages(prev => ({ ...prev, [page.page_id ?? page.image_id]: blobUrl }))
      } catch (err) {
        console.warn('图像加载失败:', err)
      }
    }
    setLoadingImages(false)
  }, [])

  // ============================================================
  // Parse (OCR)
  // ============================================================
  const handleParse = useCallback(async () => {
    if (!file) return

    setPhase('parsing')
    setLoadingText('正在进行文档解析，请稍候...')
    setError(null)
    setParseResult(null)
    setExtractResult(null)
    setLastAction('parse')

    try {
      const result = await parseDocument(file)
      setParseResult(result)
      setPhase('result')
      setActiveTab('parse')
      loadPageImages(result.pages)
    } catch (err) {
      console.error('Parse error:', err)
      setError(err.message || '解析失败，请重试')
      setPhase('upload')
    } finally {
      setLoadingText('')
    }
  }, [file])

  // ============================================================
  // Extract (LLM)
  // ============================================================
  const handleExtract = useCallback(async () => {
    if (!parseResult) return

    setPhase('extracting')
    setLoadingText('AI 正在提取关键信息，请稍候...')
    setError(null)
    setLastAction('extract')

    try {
      const result = await extractKeyInfo(parseResult.markdown)
      setExtractResult(result)
      setPhase('result')
      setActiveTab('extract')
    } catch (err) {
      console.error('Extract error:', err)
      setError(err.message || 'AI 抽取失败，请重试')
      setPhase('result')
    } finally {
      setLoadingText('')
    }
  }, [parseResult])

  // ============================================================
  // Retry
  // ============================================================
  const handleRetry = useCallback(() => {
    setError(null)
    if (lastAction === 'parse') handleParse()
    else if (lastAction === 'extract') handleExtract()
  }, [lastAction, handleParse, handleExtract])

  // ============================================================
  // Derived values
  // ============================================================
  const isLoading = phase === 'parsing' || phase === 'extracting'
  const hasParseResult = !!parseResult
  const canParse = !!file && !isLoading
  const canExtract = !!parseResult && !isLoading

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {isLoading && <LoadingOverlay text={loadingText} />}

      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={lastAction ? handleRetry : null}
        />
      )}

      {/* Upload phase */}
      {!hasParseResult ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-700 rounded-2xl mb-4 shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12h6M12 9v6M3 12a9 9 0 1018 0A9 9 0 003 12z" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">医疗报告分析工具</h1>
              <p className="text-slate-500 text-sm">上传医疗报告，自动识别并提取关键信息</p>
            </div>

            <div className="mb-8">
              <StepIndicator phase={phase} />
            </div>

            <UploadZone onFileSelect={handleFileSelect} disabled={isLoading} />

            {file && (
              <div className="mt-6 flex justify-center">
                <button
                  className={`
                    flex items-center gap-2.5 px-8 py-3 rounded-xl font-semibold text-sm
                    transition-all duration-200 shadow-sm
                    ${canParse
                      ? 'bg-blue-700 text-white hover:bg-blue-800 hover:shadow-md active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  onClick={handleParse}
                  disabled={!canParse}
                >
                  <ScanLine size={17} />
                  开始解析
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-0">
              <StepIndicator phase={phase} />
            </div>

            {file && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                  <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="#1d4ed8" strokeWidth={1.5}>
                    <rect x="2" y="1" width="10" height="14" rx="1.5" />
                    <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 font-medium max-w-[160px] truncate">{file.name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                  ${canParse
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }
                `}
                onClick={canParse ? handleParse : undefined}
                disabled={!canParse}
                title="重新解析"
              >
                <ScanLine size={15} />
                <span className="hidden sm:inline">重新解析</span>
              </button>

              <button
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                  ${canExtract
                    ? 'bg-blue-700 text-white hover:bg-blue-800 shadow-sm'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }
                `}
                onClick={canExtract ? handleExtract : undefined}
                disabled={!canExtract}
                title="AI 信息抽取"
              >
                <Brain size={15} />
                <span className="hidden sm:inline">
                  {extractResult ? '重新抽取' : 'AI 抽取'}
                </span>
              </button>

              <ExportActions
                parseResult={parseResult}
                extractResult={extractResult}
                disabled={isLoading}
              />

              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                onClick={() => {
                  setPhase('upload')
                  setFile(null)
                  setParseResult(null)
                  setExtractResult(null)
                }}
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
              pages={parseResult?.pages || []}
              ocrPages={parseResult?.pages || []}
              pageImages={pageImages}
              currentPage={0}
              onPageChange={() => {}}
              activeField={null}
              onFieldClick={() => {}}
              loadingImages={loadingImages}
              parseResult={parseResult}
              extractResult={extractResult}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      )}
    </div>
  )
}
