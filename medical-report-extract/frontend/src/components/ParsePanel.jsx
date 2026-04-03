import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function ParsePanel({ parseResult }) {
  if (!parseResult?.markdown) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        暂无解析结果
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Enhance table rendering
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-3">
                <table {...props} />
              </div>
            ),
            // Code blocks
            code: ({ node, inline, className, children, ...props }) => {
              if (inline) {
                return <code className={className} {...props}>{children}</code>
              }
              return (
                <div className="overflow-x-auto">
                  <code className={className} {...props}>{children}</code>
                </div>
              )
            },
          }}
        >
          {parseResult.markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
