# 国家标准书知识库解析

基于 [TextIn](https://www.textin.com) `pdf_to_markdown` 接口的国家标准（GB / GB-T 等）文档解析 demo。上传一份标准 PDF/Word，即可在浏览器里得到「按章节切分的高质量分块 + 原文位置高亮」的完整知识库前台体验，可作为 RAG / 知识库检索系统的样板工程。

## 功能特性

- **OCR + 文档树解析**：调用 TextIn 公有云 `pdf_to_markdown`，输出原始 detail / catalog / pages
- **章节驱动的 Chunking**：基于 `outline_level` 把章/节/条切成独立 chunk，表格独立成块、保留 caption
- **页眉页脚开关**：一键切换 chunk 是否混入页眉页脚正文（后端预算两套，前端无需重新解析）
- **左右联动**：左侧页面图，右侧 Tabs（Chunks / 目录 / 表格 / 图片 / Markdown），任何选中项都会高亮原文位置
- **关键词检索**：基于分词的 chunk 检索，命中条款一键定位
- **JSON / Markdown 导出**：chunks 可导出成知识库可消费的 JSON，markdown 可下载
- **保留 LLM 口子**：`/api/extract` 已就位，方便扩展「自动生成章节摘要 / 抽取条款字段」等下游

## 架构

```
┌───────────────────┐    ┌───────────────────────────────┐    ┌─────────────┐
│  Browser (Vite)   │───▶│  FastAPI Backend (Python)      │───▶│  TextIn API │
│  React + Tailwind │    │  /api/parse  → OCR+Chunk+Media │    │  OCR        │
│                   │    │  /api/extract → LLM (留作扩展) │───▶│  LLM        │
│                   │◀───│  /api/image  → 图片代理        │    │             │
└───────────────────┘    └───────────────────────────────┘    └─────────────┘
```

`/api/parse` 一次返回前端需要的全部数据：

- `markdown` / `rebuilt_markdown` / `lineToDetail`：原始 markdown + 行号到 detail 索引的映射，用于点击溯源
- `pages` / `detail` / `catalog`：OCR 原始结构
- `chunks` & `chunks_with_paratext`：两套 chunk（含/不含页眉页脚），前端切换时无需重 OCR
- `media`：表格 / 图片清单（带 caption + 章节路径）

## 前置条件

- Python 3.10+
- Node.js 18+
- [TextIn](https://www.textin.com) 账号（OCR 接口凭证）
- OpenAI 兼容的 LLM key（如阿里云 DashScope / OpenAI；当前 demo 不主动调，但 `/api/extract` 接口要求配置）

## 启动

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```
TEXTIN_APP_ID=your_app_id
TEXTIN_SECRET_CODE=your_secret_code
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-plus
```

### 2. 启动后端

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python main.py
```

后端默认监听 `http://localhost:8000`。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 目录结构

```
national-standard-parse/
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── main.py             # FastAPI: /api/parse, /api/extract, /api/image
│   ├── chunker.py          # 标题层级驱动的 chunk 生成 + 目录树构建
│   ├── media_extractor.py  # 表格 / 图片提取(关联 caption + 章节路径)
│   ├── markdown_builder.py # 重建 markdown + 行号→detail 索引映射
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx           # 主入口(上传 / 解析 / 结果布局)
        ├── index.css         # Tailwind + 渲染样式(markdown / chunk / 高亮多边形)
        ├── constants.js
        ├── api/
        │   ├── textin.js     # /api/parse + 多页图片下载(并发 + 旋转)
        │   └── llm.js        # /api/extract 包装,留作二次开发
        ├── utils/
        │   └── markdownMath.js  # remark/rehype 插件 + KaTeX auto-render
        └── components/
            ├── UploadZone.jsx
            ├── StepIndicator.jsx
            ├── ResultLayout.jsx
            ├── PageImageViewer.jsx   # 页面图 + 高亮多边形 + 缩放
            ├── ChunkPanel.jsx        # chunk 列表 + 检索 + JSON 导出
            ├── TreePanel.jsx         # 目录树
            ├── MediaPanel.jsx        # 表格 / 图片卡片
            ├── MarkdownPanel.jsx     # markdown 渲染 + 点击溯源
            └── ToggleSwitch.jsx
```

## 二次开发提示

- **替换为私有云 / 自托管 OCR**：只需修改 `backend/main.py` 里 `TEXTIN_API_URL` 与认证 header
- **接入 LLM 自动摘要**：在 `App.jsx` 解析完成后调用 `frontend/src/api/llm.js#callLlmExtract`，把 chunk 文本灌进去
- **持久化 / 入库**：`/api/parse` 返回的 `chunks` 已是知识库 schema,可直接落库或灌进向量索引
