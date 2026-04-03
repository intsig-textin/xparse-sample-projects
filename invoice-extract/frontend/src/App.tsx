import { useState, useCallback } from 'react';
import type { ProcessingState, AppResult, LineItem } from './types/invoice';
import { callTextInOcr, downloadPageImage } from './api/textin';
import {
  classifyDocument,
  extractHeaderFields,
  extractLineItemsSingle,
  extractLineItemsBatch,
  assembleExtraction,
  prepareLineItemBatches,
} from './api/llm';
import { normalizeExtraction } from './utils/normalize';
import { validateExtraction } from './utils/validation';
import { UploadZone } from './components/UploadZone';
import { ProcessingPanel } from './components/ProcessingPanel';
import { ResultViewer } from './components/ResultViewer';

type AppView = 'upload' | 'processing' | 'result';

const initialProcessingState: ProcessingState = {
  step: 'idle',
  progress: 0,
  message: '',
};

export default function App() {
  const [view, setView] = useState<AppView>('upload');
  const [processingState, setProcessingState] = useState<ProcessingState>(initialProcessingState);
  const [result, setResult] = useState<AppResult | null>(null);

  const updateProcessing = useCallback(
    (step: ProcessingState['step'], progress: number, message: string, error?: string) => {
      setProcessingState({ step, progress, message, error });
    },
    []
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      setView('processing');
      setResult(null);

      try {
        // ── Step 1: OCR ────────────────────────────────────────────────────
        updateProcessing('uploading', 5, '正在上传文件并调用文档解析服务…');
        updateProcessing('ocr', 15, '文档解析中，请稍候…');

        const ocrResult = await callTextInOcr(file);
        if (!ocrResult.pages || ocrResult.pages.length === 0) {
          throw new Error('文档解析未返回页面数据，请检查文件是否为有效的 PDF 或 Word 文档');
        }

        // ── Step 2: Classification ─────────────────────────────────────────
        updateProcessing('classify', 35, '正在调用 AI 进行文档分类…');
        const classification = await classifyDocument(ocrResult);

        // ── Step 3: Header extraction ─────────────────────────────────────
        updateProcessing('extract', 55, '正在抽取发票头字段…');
        const headerResult = await extractHeaderFields(ocrResult);

        // ── Step 4: Assemble header-only result, switch to result page ────
        const batchPlan = prepareLineItemBatches(ocrResult);
        const initialAssembled = assembleExtraction(headerResult, [], {});
        const normalizedInitial = normalizeExtraction(initialAssembled.extraction);
        const initialWarnings = validateExtraction(normalizedInitial, ocrResult.pages.length);

        updateProcessing('done', 100, '处理完成，正在加载结果…');

        setResult({
          ocrResult,
          classification,
          extraction: normalizedInitial,
          rawJson: initialAssembled.rawJson,
          llmPages: initialAssembled.llmPages,
          pageImages: [],
          warnings: initialWarnings,
          markdown: ocrResult.markdown,
          isLoadingMoreItems: true,
        });
        setView('result');

        // ── Background: line item extraction (concurrent queue, max 2) ────
        (async () => {
          if (!batchPlan.useBatching) {
            try {
              const r = await extractLineItemsSingle(ocrResult);
              setResult((prev) => {
                if (!prev) return prev;
                const updated = { ...prev.extraction, line_items: r.lineItems };
                return {
                  ...prev,
                  extraction: updated,
                  isLoadingMoreItems: false,
                  warnings: validateExtraction(updated, ocrResult.pages.length),
                };
              });
            } catch (err) {
              console.error('明细行抽取失败:', err);
              setResult((prev) => (prev ? { ...prev, isLoadingMoreItems: false } : prev));
            }
            return;
          }

          const BATCH_CONCURRENCY = 2;
          const total = batchPlan.batches.length;
          const batchItems = new Array<LineItem[]>(total);
          const done = new Array<boolean>(total).fill(false);
          let nextToStart = 0;
          let nextToApply = 0;

          function applyOrdered() {
            while (nextToApply < total && done[nextToApply]) {
              const idx = nextToApply;
              const isLast = idx === total - 1;
              const items = batchItems[idx];
              setResult((prev) => {
                if (!prev) return prev;
                const newItems = [...prev.extraction.line_items, ...items];
                const updated = { ...prev.extraction, line_items: newItems };
                return {
                  ...prev,
                  extraction: updated,
                  isLoadingMoreItems: !isLast,
                  warnings: isLast
                    ? validateExtraction(updated, ocrResult.pages.length)
                    : prev.warnings,
                };
              });
              nextToApply++;
            }
          }

          async function runBatch(i: number): Promise<void> {
            try {
              const r = await extractLineItemsBatch(batchPlan.batches[i]);
              batchItems[i] = r.lineItems;
            } catch (err) {
              console.error(`明细行第 ${i + 1} 批抽取失败:`, err);
              batchItems[i] = [];
            }
            done[i] = true;
            applyOrdered();
            if (nextToStart < total) {
              runBatch(nextToStart++);
            }
          }

          while (nextToStart < Math.min(BATCH_CONCURRENCY, total)) {
            runBatch(nextToStart++);
          }
        })();

        // ── Background B: page image loading (concurrent, max 4) ─────────
        (async () => {
          const IMAGE_CONCURRENCY = 4;
          const pages = ocrResult.pages;
          let nextToStart = 0;

          async function downloadOne(i: number): Promise<void> {
            const page = pages[i];
            const blobUrl = await downloadPageImage(page.image_id).catch(() => '');
            setResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pageImages: [
                  ...prev.pageImages,
                  { imageId: page.image_id, blobUrl, pageIndex: i, width: page.width, height: page.height },
                ],
              };
            });
            if (nextToStart < pages.length) {
              await downloadOne(nextToStart++);
            }
          }

          const initial = Math.min(IMAGE_CONCURRENCY, pages.length);
          await Promise.all(
            Array.from({ length: initial }, () => downloadOne(nextToStart++))
          );
        })();
      } catch (err) {
        const message = err instanceof Error ? err.message : '处理过程中发生未知错误';
        updateProcessing('error', 0, '处理失败', message);
      }
    },
    [updateProcessing]
  );

  const handleReset = useCallback(() => {
    setView('upload');
    setResult(null);
    setProcessingState(initialProcessingState);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {view === 'upload' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-6 shadow-lg shadow-indigo-200">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">海外发票智能抽取</h1>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              上传海外发票文件，AI 自动识别并结构化抽取发票关键信息，支持多语言、多格式、多页发票
            </p>
          </div>

          <UploadZone onFileSelected={handleFileSelected} />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '🌐', text: '多语言支持' },
              { icon: '📋', text: '全字段抽取' },
              { icon: '✅', text: '自动校验' },
              { icon: '📤', text: 'JSON 导出' },
            ].map((f) => (
              <span
                key={f.text}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm"
              >
                <span>{f.icon}</span>
                {f.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {view === 'processing' && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <ProcessingPanel
            step={processingState.step}
            message={processingState.message}
            progress={processingState.progress}
            error={processingState.error}
            onReset={handleReset}
          />
        </div>
      )}

      {view === 'result' && result && (
        <ResultViewer result={result} onReset={handleReset} />
      )}
    </div>
  );
}
