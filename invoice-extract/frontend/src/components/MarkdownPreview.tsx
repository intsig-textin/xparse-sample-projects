import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownPreviewProps {
  markdown: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 p-8">
        <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">暂无 Markdown 内容</p>
      </div>
    );
  }

  return (
    <div className="p-5 prose prose-sm prose-slate max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-slate-700 mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-700 mt-4 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">{children}</p>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2 text-slate-600">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-slate-50/50">{children}</tr>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-sm text-slate-600 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-slate-600 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-slate-600">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-600 rounded text-xs font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono mb-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-300 pl-4 italic text-slate-500 mb-3">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-slate-200 my-4" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
