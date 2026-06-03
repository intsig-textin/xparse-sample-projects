const PARSE_API_URL = '/api/parse'

const IMG_MAX_RETRIES = 5
const IMG_RETRY_DELAY_MS = 2000

/**
 * 调后端 /api/parse：返回 markdown / pages / detail / catalog / chunks /
 * chunks_with_paratext / media / rebuilt_markdown / lineToDetail。
 * @param {File} file
 */
export async function parseDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(PARSE_API_URL, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`文档解析失败 (${response.status}): ${errText}`)
  }

  const data = await response.json()

  // lineToDetail 在 JSON 序列化里是字符串 key,转回 Map<number, number>
  const lineToDetail = new Map()
  const rawMap = data.lineToDetail || {}
  for (const k of Object.keys(rawMap)) {
    lineToDetail.set(parseInt(k, 10), rawMap[k])
  }

  return {
    markdown: data.markdown || '',
    pages: data.pages || [],
    detail: data.detail || [],
    catalog: data.catalog || [],
    chunks: data.chunks || [],
    chunksWithParatext: data.chunks_with_paratext || [],
    media: data.media || [],
    rebuiltMarkdown: data.rebuilt_markdown || '',
    lineToDetail,
  }
}

async function downloadPageImage(imageId, onRetry) {
  if (!imageId) throw new Error('image_id 为空')

  for (let attempt = 0; attempt < IMG_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onRetry?.()
      await new Promise((r) => setTimeout(r, IMG_RETRY_DELAY_MS))
    }
    try {
      const response = await fetch(`/api/image?image_id=${encodeURIComponent(imageId)}`)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`图片下载失败 HTTP ${response.status}`)
      }
      if (!response.ok) {
        if (attempt < IMG_MAX_RETRIES - 1) continue
        throw new Error(`图片下载失败 HTTP ${response.status}`)
      }
      const json = await response.json()
      const b64 = json?.data?.image ?? ''
      if (!b64) {
        if (attempt < IMG_MAX_RETRIES - 1) continue
        throw new Error('响应中无图片数据')
      }
      // base64 → Blob → ObjectURL,后续旋转 canvas 时也能用
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      return URL.createObjectURL(blob)
    } catch (err) {
      if (attempt < IMG_MAX_RETRIES - 1) continue
      throw err
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
      canvas.toBlob(
        (blob) => resolve(blob ? URL.createObjectURL(blob) : src),
        'image/jpeg',
        0.92,
      )
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 并发 4 路下载所有页面图,逐页回调 onImageReady。
 * @param {Array} pages
 * @param {(img: { blobUrl: string, pageIndex: number, width: number, height: number, angle: number }) => void} onImageReady
 * @param {(hint: string | null) => void} [onRetryHint]
 */
export async function downloadAllPageImages(pages, onImageReady, onRetryHint) {
  const CONCURRENCY = 4
  let nextToStart = 0

  async function downloadOne(i) {
    const page = pages[i]
    const rawUrl = await downloadPageImage(page.image_id, () => {
      onRetryHint?.('图像准备中,请稍候...')
    }).catch(() => '')
    onRetryHint?.(null)

    const blobUrl = page.angle && rawUrl ? await rotateImage(rawUrl, page.angle) : rawUrl
    onImageReady({
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
