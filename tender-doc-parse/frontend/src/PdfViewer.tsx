import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from 'lucide-react';

// 设置 PDF.js 的 worker
// 使用本地 node_modules 中的 worker，避免 CDN 加载失败或 CORS 问题
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface HighlightRegion {
  page_id: number;
  position: number[]; // [x1, y1, x2, y2, x3, y3, x4, y4]
}

interface PdfViewerProps {
  fileUrl: string;
  pageNumber: number; // 需要跳转到的页码 (1-based)
  highlights?: HighlightRegion[];
  ocrDpi?: number; // 新增：OCR 使用的 DPI，默认为 72
}

const PageWithHighlights = ({ 
  pageNumber, 
  width, 
  highlights,
  ocrDpi = 72
}: { 
  pageNumber: number, 
  width?: number, 
  highlights: HighlightRegion[],
  ocrDpi?: number
}) => {
  const [pageOriginalSize, setPageOriginalSize] = useState<{ width: number; height: number } | null>(null);

  const onPageLoadSuccess = (page: any) => {
    // 获取页面原始尺寸，用于计算缩放比例
    const viewport = page.getViewport({ scale: 1 });
    setPageOriginalSize({ width: viewport.width, height: viewport.height });
  };

  return (
    <div className="relative">
      <Page pageNumber={pageNumber} width={width} onLoadSuccess={onPageLoadSuccess} />
      {pageOriginalSize && width && highlights.length > 0 && (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
          {highlights.map((h, idx) => {
            // 计算缩放比例：
            // 1. (width / pageOriginalSize.width): 将 PDF 点坐标映射到屏幕渲染像素
            // 2. (72 / ocrDpi): 将 OCR 坐标(基于 ocrDpi) 还原为 PDF 标准点坐标(基于 72 DPI)
            const scale = (width / pageOriginalSize.width) * (72 / ocrDpi);
            const points = h.position.map(p => p * scale).join(',');
            return (
              <polygon 
                key={idx} 
                points={points} 
                fill="rgba(255, 215, 0, 0.3)" 
                stroke="rgba(255, 165, 0, 0.8)" 
                strokeWidth={2} 
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

export default function PdfViewer({ fileUrl, pageNumber, highlights = [], ocrDpi = 72 }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  // 回调函数，用于在容器尺寸变化时更新宽度
  const onResize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  // 监听窗口 resize 事件
  useEffect(() => {
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [onResize]);

  // PDF 加载成功后的回调
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    pageRefs.current = Array(numPages).fill(null);
  }

  // 当 pageNumber prop 变化时，平滑滚动到对应页面
  useEffect(() => {
    if (pageNumber > 0 && pageRefs.current[pageNumber - 1]) {
      pageRefs.current[pageNumber - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pageNumber]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(e) => console.error("PDF load error:", e)}
        onSourceError={(e) => console.error("PDF source error:", e)}
        options={options}
        loading={
          <div className="flex items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={16} />
            <span>Loading Document...</span>
          </div>
        }
        error={<div className="flex items-center justify-center h-full text-rose-400">Failed to load PDF file.</div>}
      >
        {Array.from(new Array(numPages || 0), (el, index) => {
          const currentPage = index + 1;
          // 筛选出当前页的高亮区域
          const pageHighlights = highlights.filter(h => h.page_id === currentPage);
          
          return (
            <div key={`page_${currentPage}`} ref={ref => pageRefs.current[index] = ref} className="mb-4 flex justify-center bg-white shadow-lg">
              <PageWithHighlights 
                pageNumber={currentPage} 
                width={containerWidth ? containerWidth - 20 : undefined} 
                highlights={pageHighlights}
                ocrDpi={ocrDpi}
              />
            </div>
          );
        })}
      </Document>
    </div>
  );
}