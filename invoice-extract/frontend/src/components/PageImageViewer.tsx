import React, { useRef, useEffect, useState } from 'react';
import type { PageImage, HighlightRect } from '../types/invoice';

interface PageImageViewerProps {
  pages: PageImage[];
  currentPage: number;
  onPageChange: (page: number) => void;
  highlight: HighlightRect | null;
}

export const PageImageViewer: React.FC<PageImageViewerProps> = ({
  pages,
  currentPage,
  onPageChange,
  highlight,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const currentPageData = pages[currentPage];

  // Reset image loaded state when page changes
  useEffect(() => {
    setImgLoaded(false);
  }, [currentPage]);

  const highlightIsOnCurrentPage =
    highlight !== null && highlight.pageIndex === currentPage;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4 min-h-0"
      >
        {currentPageData && currentPageData.blobUrl ? (
          <div className="relative inline-block shadow-md rounded-lg overflow-hidden">
            <img
              ref={imgRef}
              src={currentPageData.blobUrl}
              alt={`第 ${currentPage + 1} 页`}
              onLoad={() => setImgLoaded(true)}
              className="block max-w-full"
              style={{ display: imgLoaded ? 'block' : 'none' }}
            />

            {/* Loading placeholder */}
            {!imgLoaded && (
              <div className="w-[600px] h-[800px] bg-slate-200 animate-pulse flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-slate-400 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}

            {/* Highlight overlay */}
            {imgLoaded && highlightIsOnCurrentPage && highlight && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${highlight.x}%`,
                  top: `${highlight.y}%`,
                  width: `${highlight.width}%`,
                  height: `${highlight.height}%`,
                  border: '2.5px solid rgb(251, 191, 36)',
                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  borderRadius: '2px',
                  animation: 'pulse-highlight 1.5s ease-in-out infinite',
                  zIndex: 10,
                }}
              />
            )}
          </div>
        ) : currentPageData && !currentPageData.blobUrl ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">暂无页面图片</p>
          </div>
        )}
      </div>

      {/* Thumbnail navigation */}
      {pages.length > 1 && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
              共 {pages.length} 页
            </span>
            {pages.map((page, idx) => (
              <button
                key={idx}
                onClick={() => onPageChange(idx)}
                className={`
                  flex-shrink-0 relative rounded-md overflow-hidden transition-all duration-150
                  ${currentPage === idx
                    ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md'
                    : 'opacity-60 hover:opacity-90 hover:shadow-sm'
                  }
                `}
                title={`第 ${idx + 1} 页`}
              >
                {page.blobUrl ? (
                  <img
                    src={page.blobUrl}
                    alt={`第 ${idx + 1} 页缩略图`}
                    className="w-12 h-16 object-cover object-top"
                  />
                ) : (
                  <div className="w-12 h-16 bg-slate-200 flex items-center justify-center">
                    <span className="text-xs text-slate-400">{idx + 1}</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] text-center py-0.5">
                  {idx + 1}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current page indicator */}
      {pages.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-slate-500 font-medium">
            第 <span className="text-slate-800">{currentPage + 1}</span> 页 / 共 {pages.length} 页
          </span>
          <button
            onClick={() => onPageChange(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage === pages.length - 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
