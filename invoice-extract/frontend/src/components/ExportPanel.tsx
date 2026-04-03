import React from 'react';
import type { AppResult } from '../types/invoice';

interface ExportPanelProps {
  result: AppResult;
}

function buildExportFilename(result: AppResult): string {
  const invoiceNumber = result.extraction.header?.invoice_number ?? 'unknown';
  const invoiceDate = result.extraction.header?.invoice_date ?? new Date().toISOString().split('T')[0];
  // Sanitize filename
  const safeNumber = String(invoiceNumber).replace(/[^a-zA-Z0-9\-_]/g, '_');
  const safeDate = String(invoiceDate).replace(/[^0-9\-]/g, '');
  return `invoice_${safeNumber}_${safeDate}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ result }) => {
  const handleExportJson = () => {
    const exportData = {
      classification: result.classification,
      extraction: result.extraction,
      warnings: result.warnings,
      metadata: {
        exported_at: new Date().toISOString(),
        page_count: result.pageImages.length,
      },
    };
    const content = JSON.stringify(exportData, null, 2);
    const filename = buildExportFilename(result) + '.json';
    downloadFile(content, filename, 'application/json');
  };

  const handleExportMarkdown = () => {
    const filename = buildExportFilename(result) + '.md';
    downloadFile(result.markdown, filename, 'text/markdown');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-100">
      <span className="text-xs text-slate-400 mr-1">导出：</span>
      <button
        onClick={handleExportJson}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        导出 JSON
      </button>
      <button
        onClick={handleExportMarkdown}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        导出 Markdown
      </button>
    </div>
  );
};
