import React, { useRef, useState, useCallback } from 'react'
import { ACCEPTED_TYPES, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, MAX_PDF_PAGES } from '../constants'

async function getPdfPageCount(file) {
  try {
    const buffer = await file.arrayBuffer()
    const text = new TextDecoder('latin1').decode(buffer)
    const matches = [...text.matchAll(/\/Count\s+(\d+)/g)]
    if (!matches.length) return null
    return Math.max(...matches.map((m) => parseInt(m[1], 10)))
  } catch {
    return null
  }
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file) {
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const isDoc =
    file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')
  if (isPdf) {
    return (
      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }
  if (isDoc) {
    return (
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

export default function UploadZone({ onFileSelect, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)

  const validateAndSelect = useCallback(
    async (file) => {
      setError(null)
      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !file.name.match(/\.(pdf|jpe?g|png|bmp|tiff?|webp|docx?|doc)$/i)
      ) {
        setError('不支持的文件格式，请上传 PDF、图片或 Word 文件')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件大小超过限制（最大 50MB），当前 ${formatSize(file.size)}`)
        return
      }
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const pages = await getPdfPageCount(file)
        if (pages !== null && pages > MAX_PDF_PAGES) {
          setError(`文件共 ${pages} 页，超过 ${MAX_PDF_PAGES} 页上限，请上传页数更少的试卷`)
          return
        }
      }
      setSelectedFile(file)
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    [disabled, validateAndSelect],
  )

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
    e.target.value = ''
  }

  return (
    <div>
      <div
        className={[
          'relative border-2 border-dashed rounded-2xl min-h-[220px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-6',
          dragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            {getFileIcon(selectedFile)}
            <div className="text-center">
              <div className="font-medium text-slate-700 text-sm truncate max-w-[260px]">
                {selectedFile.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {formatSize(selectedFile.size)} · {selectedFile.type || '文档'}
              </div>
              {(selectedFile.type.includes('word') || /\.docx?$/i.test(selectedFile.name)) && (
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Word 文件仅识别前 {MAX_PDF_PAGES} 页，超出部分将被截断
                </div>
              )}
            </div>
            <button
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
                setError(null)
              }}
              disabled={disabled}
            >
              移除文件
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">拖拽文件至此，或点击选择</div>
              <div className="text-xs text-slate-400 mt-1">
                支持 PDF · 图片（JPG/PNG）· Word · 最大 50MB · PDF/Word 最多 {MAX_PDF_PAGES} 页
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              {['PDF', 'JPG/PNG', 'DOCX'].map((fmt) => (
                <span
                  key={fmt}
                  className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-medium"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
