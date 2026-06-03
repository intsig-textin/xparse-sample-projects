export const DEMO_NAME = '试卷题目智能抽取'
export const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.webp,.docx,.doc'
export const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_PDF_PAGES = 10

export const FEATURE_TAGS = [
  { label: '中小学试卷', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: '高考 / 中考', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { label: 'PDF / 图片', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  { label: '图文题目', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Markdown / JSON / CSV', color: 'bg-slate-50 text-slate-600 border-slate-200' },
]
