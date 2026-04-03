import React from 'react'
import PageImageViewer from './PageImageViewer.jsx'
import ExtractionPanel from './ExtractionPanel.jsx'
import ParsePanel from './ParsePanel.jsx'

export default function ResultLayout({
  pages,
  ocrPages,
  pageImages,
  currentPage,
  onPageChange,
  activeField,
  onFieldClick,
  loadingImages,
  parseResult,
  extractResult,
  activeTab,
  onTabChange,
}) {
  return (
    <div className="flex h-full min-h-0 gap-3">
      {/* Left: Page Image Viewer 45% */}
      <div className="flex-none" style={{ width: '45%', minWidth: 0 }}>
        <PageImageViewer
          pages={pages}
          ocrPages={ocrPages}
          pageImages={pageImages}
          currentPage={currentPage}
          onPageChange={onPageChange}
          activeField={activeField}
          loadingImages={loadingImages}
        />
      </div>

      {/* Right: Tabbed results 55% */}
      <div className="flex flex-col min-h-0" style={{ width: '55%', minWidth: 0 }}>
        {/* Tab header */}
        <div className="flex-shrink-0 flex items-center gap-1 mb-2">
          <button
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
              ${activeTab === 'extract'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }
            `}
            onClick={() => onTabChange('extract')}
          >
            抽取结果
          </button>
          <button
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
              ${activeTab === 'parse'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }
            `}
            onClick={() => onTabChange('parse')}
          >
            解析结果
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {activeTab === 'extract' ? (
            <ExtractionPanel
              extractResult={extractResult}
              activeField={activeField}
              onFieldClick={onFieldClick}
            />
          ) : (
            <ParsePanel parseResult={parseResult} />
          )}
        </div>
      </div>
    </div>
  )
}
