/**
 * 招标文件解析逻辑
 * 功能：Markdown切块、标题路径识别、6大业务模块归类
 */

export interface Chunk {
  chunk_id: number;
  title_path: string;
  content: string;
  md_len: number;
}

export type ModuleKey = 'basic' | 'qualification' | 'evaluation' | 'submission' | 'invalid_risk' | 'annex';

export const MODULE_CONFIG: Record<ModuleKey, { name: string; keywords: string[] }> = {
  basic: {
    name: '基础信息',
    keywords: ['招标公告', '招标邀请', '项目概况', '资金来源', '联系方式', '媒介']
  },
  qualification: {
    name: '资格要求',
    keywords: ['资格', '资质', '财务', '业绩', '信誉', '联合体']
  },
  evaluation: {
    name: '评审要求',
    keywords: ['评标', '评审', '评分', '分值', '废标', '通过性']
  },
  submission: {
    name: '投标要求',
    keywords: ['投标文件', '递交', '开标', '保证金', '电子投标', '密封']
  },
  invalid_risk: {
    name: '无效标风险',
    keywords: ['无效标', '否决', '废标条款', '投诉', '纪律']
  },
  annex: {
    name: '附件材料',
    keywords: ['附件', '格式', '表单', '样表', '清单']
  }
};

/**
 * 将全文 Markdown 按 # 和 ## 标题切分
 */
export function parseMarkdownToChunks(md: string): Chunk[] {
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

/**
 * 归类逻辑：优先匹配标题，不匹配的默认放 basic
 */
export function classifyChunkToModule(chunk: Chunk): ModuleKey {
  const text = (chunk.title_path + chunk.content.substring(0, 200)).toLowerCase();
  for (const [key, config] of Object.entries(MODULE_CONFIG)) {
    if (key === 'basic') continue;
    if (config.keywords.some(k => text.includes(k))) return key as ModuleKey;
  }
  return 'basic';
}