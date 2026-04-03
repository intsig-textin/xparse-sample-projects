import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

/**
 * Renders the page image with SVG overlay for highlight polygons.
 *
 * Props:
 *   pages: Array of page metadata from LLM result (has page_id, width, height)
 *   ocrPages: Array from OCR result (has page_id, image_id)
 *   pageImages: { [page_id]: blobUrl }
 *   currentPage: 0-based index into pages array
 *   onPageChange: (newIndex) => void
 *   activeField: { keyPath, regions: [{ page_id, position, value }] } | null
 *   loadingImages: boolean
 */
export default function PageImageViewer({
  pages,
  ocrPages,
  pageImages,
  currentPage,
  onPageChange,
  activeField,
  loadingImages,
}) {
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 })
  const [zoom, setZoom] = useState(1)

  const totalPages = pages?.length || ocrPages?.length || 0

  // Get page_id for current page
  const getCurrentPageId = useCallback(() => {
    if (pages && pages[currentPage]) return pages[currentPage].page_id
    if (ocrPages && ocrPages[currentPage]) return ocrPages[currentPage].page_id
    return null
  }, [pages, ocrPages, currentPage])

  const pageId = getCurrentPageId()
  const blobUrl = pageImages?.[pageId]

  // Get page dimensions from LLM result pages (or OCR pages)
  const getPageDimensions = useCallback((pid) => {
    const p = pages?.find(p => p.page_id === pid)
    if (p) return { w: p.width || 1, h: p.height || 1 }
    const op = ocrPages?.find(p => p.page_id === pid)
    if (op) return { w: op.width || 1, h: op.height || 1 }
    return { w: 1, h: 1 }
  }, [pages, ocrPages])

  // Capture natural image dimensions on load
  const measureImage = useCallback(() => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return
    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }, [])

  useEffect(() => {
    measureImage()
  }, [measureImage, blobUrl])

  const handlePrev = () => {
    if (currentPage > 0) onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages - 1) onPageChange(currentPage + 1)
  }

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5))
  const handleZoomReset = () => setZoom(1)

  const isLoading = loadingImages && !blobUrl

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={handlePrev}
            disabled={currentPage <= 0 || totalPages === 0}
            title="上一页"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>

          <span className="text-sm text-slate-600 font-medium min-w-[80px] text-center">
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}
          </span>

          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1 || totalPages === 0}
            title="下一页"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut size={14} className="text-slate-500" />
          </button>
          <button
            className="px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-600 font-medium min-w-[44px] text-center"
            onClick={handleZoomReset}
            title="重置缩放"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative flex items-center justify-center"
        style={{ minHeight: 0 }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full spinner" />
            <span className="text-sm">加载页面图像...</span>
          </div>
        ) : !blobUrl ? (
          <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center">
              <Maximize2 size={28} className="text-slate-400" />
            </div>
            <div className="text-sm font-medium">暂无页面预览</div>
            <div className="text-xs text-slate-300">完成 OCR 解析后可查看页面图像</div>
          </div>
        ) : (
          <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <img
              ref={imgRef}
              src={blobUrl}
              alt={`Page ${currentPage + 1}`}
              className="block max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%' }}
              onLoad={measureImage}
              draggable={false}
            />
            {/* SVG overlay — sits inside the zoomed container so it scales with the image */}
            {activeField?.regions?.length > 0 && imgNaturalSize.w > 1 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
                viewBox={`0 0 ${imgNaturalSize.w} ${imgNaturalSize.h}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {(() => {
                  const pageDims = getPageDimensions(pageId)
                  // Map from page coordinate space → natural image coordinate space
                  const scaleX = imgNaturalSize.w / pageDims.w
                  const scaleY = imgNaturalSize.h / pageDims.h
                  return activeField.regions
                    .filter(r => r.page_id === pageId)
                    .map((region, idx) => {
                      const pos = region.position
                      if (!pos || pos.length < 8) return null
                      const pts = []
                      for (let i = 0; i < 8; i += 2) {
                        pts.push(`${pos[i] * scaleX},${pos[i + 1] * scaleY}`)
                      }
                      return (
                        <polygon
                          key={idx}
                          className="highlight-polygon"
                          points={pts.join(' ')}
                          fill="rgba(245, 158, 11, 0.25)"
                          stroke="rgba(245, 158, 11, 0.9)"
                          strokeWidth={Math.max(1, 2 / zoom)}
                          strokeLinejoin="round"
                        />
                      )
                    })
                })()}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Page ID info */}
      {pageId !== null && (
        <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex-shrink-0">
          <span className="text-xs text-slate-400">Page ID: {pageId}</span>
          {activeField && (
            <span className="ml-3 text-xs text-amber-600 font-medium">
              · 已高亮: {activeField.keyPath}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
