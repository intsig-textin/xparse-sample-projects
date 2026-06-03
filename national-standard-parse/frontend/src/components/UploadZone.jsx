import React, { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, MAX_PDF_PAGES } from '../constants'

const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadZone({ onFileSelect, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)

  const validateSync = (file) => {
    if (!ACCEPTED_MIME.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      return '仅支持 PDF、Word（.docx/.doc）格式'
    }
    if (file.size > MAX_FILE_SIZE) return '文件大小不能超过 50MB'
    return null
  }

  const handleFile = useCallback(
    async (file) => {
      setError(null)
      const err = validateSync(file)
      if (err) {
        setError(err)
        return
      }
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const pages = await getPdfPageCount(file)
        if (pages !== null && pages > MAX_PDF_PAGES) {
          setError(`文件共 ${pages} 页,超过 ${MAX_PDF_PAGES} 页上限,请上传页数更少的文档`)
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
      if (file) handleFile(file)
    },
    [disabled, handleFile],
  )

  const handleRemove = () => {
    setSelectedFile(null)
    setError(null)
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-2xl min-h-[220px] flex flex-col items-center justify-center p-6 transition-all duration-200 cursor-pointer select-none ${
          dragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !selectedFile && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FileText size={28} className="text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatSize(selectedFile.size)}
                {' · '}
                {selectedFile.type || '文档'}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <X size={12} />
              移除文件
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Upload size={28} className="text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                拖拽文件至此,或
                <span className="text-blue-600 ml-1">点击选择</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">支持 PDF · Word · 最大 50MB</p>
            </div>
            <div className="flex items-center gap-2">
              {['PDF', 'DOCX', 'DOC'].map((ext) => (
                <span
                  key={ext}
                  className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50"
                >
                  {ext}
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
