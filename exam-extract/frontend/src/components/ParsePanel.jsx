import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function ParsePanel({ markdown }) {
  if (!markdown) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        暂无解析结果
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="markdown-content">
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            table: (props) => (
              <div className="overflow-x-auto my-3">
                <table {...props} />
              </div>
            ),
            a: ({ children }) => <span>{children}</span>,
          }}
        >
          {markdown}
        </Markdown>
      </div>
    </div>
  )
}
