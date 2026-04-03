import React, { useRef, useState, useCallback } from 'react'
import { Upload, FileText, Image, File, X, AlertCircle } from 'lucide-react'
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from '../constants.js'

const FILE_TYPE_ICONS = {
  pdf: FileText,
  image: Image,
  doc: File,
}

function getFileIcon(file) {
  if (!file) return File
  const type = file.type.toLowerCase()
  if (type === 'application/pdf') return FileText
  if (type.startsWith('image/')) return Image
  return File
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file) {
  if (!file) return '请选择文件'

  const acceptedMimes = Object.keys(ACCEPTED_TYPES)
  const isValidType = acceptedMimes.includes(file.type) ||
    // Fallback for .doc files that may report differently
    file.name.match(/\.(doc|docx|pdf|jpg|jpeg|png|bmp|tiff?|webp)$/i)

  if (!isValidType) {
    return `不支持的文件类型。支持：图片 (JPG/PNG/BMP/TIFF/WebP)、PDF、Word (.docx/.doc)`
  }

  if (file.size > MAX_FILE_SIZE) {
    return `文件过大 (${formatBytes(file.size)})，最大支持 50MB`
  }

  return null
}

export default function UploadZone({ onFileSelect, disabled }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = useCallback((file) => {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setSelectedFile(null)
      return
    }
    setError(null)
    setSelectedFile(file)
    onFileSelect(file)
  }, [onFileSelect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile, disabled])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const clearFile = useCallback((e) => {
    e.stopPropagation()
    setSelectedFile(null)
    setError(null)
    onFileSelect(null)
  }, [onFileSelect])

  const FileIcon = selectedFile ? getFileIcon(selectedFile) : Upload

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : selectedFile
              ? 'border-blue-400 bg-blue-50/50'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        style={{ minHeight: '220px' }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.webp,.pdf,.docx,.doc"
          onChange={handleInputChange}
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center h-full p-10 text-center select-none">
          {selectedFile ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <FileIcon size={32} className="text-blue-600" />
              </div>
              <div className="font-semibold text-slate-800 text-base mb-1 max-w-xs truncate">
                {selectedFile.name}
              </div>
              <div className="text-slate-500 text-sm mb-4">
                {formatBytes(selectedFile.size)} · {selectedFile.type || '未知类型'}
              </div>
              <button
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                onClick={clearFile}
              >
                <X size={13} />
                移除文件
              </button>
            </>
          ) : (
            <>
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors
                ${dragOver ? 'bg-blue-200' : 'bg-slate-100'}
              `}>
                <Upload size={30} className={dragOver ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <div className="font-semibold text-slate-700 text-base mb-2">
                {dragOver ? '释放鼠标上传文件' : '拖拽文件至此，或点击选择'}
              </div>
              <div className="text-slate-400 text-sm mb-4">
                支持 JPG / PNG / BMP / TIFF / WebP / PDF / DOCX · 最大 50MB
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'PDF', color: 'bg-red-50 text-red-500' },
                  { label: '图片', color: 'bg-green-50 text-green-500' },
                  { label: 'Word', color: 'bg-blue-50 text-blue-500' },
                ].map(({ label, color }) => (
                  <span key={label} className={`text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
