import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { X, AlertCircle } from 'lucide-react'

import UploadZone from './components/UploadZone'
import StepIndicator from './components/StepIndicator'
import ResultLayout from './components/ResultLayout'

import { parseDocument, downloadAllPageImages } from './api/textin'
import { DEMO_NAME, FEATURE_TAGS } from './constants'

// ─── Loading overlay ─────────────────────────────────────────────────────────
function LoadingOverlay({ text }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8' }}
        />
        <div className="text-slate-700 font-medium text-sm text-center">{text}</div>
      </div>
    </div>
  )
}

// ─── Error banner ────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
      <div className="bg-white border border-red-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm mb-0.5">操作失败</div>
          <div className="text-slate-500 text-xs break-words">{message}</div>
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

// ─── Search helper ───────────────────────────────────────────────────────────
function runSearch(chunks, query) {
  const terms = query
    .toLowerCase()
    .split(/[\s　]+/)
    .filter((t) => t.length > 0)
  if (!terms.length) return []

  const results = []
  for (const chunk of chunks) {
    const haystack = `${chunk.text} ${chunk.title} ${chunk.path}`.toLowerCase()
    const matched = terms.filter((t) => haystack.includes(t))
    if (!matched.length) continue
    results.push({ chunk, score: matched.length / terms.length, matchedTerms: matched })
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 20)
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function App() {
  // 加载 MathJax(用于表格 / chunk 展开内容里的公式渲染)
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
  const [file, setFile] = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [includeParatext, setIncludeParatext] = useState(false)
  const [pageImages, setPageImages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [activeSource, setActiveSource] = useState(null)
  const [pageFlashKey, setPageFlashKey] = useState(0)
  const [activeTab, setActiveTab] = useState('chunks')
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [retryHint, setRetryHint] = useState(null)
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState(null)

  const activeChunkId = activeSource?.kind === 'chunk' ? activeSource.id : null
  const activeMediaId = activeSource?.kind === 'media' ? activeSource.mediaId : null
  const activeDetailIndex = activeSource?.kind === 'detail' ? activeSource.index : null

  // 后端预先算好两套 chunks,前端切换 includeParatext 时直接换数组,不重新调 OCR
  const chunks = useMemo(() => {
    if (!parseResult) return []
    return includeParatext ? parseResult.chunksWithParatext : parseResult.chunks
  }, [parseResult, includeParatext])

  const mediaItems = useMemo(() => parseResult?.media ?? [], [parseResult])

  const handleToggleParatext = useCallback((val) => {
    setIncludeParatext(val)
    setSearchResults([])
    setHasSearched(false)
    setActiveSource(null)
  }, [])

  const reset = useCallback(() => {
    setPhase('upload')
    setFile(null)
    setParseResult(null)
    setIncludeParatext(false)
    setPageImages([])
    setCurrentPage(0)
    setActiveSource(null)
    setActiveTab('chunks')
    setSearchResults([])
    setHasSearched(false)
    setLoadingImages(false)
    setRetryHint(null)
    setError(null)
  }, [])

  // ─── Highlight derivation ──────────────────────────────────────────────────
  const highlight = useMemo(() => {
    if (!activeSource || !parseResult) return null

    const buildFromDetailItems = (items, pageId, label) => {
      const page = parseResult.pages[pageId - 1]
      if (!page) return null
      const angle = page.angle ?? 0
      const swapped = angle === 90 || angle === 270
      const positions = items
        .filter((item) => item && item.page_id === pageId)
        .map((item) => item.position)
        .filter((pos) => pos && pos.length >= 8)
      if (!positions.length) return null
      return {
        positions,
        pageIndex: pageId - 1,
        pageWidth: swapped ? page.height : page.width,
        pageHeight: swapped ? page.width : page.height,
        label,
      }
    }

    if (activeSource.kind === 'chunk') {
      const chunk = chunks.find((c) => c.id === activeSource.id)
      if (!chunk) return null
      const items = chunk.detailIndices.map((i) => parseResult.detail[i])
      return buildFromDetailItems(items, chunk.page, chunk.title)
    }
    if (activeSource.kind === 'media') {
      const media = mediaItems.find((m) => m.id === activeSource.mediaId)
      if (!media) return null
      const item = parseResult.detail[media.detailIndex]
      if (!item) return null
      return buildFromDetailItems(
        [item],
        media.page,
        media.caption || media.parentTitle || (media.type === 'table' ? '表格' : '图片'),
      )
    }
    if (activeSource.kind === 'detail') {
      const item = parseResult.detail[activeSource.index]
      if (!item) return null
      return buildFromDetailItems([item], item.page_id, item.text?.slice(0, 30) ?? '')
    }
    return null
  }, [activeSource, chunks, mediaItems, parseResult])

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!parseResult)
      return { pages: 0, titles: 0, paragraphs: 0, tables: 0, images: 0, chunks: 0 }
    return {
      pages: parseResult.pages.length,
      titles: parseResult.detail.filter((d) => (d.outline_level ?? -1) >= 0).length,
      paragraphs: parseResult.detail.filter(
        (d) => d.type === 'paragraph' && (d.outline_level ?? -1) < 0,
      ).length,
      tables: parseResult.detail.filter((d) => d.type === 'table').length,
      images: parseResult.detail.filter((d) => d.type === 'image').length,
      chunks: chunks.length,
    }
  }, [parseResult, chunks])

  // ─── Selection handlers ───────────────────────────────────────────────────
  const handleSelectChunk = useCallback(
    (chunkId) => {
      const chunk = chunks.find((c) => c.id === chunkId)
      if (!chunk) return
      setActiveSource({ kind: 'chunk', id: chunkId })
      setCurrentPage(chunk.page - 1)
    },
    [chunks],
  )

  const handleSelectMedia = useCallback(
    (mediaId) => {
      const media = mediaItems.find((m) => m.id === mediaId)
      if (!media) return
      setActiveSource({ kind: 'media', mediaId })
      setCurrentPage(media.page - 1)
    },
    [mediaItems],
  )

  const handleSelectDetail = useCallback(
    (detailIndex) => {
      if (!parseResult) return
      const item = parseResult.detail[detailIndex]
      if (!item) return
      setActiveSource({ kind: 'detail', index: detailIndex })
      setCurrentPage(item.page_id - 1)
    },
    [parseResult],
  )

  const handleTreeJump = useCallback((pageIndex) => {
    setActiveSource(null)
    setCurrentPage(pageIndex)
    setPageFlashKey((k) => k + 1)
  }, [])

  // ─── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (query) => {
      if (!query.trim()) {
        setSearchResults([])
        setHasSearched(false)
        return
      }
      setSearchResults(runSearch(chunks, query))
      setHasSearched(true)
    },
    [chunks],
  )

  // ─── Image loading ─────────────────────────────────────────────────────────
  const loadImages = useCallback(async (pages) => {
    if (!pages?.length) return
    setLoadingImages(true)
    await downloadAllPageImages(
      pages,
      (img) => setPageImages((prev) => [...prev, img]),
      (hint) => setRetryHint(hint),
    )
    setLoadingImages(false)
    setRetryHint(null)
  }, [])

  // ─── Parse ─────────────────────────────────────────────────────────────────
  const handleParse = useCallback(async () => {
    if (!file) return
    setPhase('parsing')
    setLoadingText('正在进行 OCR 解析,请稍候...')
    setError(null)
    setParseResult(null)
    setPageImages([])
    setCurrentPage(0)
    setActiveSource(null)
    setSearchResults([])
    setHasSearched(false)

    try {
      const result = await parseDocument(file)
      if (!result.detail?.length && !result.markdown) {
        throw new Error('解析返回数据为空,请检查文档内容')
      }
      setParseResult(result)
      setPhase('result')
      setLoadingText('')
      loadImages(result.pages)
    } catch (err) {
      console.error('Parse error:', err)
      setError(err.message || '解析失败,请重试')
      setPhase('upload')
      setLoadingText('')
    }
  }, [file, loadImages])

  // ─── Render ────────────────────────────────────────────────────────────────
  const isLoading = phase === 'parsing'
  const hasResult = !!parseResult

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {isLoading && <LoadingOverlay text={loadingText} />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

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
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{DEMO_NAME}</h1>
              <p className="text-slate-500 text-sm">
                上传 GB/GB-T 等标准文件,按章节切分高质量分块,为知识库应用提供检索基础
              </p>
            </div>

            <div className="mb-8">
              <StepIndicator phase={phase} hasSearched={hasSearched} />
            </div>

            <UploadZone onFileSelect={(f) => setFile(f)} disabled={isLoading} />

            {file && (
              <div className="mt-6 flex justify-center">
                <button
                  className="flex items-center gap-2.5 px-8 py-3 rounded-xl font-semibold text-sm bg-blue-700 text-white hover:bg-blue-800 hover:shadow-md active:scale-95 transition-all duration-200 shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  onClick={handleParse}
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  开始解析
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
              <StepIndicator phase={phase} hasSearched={hasSearched} />
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
                    <rect x="2" y="1" width="10" height="14" rx="1.5" />
                    <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 font-medium max-w-[180px] truncate">
                  {file.name}
                </span>
              </div>
            )}
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 flex-shrink-0"
              onClick={reset}
            >
              <X size={14} />
              <span className="hidden sm:inline">新文件</span>
            </button>
          </div>

          {/* Result layout */}
          <div className="flex-1 min-h-0">
            <ResultLayout
              ocrResult={parseResult}
              pageImages={pageImages}
              chunks={chunks}
              mediaItems={mediaItems}
              stats={stats}
              activeTab={activeTab}
              activeChunkId={activeChunkId}
              activeMediaId={activeMediaId}
              activeDetailIndex={activeDetailIndex}
              searchResults={searchResults}
              hasSearched={hasSearched}
              currentPage={currentPage}
              highlight={highlight}
              pageFlashKey={pageFlashKey}
              markdownContent={parseResult.rebuiltMarkdown || parseResult.markdown}
              lineToDetail={parseResult.lineToDetail}
              loadingImages={loadingImages}
              retryHint={retryHint}
              fileName={file?.name ?? ''}
              includeParatext={includeParatext}
              onTabChange={setActiveTab}
              onSelectChunk={handleSelectChunk}
              onSelectMedia={handleSelectMedia}
              onSelectDetail={handleSelectDetail}
              onSearch={handleSearch}
              onPageChange={setCurrentPage}
              onTreeJump={handleTreeJump}
              onToggleParatext={handleToggleParatext}
            />
          </div>
        </div>
      )}
    </div>
  )
}
