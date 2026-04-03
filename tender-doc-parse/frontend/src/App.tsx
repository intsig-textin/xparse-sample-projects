import { useRef, useState, useEffect } from 'react';
import PdfViewer from './PdfViewer';
import {
  Upload, FileText, CheckCircle, Loader2,
  FileSearch, Download, AlertCircle, ChevronRight,
  LayoutDashboard, Terminal, Info, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ModuleKey } from './constants/tenderModules';
import { MODULE_SECTIONS, TENDER_MODULES } from './constants/tenderModules';

/** * ============================================================
 * 1. 核心业务逻辑 (原 utils/parser.ts)
 * ============================================================
 */

interface Chunk {
  chunk_id: number;
  title_path: string;
  content: string;
  md_len: number;
}

type LoadingStatus = 'waiting' | 'loading' | 'done' | 'error';

interface LegacyLlmItem {
  field: string;
  value: string | null;
}

interface LegacyLlmSection {
  section_name?: string;
  title?: string;
  name?: string;
  items: LegacyLlmItem[];
}

type LlmValue = string | number | boolean | null | Record<string, unknown> | unknown[];

interface LlmField {
  key?: string;
  label?: string;
  value?: LlmValue;
  confidence?: number;
  notes?: string;
  source?: {
    pages?: number[];
    bounding_regions?: unknown[];
  };
}

type LlmBlock =
  | { type: 'table'; title?: string; columns?: string[]; rows?: LlmField[] }
  | { type: 'kv'; title?: string; items?: LlmField[] }
  | { type: 'list'; title?: string; items?: LlmField[] }
  | { type: 'text'; title?: string; value?: string; source?: LlmField['source'] }
  | { type: 'md_table'; title?: string; value?: string; source?: LlmField['source'] };

interface LlmSection {
  title?: string;
  section_name?: string;
  name?: string;
  blocks?: LlmBlock[];
}

type LlmSectionsMap = Record<string, LlmSection>;

interface LlmApiResponse {
  code: number;
  message?: string;
  result?: {
    llm_json?: {
      module_key?: ModuleKey;
      sections?: LlmSectionsMap | LegacyLlmSection[] | Record<string, any>;
      llm_json?: {
        sections?: LlmSectionsMap | LegacyLlmSection[];
      };
    };
    raw_json?: {
      sections?: Record<string, any>;
    };
  };
}

const MODULE_NAME_MAP: Record<ModuleKey, string> = TENDER_MODULES.reduce((acc, mod) => {
  acc[mod.key] = mod.name;
  return acc;
}, {} as Record<ModuleKey, string>);


const MODULE_KEYWORDS: Record<ModuleKey, string[]> = {
  basic: ['招标公告', '招标邀请', '项目概况', '资金来源', '联系方式', '媒介', '采购概述'],
  qualification: ['资格', '资质', '财务', '业绩', '信誉', '联合体', '基本条件'],
  evaluation: ['评标', '评审', '评分', '分值', '废标', '通过性', '详细评审', '初步评审'],
  submission: ['投标文件', '递交', '开标', '保证金', '电子投标', '密封', '有效期'],
  invalid_risk: ['无效标', '否决', '废标条款', '投诉', '纪律', '违规'],
  annex: ['附件', '格式', '表单', '样表', '清单', '需提交材料']
};



/** Markdown 按标题切分 */
function parseMarkdownToChunks(md: string): Chunk[] {
  const lines = md.split('\n');
  const chunks: Chunk[] = [];
  let currentHeader = '正文';
  let currentContent: string[] = [];
  let chunkCount = 0;

  lines.forEach((line) => {
    const headerMatch = line.match(/^#{1,2}\s+(.*)/);
    if (headerMatch) {
      if (currentContent.length > 0) {
        chunks.push({
          chunk_id: chunkCount++,
          title_path: currentHeader,
          content: currentContent.join('\n'),
          md_len: currentContent.join('\n').length
        });
      }
      currentHeader = headerMatch[1].trim();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  });

  if (currentContent.length > 0) {
    chunks.push({
      chunk_id: chunkCount++,
      title_path: currentHeader,
      content: currentContent.join('\n'),
      md_len: currentContent.join('\n').length
    });
  }
  return chunks;
}

/** 模块自动归类 */
function classifyChunkToModule(chunk: Chunk): ModuleKey {
  const text = (chunk.title_path + chunk.content.substring(0, 200)).toLowerCase();
  for (const [key, keywords] of Object.entries(MODULE_KEYWORDS)) {
    if (key === 'basic') continue;
    if (keywords.some(k => text.includes(k))) return key as ModuleKey;
  }
  return 'basic';
}


const normalizeFieldLabel = (item: LlmField): string => item.label || item.key || '??';

const formatValue = (value: LlmValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const mapLegacySectionsArray = (moduleKey: ModuleKey, sections: LegacyLlmSection[]): LlmSectionsMap => {
  const defs = MODULE_SECTIONS[moduleKey];
  const map: LlmSectionsMap = {};
  sections.forEach((section, idx) => {
    const def = defs[idx];
    if (!def) return;
    const items = Array.isArray(section.items) ? section.items : [];
    const title = section.section_name || section.title || section.name || def.title;
    map[def.key] = {
      title,
      blocks: items.length
        ? [
            {
              type: 'kv',
              title,
              items: items.map(item => ({ key: item.field, label: item.field, value: item.value }))
            }
          ]
        : []
    };
  });
  return map;
};

/** 
 * 辅助函数：从 raw_json 的节点中提取 value 和 source 
 * raw_json 的节点通常结构为: { value: "...", pages: [...], bounding_regions: [...] }
 */
const extractNode = (node: any): { value: any; source?: LlmField['source'] } => {
  if (!node || typeof node !== 'object') return { value: node };
  // 如果包含 value 且包含 pages 或 bounding_regions，则视为 raw 节点
  if ('value' in node && ('pages' in node || 'bounding_regions' in node)) {
    return {
      value: node.value,
      source: {
        pages: node.pages,
        bounding_regions: node.bounding_regions
      }
    };
  }
  return { value: node };
};

/** 
 * 新增：从 raw_json 解析并保留溯源信息 
 */
const normalizeSectionsFromRawWithSource = (rawSections: any): LlmSectionsMap => {
  if (!rawSections || typeof rawSections !== 'object') return {};
  const map: LlmSectionsMap = {};

  Object.entries(rawSections).forEach(([sectionKey, sectionData]: [string, any]) => {
    if (!sectionData || typeof sectionData !== 'object') return;

    const titleNode = extractNode(sectionData.title);
    const title = typeof titleNode.value === 'string' ? titleNode.value : undefined;
    const blocks: LlmBlock[] = [];

    if (Array.isArray(sectionData.blocks)) {
      sectionData.blocks.forEach((rawBlock: any) => {
        const typeNode = extractNode(rawBlock.type);
        const type = String(typeNode.value || 'text');
        const blockTitleNode = extractNode(rawBlock.title);
        const blockTitle = typeof blockTitleNode.value === 'string' ? blockTitleNode.value : undefined;

        if (type === 'list' || type === 'kv') {
          const items: LlmField[] = [];
          if (Array.isArray(rawBlock.items)) {
            rawBlock.items.forEach((rawItem: any) => {
              const keyNode = extractNode(rawItem.key);
              const labelNode = extractNode(rawItem.label);
              const valueNode = extractNode(rawItem.value);
              const notesNode = extractNode(rawItem.notes);
              // 优先使用 value 的 source，其次是 label，最后是 key
              const itemSource = valueNode.source || labelNode.source || keyNode.source;
              
              items.push({
                key: String(keyNode.value || ''),
                label: String(labelNode.value || ''),
                value: valueNode.value,
                notes: String(notesNode.value || ''),
                source: itemSource
              });
            });
          }
          if (type === 'list') {
            blocks.push({ type: 'list', title: blockTitle, items });
          } else {
            blocks.push({ type: 'kv', title: blockTitle, items });
          }
        } else if (type === 'text' || type === 'md_table') {
          const valueNode = extractNode(rawBlock.value);
          blocks.push({
            type: type as 'text' | 'md_table',
            title: blockTitle,
            value: String(valueNode.value || ''),
            source: valueNode.source
          });
        } else if (type === 'table') {
          const columns: string[] = [];
          if (Array.isArray(rawBlock.columns)) {
            rawBlock.columns.forEach((col: any) => {
              const colNode = extractNode(col);
              columns.push(String(colNode.value ?? col ?? ''));
            });
          }
          const rows: LlmField[] = [];
          if (Array.isArray(rawBlock.rows)) {
            rawBlock.rows.forEach((rawRow: any) => {
              const keyNode = extractNode(rawRow.key);
              const labelNode = extractNode(rawRow.label);
              const valueNode = extractNode(rawRow.value);
              const notesNode = extractNode(rawRow.notes);
              const rowSource = valueNode.source || labelNode.source || keyNode.source;
              rows.push({
                key: String(keyNode.value || ''),
                label: String(labelNode.value || ''),
                value: valueNode.value,
                notes: String(notesNode.value || ''),
                source: rowSource
              });
            });
          }
          blocks.push({ type: 'table', title: blockTitle, columns, rows });
        }
      });
    }
    map[sectionKey] = { title, blocks };
  });
  return map;
};

const normalizeSectionsFromRaw = (moduleKey: ModuleKey, rawSections: unknown): LlmSectionsMap => {
  if (!rawSections) return {};
  if (Array.isArray(rawSections)) {
    return mapLegacySectionsArray(moduleKey, rawSections as LegacyLlmSection[]);
  }
  if (typeof rawSections === 'object') {
    const record = rawSections as Record<string, any>;
    const looksLikeSectionMap = Object.values(record).some(value =>
      value && typeof value === 'object' && ('blocks' in value || 'title' in value)
    );
    if (looksLikeSectionMap) {
      const map: LlmSectionsMap = {};
      Object.entries(record).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') return;
        const title = typeof value.title === 'string' ? value.title : undefined;
        const blocks = Array.isArray(value.blocks) ? value.blocks : [];
        map[key] = { title, blocks };
      });
      return map;
    }
  }
  return {};
};

/** * ============================================================
 * 2. 主页面组件 (App)
 * ============================================================
 */

const LLM_API = '/api/extract';
const PARSE_API = '/api/parse';

type TrialParsed = {
  markdown: string;
  pages: unknown[];
};

const INITIAL_LOADING_STATES: Record<ModuleKey, { status: LoadingStatus; progress: number }> = {
  basic: { status: 'waiting', progress: 0 },
  qualification: { status: 'waiting', progress: 0 },
  evaluation: { status: 'waiting', progress: 0 },
  submission: { status: 'waiting', progress: 0 },
  invalid_risk: { status: 'waiting', progress: 0 },
  annex: { status: 'waiting', progress: 0 }
};

const INITIAL_RESULTS: Record<ModuleKey, LlmSectionsMap> = {
  basic: {}, qualification: {}, evaluation: {}, submission: {}, invalid_risk: {}, annex: {}
};

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<ModuleKey>('basic');
  const [logs, setLogs] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 存储抽取结果
  const [results, setResults] = useState<Record<ModuleKey, LlmSectionsMap>>(INITIAL_RESULTS);
  // 存储每个模块的状态和进度
  const [loadingStates, setLoadingStates] = useState<Record<ModuleKey, { status: LoadingStatus; progress: number }>>(INITIAL_LOADING_STATES);

  useEffect(() => {
    if (!file) { setPdfUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const resetToUpload = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setResults(INITIAL_RESULTS);
    setLoadingStates(INITIAL_LOADING_STATES);
    setLogs([]);
    setStep(1);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!dropped.name.toLowerCase().endsWith('.pdf') && dropped.type !== 'application/pdf') {
      alert('仅支持 PDF 格式文件');
      return;
    }
    setFile(dropped);
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const callTextInTrialParse = async (inputFile: File): Promise<TrialParsed> => {
    const formData = new FormData();
    formData.append('file', inputFile);

    const resp = await fetch(PARSE_API, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`文档解析失败: http=${resp.status}, ${text.slice(0, 500)}`);
    }

    const data = await resp.json();
    addLog(`Parse OK: ${data.markdown?.length ?? 0} chars, ${data.pages?.length ?? 0} pages`);

    const markdown = typeof data.markdown === 'string' ? data.markdown : '';
    const pages = Array.isArray(data.pages) ? data.pages : [];

    if (!markdown) {
      throw new Error('文档解析返回了空的 markdown');
    }
    return { markdown, pages };
  };

  const normalizeText = (text: string): string =>
    text.replace(/\s+/g, ' ').trim().toLowerCase();

  const normalizeLooseText = (text: string): string =>
    text
      .replace(/\s+/g, '')
      .replace(/[\u0000-\u001f]/g, '')
      .replace(/\$/g, '')
      .toLowerCase();

  const getPageText = (page: unknown): string => {
    if (typeof page === 'string') return page;
    if (!page || typeof page !== 'object') return '';
    const record = page as Record<string, unknown>;
    const candidates = ['markdown', 'text', 'page_text'];
    for (const key of candidates) {
      const val = record[key];
      if (typeof val === 'string' && val.trim()) return val;
    }
    const collectFromArray = (key: 'content' | 'structured'): string => {
      const val = record[key];
      if (!Array.isArray(val)) return '';
      return val
        .map(item => {
          if (!item || typeof item !== 'object') return '';
          const text = (item as Record<string, unknown>).text;
          return typeof text === 'string' ? text : '';
        })
        .filter(Boolean)
        .join(' ');
    };
    const fromContent = collectFromArray('content');
    if (fromContent) return fromContent;
    const fromStructured = collectFromArray('structured');
    if (fromStructured) return fromStructured;
    return '';
  };

  const findPageIndexesForChunk = (chunk: Chunk, pages: unknown[]): number[] => {
    if (!pages.length) return [];
    const title = normalizeText(chunk.title_path);
    const firstLine = normalizeText((chunk.content.split('\n')[0] || '').slice(0, 80));
    const snippet = normalizeText((chunk.title_path + '\n' + chunk.content).slice(0, 160));
    // 新增：获取 Chunk 结尾的文本，用于匹配跨页的情况
    const endSnippet = normalizeText(chunk.content.slice(-160));

    const looseTitle = normalizeLooseText(chunk.title_path);
    const looseFirstLine = normalizeLooseText((chunk.content.split('\n')[0] || '').slice(0, 80));
    const looseSnippet = normalizeLooseText((chunk.title_path + '\n' + chunk.content).slice(0, 160));
    const looseEndSnippet = normalizeLooseText(chunk.content.slice(-160));

    const matches: number[] = [];
    pages.forEach((p, idx) => {
      const pageRaw = getPageText(p);
      if (!pageRaw) return;
      const pageText = normalizeText(pageRaw);
      const pageLoose = normalizeLooseText(pageRaw);

      // 策略优化：
      // 1. 标题匹配：阈值从 2 提高到 8，防止匹配到页眉中的短标题（如"招标公告"）
      // 2. 正文匹配：阈值从 6/12 提高到 10/20，确保是真正的正文内容
      // 3. 增加结尾匹配：防止长 Chunk 跨页时漏掉后半部分的页面

      const hitTitle = title.length > 8 && pageText.includes(title);
      const hitFirst = firstLine.length > 10 && pageText.includes(firstLine);
      const hitSnippet = snippet.length > 20 && pageText.includes(snippet);
      const hitEnd = endSnippet.length > 20 && pageText.includes(endSnippet);

      const hitLooseTitle = looseTitle.length > 8 && pageLoose.includes(looseTitle);
      const hitLooseFirst = looseFirstLine.length > 10 && pageLoose.includes(looseFirstLine);
      const hitLooseSnippet = looseSnippet.length > 20 && pageLoose.includes(looseSnippet);
      const hitLooseEnd = looseEndSnippet.length > 20 && pageLoose.includes(looseEndSnippet);

      if (hitTitle || hitFirst || hitSnippet || hitEnd || hitLooseTitle || hitLooseFirst || hitLooseSnippet || hitLooseEnd) {
        matches.push(idx);
      }
    });
    return matches;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLocate = (_source?: LlmField['source']) => {
    // Coordinate tracing not supported in this version
  };

  /** Core processing flow */
  const handleProcess = async () => {
    if (!file) return;
    setStep(2);
    addLog(`Preparing file: ${file.name}`);

    try {
      // 1) TextIn trial parse
      addLog("Calling TextIn trial parse...");
      const { markdown, pages } = await callTextInTrialParse(file);

      // 2) Split & classify
      addLog("Parse OK, splitting Markdown...");
      const chunks = parseMarkdownToChunks(markdown);

      const moduleData: Record<ModuleKey, { markdown: string; pageIndexes: Set<number> }> = {
        basic: { markdown: '', pageIndexes: new Set() },
        qualification: { markdown: '', pageIndexes: new Set() },
        evaluation: { markdown: '', pageIndexes: new Set() },
        submission: { markdown: '', pageIndexes: new Set() },
        invalid_risk: { markdown: '', pageIndexes: new Set() },
        annex: { markdown: '', pageIndexes: new Set() }
      };

      chunks.forEach(c => {
        const key = classifyChunkToModule(c);
        moduleData[key].markdown += `\n\n### ${c.title_path}\n` + c.content;
        const hitIndexes = findPageIndexesForChunk(c, pages);
        hitIndexes.forEach(i => moduleData[key].pageIndexes.add(i));
      });

      // 3) Parallel LLM calls
      addLog("Starting parallel LLM extraction (6 modules)...");
      const moduleKeys = TENDER_MODULES.map(mod => mod.key);

      const tasks = moduleKeys.map(async (key) => {
        setLoadingStates(prev => ({ ...prev, [key]: { status: "loading", progress: 25 } }));

        try {
          // Load prompt per module from public/prompt/ folder
          const promptRes = await fetch(`/prompt/${key}_prompt.txt`);
          if (!promptRes.ok) throw new Error(`Failed to load prompt: ${key}_prompt.md`);
          const promptText = await promptRes.text();

          // 只发送当前模块命中的页面，避免全量 pages 导致后端 OOM
          // 同时扩展相邻页（±2），避免模板页/格式页的 OCR content 行与 markdown 不一致导致漏页
          const modulePageIndexes = moduleData[key].pageIndexes;
          const expandedIndexes = new Set<number>();
          modulePageIndexes.forEach(idx => {
            for (let offset = -2; offset <= 2; offset++) {
              const neighbor = idx + offset;
              if (neighbor >= 0 && neighbor < pages.length) {
                expandedIndexes.add(neighbor);
              }
            }
          });
          const filteredPages = expandedIndexes.size > 0
            ? pages.filter((_, idx) => expandedIndexes.has(idx))
            : pages;
          addLog(`Module [${MODULE_NAME_MAP[key]}] pages: ${filteredPages.length}/${pages.length} (expanded from ${modulePageIndexes.size})`);

          const response = await fetch(LLM_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: promptText,
              markdown: moduleData[key].markdown || "No related content found",
            })
          });

          if (!response.ok) throw new Error("Backend request failed");

          const json = (await response.json()) as LlmApiResponse;
          if (json.code === 200) {
            let finalSections: LlmSectionsMap = {};

            // 优先尝试从 raw_json 解析（包含溯源信息）
            if (json.result?.raw_json?.sections) {
              finalSections = normalizeSectionsFromRawWithSource(json.result.raw_json.sections);
            } else {
              // 降级处理：使用 llm_json
              const rawSections = json.result?.llm_json?.sections;
              finalSections = normalizeSectionsFromRaw(key, rawSections);
            }

            setResults(prev => ({ ...prev, [key]: finalSections }));
            setLoadingStates(prev => ({ ...prev, [key]: { status: "done", progress: 100 } }));
            addLog(`Module [${MODULE_NAME_MAP[key]}] done`);
          } else {
            throw new Error(json.message);
          }
        } catch (e) {
          addLog(`Module [${MODULE_NAME_MAP[key]}] failed: ${e}`);
          setLoadingStates(prev => ({ ...prev, [key]: { status: "error", progress: 100 } }));
        }
      });

      await Promise.allSettled(tasks);
      addLog("All extraction tasks finished");

    } catch (error) {
      addLog(`Fatal error: ${error}`);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `解析结果_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderValue = (value: LlmValue) => {
    const formatted = formatValue(value);
    if (!formatted) return <span className="text-slate-300 font-normal">未提及</span>;

    // 1. 如果是 HTML 表格 (TextIn 或 LLM 有时会返回 HTML 格式表格)
    if (formatted.trim().toLowerCase().startsWith('<table')) {
      return (
        <div 
          className="overflow-x-auto my-2 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: formatted }} 
        />
      );
    }

    // 2. 尝试用 Markdown 渲染 (支持 Markdown 表格、列表、加粗等)
    return (
      <div className="text-sm leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({node, ...props}) => (
              <div className="overflow-x-auto my-2 border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse" {...props} />
              </div>
            ),
            thead: ({node, ...props}) => <thead className="bg-slate-50 text-slate-500 font-bold" {...props} />,
            th: ({node, ...props}) => <th className="p-3 border-b border-slate-200 text-xs uppercase tracking-wider" {...props} />,
            td: ({node, ...props}) => <td className="p-3 border-b border-slate-100 text-sm" {...props} />,
            a: ({node, ...props}) => <a className="text-indigo-600 hover:underline" {...props} />,
            p: ({node, ...props}) => <p className="my-0.5" {...props} />,
          }}
        >
          {formatted}
        </ReactMarkdown>
      </div>
    );
  };

  const renderBlockTitle = (title?: string) =>
    title ? (
      <div className="px-6 pt-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </div>
    ) : null;

  const renderBlock = (block: LlmBlock, idx: number) => {
    switch (block.type) {
      case 'table': {
        const columns = block.columns && block.columns.length ? block.columns : ['??', '??'];
        const rows = Array.isArray(block.rows) ? block.rows : [];
        return (
          <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
            {renderBlockTitle(block.title)}
            <table className="w-full text-sm">
              <thead className="bg-slate-100/40 text-slate-500">
                <tr>
                  {columns.map((col, cIdx) => (
                    <th key={cIdx} className="text-left font-bold p-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-white last:border-0 group">
                      <td className="w-1/3 p-6 font-bold text-slate-500 bg-slate-100/30 group-hover:bg-indigo-50/50 transition-colors italic">
                        {normalizeFieldLabel(row)}
                      </td>
                      <td
                        className="p-6 text-slate-700 leading-relaxed font-medium cursor-pointer hover:bg-yellow-50 hover:text-indigo-700 transition-colors"
                        onClick={() => handleLocate(row.source)}
                        title="点击定位原文"
                      >
                        {renderValue(row.value ?? '')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="p-6 text-slate-300">
                      该项暂无详细数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }
      case 'kv': {
        const items = Array.isArray(block.items) ? block.items : [];
        return (
          <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
            {renderBlockTitle(block.title)}
            <table className="w-full text-sm">
              <tbody>
                {items.length ? (
                  items.map((item, iIdx) => (
                    <tr key={iIdx} className="border-b border-white last:border-0 group">
                      <td className="w-1/3 p-6 font-bold text-slate-500 bg-slate-100/30 group-hover:bg-indigo-50/50 transition-colors italic">
                        {normalizeFieldLabel(item)}
                      </td>
                      <td
                        className="p-6 text-slate-700 leading-relaxed font-medium cursor-pointer hover:bg-yellow-50 hover:text-indigo-700 transition-colors"
                        onClick={() => handleLocate(item.source)}
                        title="点击定位原文"
                      >
                        {renderValue(item.value ?? '')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-6 text-slate-300">该项暂无详细数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }
      case 'list': {
        const items = Array.isArray(block.items) ? block.items : [];
        return (
          <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6">
            {renderBlockTitle(block.title)}
            {items.length ? (
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                {items.map((item, iIdx) => (
                  <li
                    key={iIdx}
                    className="leading-relaxed cursor-pointer hover:text-indigo-600 hover:underline"
                    onClick={() => handleLocate(item.source)}
                  >
                    {renderValue(item.value ?? item.label ?? item.key ?? '')}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-300">该项暂无详细数据</div>
            )}
          </div>
        );
      }
      case 'text': {
        return (
          <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6">
            {renderBlockTitle(block.title)}
            <div
              className="text-slate-700 leading-relaxed font-medium cursor-pointer hover:text-indigo-600"
              onClick={() => handleLocate(block.source)}
              title="点击定位原文"
            >
              {renderValue(block.value ?? '')}
            </div>
          </div>
        );
      }
      case 'md_table': {
        const content = block.value ?? '';
        const isHtmlTable = content.trim().toLowerCase().startsWith('<table');
        return (
          <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6">
            {renderBlockTitle(block.title)}
            {content ? (
              isHtmlTable ? (
                <div
                  className="overflow-x-auto my-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <div className="prose prose-slate max-w-none text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    allowedElements={[
                      'table', 'thead', 'tbody', 'tr', 'th', 'td',
                      'p', 'br', 'strong', 'em', 'code', 'pre',
                      'span', 'div', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn',
                      'annotation', 'annotation-xml'
                    ]}
                    unwrapDisallowed
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )
            ) : (
              <div className="text-slate-300">璇ラ」鏆傛棤璇︾粏鏁版嵁</div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 顶部状态栏 */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <FileSearch size={22} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">招标文件智能抽取 Demo</h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase">Version 1.1.0 • TextIn xParse</p>
          </div>
        </div>
        {step === 3 && (
          <div className="flex gap-3">
            <button 
              onClick={() => setStep(2)}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2"
            >
              返回进度
            </button>
            <button
              onClick={resetToUpload}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2"
            >
              重新上传
            </button>
            <button 
              onClick={exportJson}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Download size={16} /> 导出 JSON
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        {/* 步骤 1：上传文件 */}
        {step === 1 && (
          <div className="max-w-xl mx-auto mt-16 animate-in fade-in zoom-in duration-500">
            {/* Logo & title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-200">
                <FileSearch size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">招标文件智能解析</h2>
              <p className="text-sm text-slate-400 mt-2">上传 PDF 招标文件，AI 自动提取核心条款</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 p-8">
              {/* 拖拽上传区 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : file
                    ? 'border-indigo-300 bg-indigo-50/40'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => { if (!file) fileInputRef.current?.click(); }}
              >
                {file ? (
                  /* 已选文件状态 */
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={22} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
                      </p>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="w-8 h-8 rounded-full hover:bg-rose-50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-colors shrink-0"
                      title="移除文件"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  /* 未选文件状态 */
                  <div className="flex flex-col items-center gap-3 py-4 select-none">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Upload size={22} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        {isDragging ? '松开即可上传' : <>拖拽文件到此处，或 <span className="text-indigo-600">点击选择</span></>}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">仅支持 PDF 格式 · 最大 50 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 开始按钮 */}
              <button
                onClick={handleProcess}
                disabled={!file}
                className={`w-full mt-5 py-4 rounded-xl font-bold text-base transition-all duration-200 ${
                  file
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:-translate-y-0.5 active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                开始智能解析
              </button>
            </div>
          </div>
        )}

        {/* 步骤 2：处理中与进度反馈 */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-700">正在解析 · {file?.name}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TENDER_MODULES.map(mod => mod.key).map(key => {
                  const st = loadingStates[key].status;
                  const pct = loadingStates[key].progress;
                  return (
                    <div key={key} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">{MODULE_NAME_MAP[key]}</span>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          st === 'done' ? 'bg-emerald-50 text-emerald-600' :
                          st === 'error' ? 'bg-rose-50 text-rose-500' :
                          st === 'loading' ? 'bg-indigo-50 text-indigo-500' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {st === 'loading' && <Loader2 size={11} className="animate-spin" />}
                          {st === 'done' && <CheckCircle size={11} />}
                          {st === 'error' && <AlertCircle size={11} />}
                          {st === 'waiting' ? '等待中' : st === 'loading' ? '处理中' : st === 'done' ? '完成' : '失败'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            st === 'error' ? 'bg-rose-400' : st === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {pct === 100 && (
                        <button
                          onClick={() => { setActiveTab(key); setStep(3); }}
                          className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          查看结果
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-5 shadow-xl flex flex-col h-[560px] border border-slate-800">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Terminal size={13} className="text-indigo-400" />
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Console</span>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-2 pr-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-indigo-700 select-none shrink-0">›</span>
                    <span>{log}</span>
                  </div>
                ))}
                <div className="animate-pulse text-indigo-500 text-xs">▋</div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤 3：结果可视化 */}
        {step === 3 && (
          <div className="flex gap-5 h-[calc(100vh-130px)] animate-in fade-in duration-500">
            {/* 左侧：模块切换 */}
            <div className="w-52 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col shrink-0">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">提取模块</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {TENDER_MODULES.map(mod => mod.key).map(key => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm ${
                      activeTab === key
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <span className="font-semibold">{MODULE_NAME_MAP[key]}</span>
                    <ChevronRight size={14} className={activeTab === key ? 'opacity-80' : 'opacity-20'} />
                  </button>
                ))}
              </div>
            </div>

            {/* 中间：数据内容 */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-w-0">
              <div className="px-7 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    {activeTab.substring(0, 1).toUpperCase()}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">{MODULE_NAME_MAP[activeTab]}</h2>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                  <Info size={11} className="text-indigo-400" />
                  AI 抽取结果
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-7 py-6">
                <div className="space-y-10">
                  {MODULE_SECTIONS[activeTab].map((sectionDef, sIdx) => {
                    const section = results[activeTab]?.[sectionDef.key] || { title: sectionDef.title, blocks: [] };
                    const sectionTitle = section.title || section.section_name || section.name || sectionDef.title;
                    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
                    return (
                      <div
                        key={sectionDef.key}
                        className="animate-in slide-in-from-top-2"
                        style={{ animationDelay: `${sIdx * 80}ms` }}
                      >
                        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-3">
                          <span className="w-1 h-5 bg-indigo-500 rounded-full shrink-0"></span>
                          {sectionTitle}
                        </h4>
                        {blocks.length ? (
                          <div className="space-y-3">{blocks.map(renderBlock)}</div>
                        ) : (
                          <div className="flex items-center justify-center h-24 text-slate-300 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            暂无数据
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 右侧：PDF 预览 */}
            <div className="w-[460px] hidden xl:flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 shrink-0">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">原文预览</span>
                <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded font-bold tracking-wider">PDF</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {pdfUrl ? (
                  <PdfViewer fileUrl={pdfUrl} pageNumber={1} highlights={[]} ocrDpi={144} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    PDF 渲染中...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
