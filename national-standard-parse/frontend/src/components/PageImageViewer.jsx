import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

export default function PageImageViewer({
  pageImages,
  totalPages,
  currentPage,
  onPageChange,
  highlight,
  pageFlashKey,
  loadingImages,
  retryHint,
}) {
  const imgRef = useRef(null)
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 })
  const [zoom, setZoom] = useState(1)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (!pageFlashKey) return
    setFlashing(false)
    const t1 = window.requestAnimationFrame(() => setFlashing(true))
    const t2 = window.setTimeout(() => setFlashing(false), 1300)
    return () => {
      window.cancelAnimationFrame(t1)
      window.clearTimeout(t2)
    }
  }, [pageFlashKey])

  const sortedImages = [...pageImages].sort((a, b) => a.pageIndex - b.pageIndex)
  const currentPageData = sortedImages[currentPage]

  const measureImage = useCallback(() => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return
    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }, [])

  const highlightOnThisPage = highlight !== null && highlight?.pageIndex === currentPage

  const buildPolygonPoints = (pos) => {
    if (pos.length < 8) return ''
    const scaleX = imgNaturalSize.w / (highlight?.pageWidth ?? imgNaturalSize.w)
    const scaleY = imgNaturalSize.h / (highlight?.pageHeight ?? imgNaturalSize.h)
    const pts = []
    for (let i = 0; i < 8; i += 2) {
      pts.push(`${(pos[i] * scaleX).toFixed(1)},${(pos[i + 1] * scaleY).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const blobUrl = currentPageData?.blobUrl
  const isLoading = loadingImages && !blobUrl

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={() => currentPage > 0 && onPageChange(currentPage - 1)}
            disabled={currentPage <= 0}
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-sm text-slate-600 font-medium min-w-[80px] text-center">
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={() => currentPage < totalPages - 1 && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
          >
            <ZoomOut size={14} className="text-slate-500" />
          </button>
          <button
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-600 font-medium min-w-[44px] text-center"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
          >
            <ZoomIn size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 overflow-auto relative flex items-center justify-center"
        style={{ minHeight: 0 }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">{retryHint ?? '加载页面图像...'}</span>
          </div>
        ) : !blobUrl ? (
          <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div className="text-sm font-medium">暂无页面预览</div>
            <div className="text-xs text-slate-300">完成解析后可查看</div>
          </div>
        ) : (
          <div
            className="relative inline-block"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <img
              ref={imgRef}
              src={blobUrl}
              alt={`第 ${currentPage + 1} 页`}
              className="block max-w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
              onLoad={measureImage}
              draggable={false}
            />
            {flashing && <div className="absolute inset-0 pointer-events-none page-flash" />}
            {highlightOnThisPage && highlight && imgNaturalSize.w > 1 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
                viewBox={`0 0 ${imgNaturalSize.w} ${imgNaturalSize.h}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {highlight.positions.map((pos, i) => {
                  const pts = buildPolygonPoints(pos)
                  if (!pts) return null
                  return (
                    <polygon
                      key={i}
                      className="highlight-polygon"
                      points={pts}
                      fill="rgba(245,158,11,0.25)"
                      stroke="rgba(245,158,11,0.9)"
                      strokeWidth={Math.max(1, 2 / zoom)}
                      strokeLinejoin="round"
                    />
                  )
                })}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            第 <span className="font-medium text-slate-600">{currentPage + 1}</span> 页 / 共{' '}
            <span className="font-medium text-slate-600">{totalPages}</span> 页
          </span>
          {highlight && highlightOnThisPage && (
            <span className="text-xs text-amber-600 font-medium">· 已定位: {highlight.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}
