import type { OcrResult, OcrPage } from '../types/invoice';

const PARSE_API_URL = '/api/parse';

export async function callTextInOcr(file: File): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(PARSE_API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`文档解析失败 (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();

  const markdown: string = data.markdown ?? '';
  const rawPages: OcrPage[] = Array.isArray(data.pages) ? data.pages : [];

  const pages: OcrPage[] = rawPages.map((page, idx) => ({
    image_id: page.image_id ?? '',
    page_id: page.page_id ?? idx,
    content: Array.isArray(page.content) ? page.content : [],
    width: page.width,
    height: page.height,
  }));

  return { markdown, pages };
}

export async function downloadPageImage(imageId: string): Promise<string> {
  if (!imageId) throw new Error('image_id 为空，无法下载页面图片');
  const response = await fetch(`/api/image?image_id=${encodeURIComponent(imageId)}`);
  if (!response.ok) throw new Error(`图片下载失败 (${response.status}): image_id=${imageId}`);
  const json = await response.json();
  const b64: string = json?.data?.image ?? '';
  if (!b64) throw new Error('图片下载响应中无 data.image 字段');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
}
