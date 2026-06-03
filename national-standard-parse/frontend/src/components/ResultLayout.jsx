import React from 'react'
import PageImageViewer from './PageImageViewer'
import MarkdownPanel from './MarkdownPanel'
import TreePanel from './TreePanel'
import ChunkPanel from './ChunkPanel'
import MediaPanel from './MediaPanel'

const TABS = [
  { id: 'chunks', label: 'Chunks' },
  { id: 'tree', label: '目录' },
  { id: 'tables', label: '表格' },
  { id: 'images', label: '图片' },
  { id: 'markdown', label: 'Markdown' },
]

export default function ResultLayout({
  ocrResult,
  pageImages,
  chunks,
  mediaItems,
  stats,
  activeTab,
  activeChunkId,
  activeMediaId,
  activeDetailIndex,
  searchResults,
  hasSearched,
  currentPage,
  highlight,
  pageFlashKey,
  markdownContent,
  lineToDetail,
  loadingImages,
  retryHint,
  fileName,
  includeParatext,
  onTabChange,
  onSelectChunk,
  onSelectMedia,
  onSelectDetail,
  onSearch,
  onPageChange,
  onTreeJump,
  onToggleParatext,
}) {
  const catalog = ocrResult.catalog ?? []
  const tableItems = mediaItems.filter((m) => m.type === 'table')
  const imageItems = mediaItems.filter((m) => m.type === 'image')

  return (
    <div className="flex h-full gap-3 min-h-0">
      {/* Left: page image viewer (45%) */}
      <div className="w-[45%] flex-shrink-0 min-w-0">
        <PageImageViewer
          pageImages={pageImages}
          totalPages={ocrResult.pages.length}
          currentPage={currentPage}
          onPageChange={onPageChange}
          highlight={highlight}
          pageFlashKey={pageFlashKey}
          loadingImages={loadingImages}
          retryHint={retryHint}
        />
      </div>

      {/* Right: result panel (55%) */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Tab bar */}
        <div className="flex-shrink-0 flex items-end gap-1 px-3 pt-2 border-b border-slate-200 bg-white">
          {TABS.map((tab) => {
            const badgeCount =
              tab.id === 'chunks'
                ? stats.chunks
                : tab.id === 'tables'
                ? stats.tables
                : tab.id === 'images'
                ? stats.images
                : 0
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-white border border-slate-200 border-b-white -mb-px'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {badgeCount > 0 && (
                  <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full">
                    {badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'chunks' && (
            <ChunkPanel
              chunks={chunks}
              searchResults={searchResults}
              hasSearched={hasSearched}
              activeChunkId={activeChunkId}
              fileName={fileName}
              includeParatext={includeParatext}
              onSelectChunk={onSelectChunk}
              onSearch={onSearch}
              onToggleParatext={onToggleParatext}
            />
          )}
          {activeTab === 'tree' && <TreePanel catalog={catalog} onPageJump={onTreeJump} />}
          {activeTab === 'tables' && (
            <MediaPanel
              type="table"
              items={tableItems}
              activeMediaId={activeMediaId}
              onSelectMedia={onSelectMedia}
            />
          )}
          {activeTab === 'images' && (
            <MediaPanel
              type="image"
              items={imageItems}
              activeMediaId={activeMediaId}
              onSelectMedia={onSelectMedia}
            />
          )}
          {activeTab === 'markdown' && (
            <MarkdownPanel
              markdown={markdownContent}
              fileName={fileName}
              lineToDetail={lineToDetail}
              activeDetailIndex={activeDetailIndex}
              onSelectDetail={onSelectDetail}
            />
          )}
        </div>
      </div>
    </div>
  )
}
