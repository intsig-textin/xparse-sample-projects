// 与后端 FastAPI 通信：上传文件解析 + 多页图片下载

const IMG_MAX_RETRIES = 5
const IMG_RETRY_DELAY_MS = 2000

// ─── /api/parse: OCR ─────────────────────────────────────────────────────────

export async function parseDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  const resp = await fetch('/api/parse', { method: 'POST', body: formData })
  if (!resp.ok) {
    let msg = `OCR 解析失败 (HTTP ${resp.status})`
    try {
      const data = await resp.json()
      if (data?.detail) msg = data.detail
    } catch {
      /* fallthrough */
    }
    const err = new Error(msg)
    err.status = resp.status
    throw err
  }

  const data = await resp.json()
  return {
    markdown: data.markdown ?? '',
    pages: data.pages ?? [],
    detail: data.detail ?? [],
  }
}

// ─── /api/image: 单页图片代理 ────────────────────────────────────────────────

async function fetchPageImageOnce(imageId) {
  const url = `/api/image?image_id=${encodeURIComponent(imageId)}`
  const resp = await fetch(url)
  if (resp.status >= 400 && resp.status < 500) {
    throw new Error(`图片下载失败 HTTP ${resp.status}`)
  }
  if (!resp.ok) {
    const e = new Error(`图片下载失败 HTTP ${resp.status}`)
    e.retryable = true
    throw e
  }
  const json = await resp.json()
  const b64 = json?.data?.image ?? ''
  if (!b64) {
    const e = new Error('响应中无图片数据')
    e.retryable = true
    throw e
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })
  return URL.createObjectURL(blob)
}

export async function downloadPageImage(imageId, onRetry) {
  for (let attempt = 0; attempt < IMG_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onRetry?.(attempt, IMG_MAX_RETRIES)
      await new Promise((r) => setTimeout(r, IMG_RETRY_DELAY_MS))
    }
    try {
      return await fetchPageImageOnce(imageId)
    } catch (err) {
      if (!err.retryable || attempt >= IMG_MAX_RETRIES - 1) {
        if (attempt < IMG_MAX_RETRIES - 1) continue
        throw err
      }
    }
  }
  throw new Error(`图片加载失败: image_id=${imageId}`)
}

function rotateImage(src, angle) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const swap = angle === 90 || angle === 270
      const canvas = document.createElement('canvas')
      canvas.width = swap ? img.naturalHeight : img.naturalWidth
      canvas.height = swap ? img.naturalWidth : img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((-angle * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : src), 'image/jpeg', 0.92)
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

export async function downloadAllPageImages(pages, onImageReady, onRetryHint) {
  if (!pages?.length) return
  const CONCURRENCY = 4
  let nextToStart = 0

  async function downloadOne(i) {
    const page = pages[i]
    const rawUrl = await downloadPageImage(page.image_id, () => {
      onRetryHint?.('图像准备中，请稍候...')
    }).catch(() => '')
    onRetryHint?.(null)

    const blobUrl = page.angle && rawUrl ? await rotateImage(rawUrl, page.angle) : rawUrl

    onImageReady({
      imageId: page.image_id,
      blobUrl,
      pageIndex: i,
      width: page.width,
      height: page.height,
      angle: page.angle,
    })
    if (nextToStart < pages.length) await downloadOne(nextToStart++)
  }

  const initial = Math.min(CONCURRENCY, pages.length)
  await Promise.all(Array.from({ length: initial }, () => downloadOne(nextToStart++)))
}
