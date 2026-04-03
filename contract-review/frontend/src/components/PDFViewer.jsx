import { useEffect, useRef, useState, useCallback } from 'react'
import { downloadPageImage } from '../api/textin'

function drawHighlight(canvas, pageWidth, posArr) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!posArr || posArr.length < 8) return

  const rate = canvas.width / pageWidth
  const pts = []
  for (let i = 0; i < 8; i += 2) {
    pts.push([posArr[i] * rate, posArr[i + 1] * rate])
  }

  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
  ctx.fillStyle   = 'rgba(255, 200, 0, 0.35)'
  ctx.strokeStyle = 'rgba(212, 168, 67, 0.85)'
  ctx.lineWidth   = 2
  ctx.fill()
  ctx.stroke()
}

export default function DocViewer({ pages, target }) {
  const imgRef      = useRef(null)
  const hlCanvasRef = useRef(null)
  const scrollRef   = useRef(null)
  const objUrlRef   = useRef(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [scale,       setScale]       = useState(1.3)
  const [imgSrc,      setImgSrc]      = useState(null)
  const [loading,     setLoading]     = useState(false)

  const totalPages = pages?.length || 0
  const pageData   = pages?.[currentPage - 1]

  // Fetch image for current page
  useEffect(() => {
    if (!pageData?.image_id) { setImgSrc(null); return }
    let cancelled = false
    setLoading(true)
    setImgSrc(null)
    downloadPageImage(pageData.image_id)
      .then(src => {
        if (cancelled) { URL.revokeObjectURL(src); return }
        if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
        objUrlRef.current = src
        setImgSrc(src)
      })
      .catch(err => console.error('图像加载失败:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pageData?.image_id])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => { if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current) }
  }, [])

  const applyHighlight = useCallback(() => {
    const img    = imgRef.current
    const canvas = hlCanvasRef.current
    if (!canvas || !img || !img.complete || !img.clientWidth) return
    canvas.width  = img.clientWidth
    canvas.height = img.clientHeight
    if (target && target.page === currentPage && target.position && pageData?.width) {
      drawHighlight(canvas, pageData.width, target.position)
    } else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [target, currentPage, pageData?.width])

  useEffect(() => { applyHighlight() }, [applyHighlight, imgSrc, scale])

  // Jump to target page
  useEffect(() => {
    if (!target) return
    if (target.page !== currentPage) setCurrentPage(target.page)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [target])

  // Display width: pageData.width is OCR pixels at 144 DPI → halve to get ~72 DPI pts, then apply scale
  const displayWidth = pageData?.width ? pageData.width * 0.5 * scale : undefined

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="flex-none flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
            aria-label="上一页"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm text-slate-600 min-w-[72px] text-center tabular-nums">
            {currentPage} / {totalPages || '—'}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
            aria-label="下一页"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
            className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="缩小"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <span className="text-xs text-slate-500 min-w-[44px] text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
            className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="放大"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {loading && (
            <span className="ml-1">
              <svg className="w-3.5 h-3.5 text-slate-400 spinner" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Image area */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-100">
        {!imgSrc && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm">暂无页面图像</p>
          </div>
        )}
        {imgSrc && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              ref={imgRef}
              src={imgSrc}
              style={{ width: displayWidth, display: 'block', boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
              onLoad={applyHighlight}
              alt={`第 ${currentPage} 页`}
            />
            <canvas
              ref={hlCanvasRef}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
