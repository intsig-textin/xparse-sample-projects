import type {
  OcrResult,
  ClassificationResult,
  ExtractionResult,
  LineItem,
  LlmApiResponse,
} from '../types/invoice';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
  HEADER_EXTRACTION_PROMPT,
  LINE_ITEMS_EXTRACTION_PROMPT,
} from '../prompts/invoicePrompts';

const LLM_API_URL = '/api/extract';

const PAGE_BATCH_TRIGGER = 3;
const PAGES_PER_BATCH = 3;
const CHARS_PER_BATCH = 8000;
const MIN_BATCH_ROWS = 5;
const MAX_BATCH_ROWS = 50;

// ─── Value unwrap ─────────────────────────────────────────────────────────────

function unwrapLlmValue(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(unwrapLlmValue);

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length === 1 && keys[0] === 'value') {
    return record.value ?? null;
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    result[k] = unwrapLlmValue(v);
  }
  return result;
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseLlmJson<T>(raw: string | T | undefined | null): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw === 'string') {
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
  return null;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function callLlmApi(payload: Record<string, unknown>): Promise<LlmApiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 280000);

  let response: Response;
  try {
    response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`LLM API 请求失败 (${response.status}): ${text || response.statusText}`);
  }

  return response.json() as Promise<LlmApiResponse>;
}

// ─── Table batch preparation ──────────────────────────────────────────────────

export interface LineItemBatch {
  markdown: string;
  pages: OcrResult['pages'];
}

export interface LineItemBatchPlan {
  useBatching: boolean;
  batches: LineItemBatch[];
}

function modalCount(counts: number[]): number {
  const freq = new Map<number, number>();
  for (const n of counts) freq.set(n, (freq.get(n) ?? 0) + 1);
  let best = counts[0];
  let bestFreq = 0;
  for (const [n, f] of freq) {
    if (f > bestFreq) { best = n; bestFreq = f; }
  }
  return best;
}

function tryTableBatching(markdown: string, allPages: OcrResult['pages']): LineItemBatchPlan | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(markdown, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));
  if (tables.length === 0) return null;

  const tableData = tables.map((table) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    let header = '';
    const dataRows: string[] = [];
    const colCounts: number[] = [];
    for (const row of rows) {
      const tdCount = row.querySelectorAll('td').length;
      if (tdCount > 0) {
        dataRows.push(row.outerHTML);
        colCounts.push(tdCount);
      } else if (row.querySelectorAll('th').length > 0 && !header) {
        header = row.outerHTML;
      }
    }
    const modalCols = colCounts.length > 0 ? modalCount(colCounts) : 0;
    return { header, dataRows, modalCols };
  });

  const mainIdx = tableData.reduce(
    (best, t, i) => (t.dataRows.length > tableData[best].dataRows.length ? i : best),
    0
  );
  const mainCols = tableData[mainIdx].modalCols;
  const headerHtml = tableData[mainIdx].header;

  if (mainCols === 0) return null;

  const allDataRows: string[] = [];
  for (const { dataRows, modalCols } of tableData) {
    if (modalCols === mainCols) {
      allDataRows.push(...dataRows);
    }
  }
  if (allDataRows.length === 0) return null;

  const totalChars = allDataRows.reduce((sum, r) => sum + r.length, 0);
  const avgRowLength = totalChars / allDataRows.length;
  const batchSize = Math.min(
    MAX_BATCH_ROWS,
    Math.max(MIN_BATCH_ROWS, Math.floor(CHARS_PER_BATCH / avgRowLength))
  );

  const batches: LineItemBatch[] = [];
  for (let i = 0; i < allDataRows.length; i += batchSize) {
    const rowSlice = allDataRows.slice(i, i + batchSize);
    const tableHtml = [
      '<table>',
      headerHtml ? `<thead>${headerHtml}</thead>` : '',
      '<tbody>',
      ...rowSlice,
      '</tbody></table>',
    ].join('');
    batches.push({ markdown: tableHtml, pages: allPages });
  }
  return { useBatching: true, batches };
}

function pagesMarkdown(pages: OcrResult['pages']): string {
  return pages
    .map((p) => p.content.map((c) => c.text).join('\n'))
    .join('\n\n');
}

export function prepareLineItemBatches(ocr: OcrResult): LineItemBatchPlan {
  if (ocr.pages.length <= PAGE_BATCH_TRIGGER) {
    return { useBatching: false, batches: [] };
  }

  const tablePlan = tryTableBatching(ocr.markdown, ocr.pages);
  if (tablePlan) return tablePlan;

  const batches: LineItemBatch[] = [];
  for (let i = 0; i < ocr.pages.length; i += PAGES_PER_BATCH) {
    const pageSlice = ocr.pages.slice(i, i + PAGES_PER_BATCH);
    batches.push({ markdown: pagesMarkdown(pageSlice), pages: pageSlice });
  }
  return { useBatching: true, batches };
}

// ─── Phase 1: Classification ──────────────────────────────────────────────────

export async function classifyDocument(ocr: OcrResult): Promise<ClassificationResult> {
  const prompt = `${CLASSIFICATION_SYSTEM_PROMPT}\n\n${CLASSIFICATION_USER_PROMPT}`;

  const response = await callLlmApi({
    prompt,
    markdown: ocr.markdown,
  });

  const parsed = parseLlmJson<ClassificationResult>(
    response.result?.llm_json as string | ClassificationResult
  );
  if (!parsed) throw new Error('分类 API 返回数据无法解析为 JSON');

  if (typeof parsed.is_invoice === 'string') {
    parsed.is_invoice = (parsed.is_invoice as unknown as string).toLowerCase() === 'true';
  }
  parsed.estimated_line_count = Number(parsed.estimated_line_count) || 0;

  return parsed;
}

// ─── Phase 2: Header fields ───────────────────────────────────────────────────

export interface HeaderExtractionResult {
  parsed: Partial<ExtractionResult>;
  rawJson: Record<string, unknown>;
  llmPages: unknown[];
}

export async function extractHeaderFields(ocr: OcrResult): Promise<HeaderExtractionResult> {
  const response = await callLlmApi({
    prompt: HEADER_EXTRACTION_PROMPT,
    markdown: ocr.markdown,
  });

  const rawLlmJson = parseLlmJson<Partial<ExtractionResult>>(
    response.result?.llm_json as string | Partial<ExtractionResult>
  ) ?? {};
  const parsed = unwrapLlmValue(rawLlmJson) as Partial<ExtractionResult>;
  const rawJson = (response.result?.raw_json ?? {}) as Record<string, unknown>;
  const llmPages: unknown[] = Array.isArray(response.result?.pages)
    ? (response.result!.pages as unknown[])
    : [];

  return { parsed, rawJson, llmPages };
}

// ─── Phase 3: Line items ──────────────────────────────────────────────────────

export interface LineItemsResult {
  lineItems: LineItem[];
  rawJson: Record<string, unknown>;
  llmPages: unknown[];
}

export async function extractLineItemsSingle(ocr: OcrResult): Promise<LineItemsResult> {
  return _extractLineItems(ocr.markdown);
}

export async function extractLineItemsBatch(batch: LineItemBatch): Promise<LineItemsResult> {
  return _extractLineItems(batch.markdown);
}

async function _extractLineItems(
  markdownContent: string
): Promise<LineItemsResult> {
  const response = await callLlmApi({
    prompt: LINE_ITEMS_EXTRACTION_PROMPT,
    markdown: markdownContent,
  });

  const rawLlmJson = parseLlmJson<{ line_items?: LineItem[] }>(
    response.result?.llm_json as string | { line_items?: LineItem[] }
  ) ?? {};
  const parsed = unwrapLlmValue(rawLlmJson) as { line_items?: LineItem[] };
  const rawJson = (response.result?.raw_json ?? {}) as Record<string, unknown>;
  const llmPages: unknown[] = Array.isArray(response.result?.pages)
    ? (response.result!.pages as unknown[])
    : [];

  return {
    lineItems: Array.isArray(parsed.line_items) ? parsed.line_items : [],
    rawJson,
    llmPages,
  };
}

// ─── Result assembly ──────────────────────────────────────────────────────────

export interface ExtractionApiResult {
  extraction: ExtractionResult;
  rawJson: Record<string, unknown>;
  llmPages: unknown[];
}

export function assembleExtraction(
  header: HeaderExtractionResult,
  lineItems: LineItem[],
  lineRawJson: Record<string, unknown>,
): ExtractionApiResult {
  const h = header.parsed;

  const extraction: ExtractionResult = {
    header: h.header ?? {},
    parties: h.parties ?? {},
    shipping: h.shipping ?? {},
    payment: h.payment ?? {},
    tax_summary: h.tax_summary ?? { taxes: [] },
    totals: h.totals ?? {},
    line_items: lineItems,
    extra_fields: h.extra_fields ?? {},
    evidence: h.evidence ?? {},
  };

  const rawJson: Record<string, unknown> = {
    ...header.rawJson,
    line_items: (lineRawJson as Record<string, unknown>).line_items,
  };

  return { extraction, rawJson, llmPages: header.llmPages };
}
