import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

export default function PageImageViewer({
  pageImages,
  currentPage,
  onPageChange,
  loadingImages,
  retryHint,
}) {
  const [zoom, setZoom] = useState(1)

  const sortedImages = [...pageImages].sort((a, b) => a.pageIndex - b.pageIndex)
  const totalPages = sortedImages.length
  const currentPageData = sortedImages[currentPage]

  const blobUrl = currentPageData?.blobUrl
  const isLoading = loadingImages && !blobUrl

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={() => currentPage > 0 && onPageChange(currentPage - 1)}
            disabled={currentPage <= 0 || totalPages === 0}
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-sm text-slate-600 font-medium min-w-[80px] text-center">
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={() => currentPage < totalPages - 1 && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || totalPages === 0}
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-sm font-medium">暂无页面预览</div>
            <div className="text-xs text-slate-300">完成 OCR 解析后可查看</div>
          </div>
        ) : (
          <div
            className="relative inline-block"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            <img
              src={blobUrl}
              alt={`第 ${currentPage + 1} 页`}
              className="block max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%' }}
              draggable={false}
            />
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex-shrink-0">
        <span className="text-xs text-slate-400">
          第 <span className="font-medium text-slate-600">{currentPage + 1}</span> 页 / 共{' '}
          {totalPages} 页
        </span>
      </div>
    </div>
  )
}
