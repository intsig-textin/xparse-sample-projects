import React, { useCallback, useRef, useState } from 'react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'];
const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function getFileIcon(file: File): string {
  if (file.type === 'application/pdf') return '📄';
  if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📝';
  if (file.type.startsWith('image/')) return '🖼️';
  return '📁';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
    if (!isValidType) {
      return `不支持的文件类型。请上传 PDF、Word 文档或图片（.pdf, .doc, .docx, .jpg, .png, .bmp, .tiff, .webp）`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `文件大小超出限制。最大支持 ${MAX_SIZE_MB}MB，当前文件 ${formatFileSize(file.size)}`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Card */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[320px] rounded-2xl border-2 border-dashed
          transition-all duration-200 cursor-pointer select-none
          ${isDragging
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01] shadow-lg shadow-indigo-100'
            : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {!selectedFile ? (
          <>
            {/* Upload Icon */}
            <div
              className={`
                w-20 h-20 rounded-full flex items-center justify-center mb-6
                transition-all duration-200
                ${isDragging ? 'bg-indigo-100' : 'bg-slate-100'}
              `}
            >
              <svg
                className={`w-10 h-10 transition-colors duration-200 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`}
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

            <p className={`text-lg font-semibold mb-2 ${isDragging ? 'text-indigo-600' : 'text-slate-700'}`}>
              {isDragging ? '松开鼠标以上传文件' : '拖放文件至此处'}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              或
              <span className="mx-1 text-indigo-500 font-medium underline underline-offset-2">
                点击选择文件
              </span>
            </p>

            {/* Accepted file types */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'BMP', 'TIFF', 'WEBP'].map((type) => (
                <span
                  key={type}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500"
                >
                  {type}
                </span>
              ))}
              <span className="text-xs text-slate-400">· 最大 {MAX_SIZE_MB}MB</span>
            </div>
          </>
        ) : (
          /* File selected state */
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 text-3xl">
              {getFileIcon(selectedFile)}
            </div>
            <p className="text-base font-semibold text-slate-700 mb-1 max-w-xs truncate">
              {selectedFile.name}
            </p>
            <p className="text-sm text-slate-400 mb-4">{formatFileSize(selectedFile.size)}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-600 font-medium">文件已选择，正在处理…</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Helper text */}
      <p className="mt-4 text-center text-xs text-slate-400">
        支持海外发票、商业发票、形式发票、税务发票等多种格式
      </p>
    </div>
  );
};
