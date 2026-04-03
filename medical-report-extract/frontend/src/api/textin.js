const PARSE_API_URL = '/api/parse';

/**
 * Parse a document file via the backend (which calls TextIn official API).
 * @param {File} file
 * @returns {Promise<{ markdown: string, pages: Array, detail: object }>}
 */
export async function parseDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(PARSE_API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`文档解析失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    markdown: data.markdown || '',
    pages: data.pages || [],
    detail: data,
  };
}

export async function downloadPageImage(imageId) {
  if (!imageId) throw new Error('image_id 为空');
  const response = await fetch(`/api/image?image_id=${encodeURIComponent(imageId)}`);
  if (!response.ok) throw new Error(`图像下载失败: HTTP ${response.status}`);
  const json = await response.json();
  const b64 = json?.data?.image;
  if (!b64) throw new Error('图像数据为空');
  return `data:image/jpeg;base64,${b64}`;
}
