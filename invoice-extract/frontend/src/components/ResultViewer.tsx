import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AppResult } from '../types/invoice';
import { PageImageViewer } from './PageImageViewer';
import { ExtractionResultPanel } from './ExtractionResult';
import { MarkdownPreview } from './MarkdownPreview';
import { ExportPanel } from './ExportPanel';

interface ResultViewerProps {
  result: AppResult;
  onReset: () => void;
}

type TabId = 'extraction' | 'markdown';

interface ToastMessage {
  id: number;
  text: string;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result, onReset }) => {
  const [activeTab, setActiveTab] = useState<TabId>('extraction');
  const [currentPage, setCurrentPage] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const pageImagesRef = useRef(result.pageImages);
  useEffect(() => { pageImagesRef.current = result.pageImages; }, [result.pageImages]);
  useEffect(() => {
    return () => { pageImagesRef.current.forEach((p) => { if (p.blobUrl) URL.revokeObjectURL(p.blobUrl); }); };
  }, []);

  const handlePageChange = useCallback((page: number) => { setCurrentPage(page); }, []);

  const showToast = useCallback((text: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top action bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          重新上传
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm text-slate-600 font-medium">解析完成</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>{result.pageImages.length} 页</span>
          {result.extraction.line_items?.length > 0 && (
            <>
              <span>·</span>
              <span>{result.extraction.line_items.length} 行项目</span>
            </>
          )}
          {result.warnings.length > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-500">{result.warnings.length} 条警告</span>
            </>
          )}
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: page image viewer */}
        <div className="w-1/2 flex flex-col border-r border-slate-200 min-w-0">
          <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-600">原文预览</h3>
          </div>
          <div className="flex-1 min-h-0">
            <PageImageViewer
              pages={result.pageImages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              highlight={null}
            />
          </div>
        </div>

        {/* Right panel: tabs */}
        <div className="w-1/2 flex flex-col min-w-0">
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 flex items-end gap-0">
            {[
              { id: 'extraction' as TabId, label: '抽取结果' },
              { id: 'markdown' as TabId, label: '解析预览' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-5 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'extraction' ? (
              <ExtractionResultPanel
                extraction={result.extraction}
                classification={result.classification}
                warnings={result.warnings}
                rawJson={result.rawJson}
                llmPages={result.llmPages}
                onFieldClick={() => {}}
                onNoPosition={() => showToast('当前版本不支持原文溯源')}
                isLoadingMoreItems={result.isLoadingMoreItems}
              />
            ) : (
              <MarkdownPreview markdown={result.markdown} />
            )}
          </div>

          <div className="flex-shrink-0">
            <ExportPanel result={result} />
          </div>
        </div>
      </div>

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-2.5 bg-slate-800/90 text-white text-sm rounded-xl shadow-lg backdrop-blur-sm"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
};
