import React, { useState, useEffect } from 'react'
import PageImageViewer from './PageImageViewer'
import ExtractionPanel from './ExtractionPanel'
import ParsePanel from './ParsePanel'

export default function ResultLayout({
  ocrResult,
  pageImages,
  extraction,
  extractionPhase,
  extractionError,
  progressText,
  loadingImages,
  retryHint,
}) {
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTab, setActiveTab] = useState('extract')

  useEffect(() => {
    if (extractionPhase === 'extracting' || extractionPhase === 'done') {
      setActiveTab('extract')
    }
  }, [extractionPhase])

  return (
    <div className="flex h-full min-h-0 gap-3">
      {/* Left: Page Image 45% */}
      <div className="flex-none" style={{ width: '45%', minWidth: 0 }}>
        <PageImageViewer
          pageImages={pageImages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          loadingImages={loadingImages}
          retryHint={retryHint}
        />
      </div>

      {/* Right: Tabs 55% */}
      <div className="flex flex-col min-h-0" style={{ width: '55%', minWidth: 0 }}>
        <div className="flex-shrink-0 flex items-center gap-1 mb-2">
          <button
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === 'extract'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            onClick={() => setActiveTab('extract')}
          >
            抽取结果
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === 'parse'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            onClick={() => setActiveTab('parse')}
          >
            解析原文
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {activeTab === 'extract' ? (
            <ExtractionPanel
              extraction={extraction}
              extractionPhase={extractionPhase}
              extractionError={extractionError}
              progressText={progressText}
            />
          ) : (
            <ParsePanel markdown={ocrResult.markdown} />
          )}
        </div>
      </div>
    </div>
  )
}
