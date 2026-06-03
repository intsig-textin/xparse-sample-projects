# 试卷题目智能抽取

基于 [TextIn](https://www.textin.com) `pdf_to_markdown` 接口 + 大模型的试卷结构化抽取 demo。上传一份 PDF / 图片 / Word 试卷，浏览器里直接得到「按题组切分的题目结构 + 学科识别 + 多格式导出」的完整体验，可作为题库入库 / 智能阅卷的样板工程。

## 功能特性

- **OCR + 文档树解析**：调用 TextIn 公有云 `pdf_to_markdown`，输出 markdown / pages / detail
- **多模型可用 LLM 抽取**：默认接 `qwen-flash`（DashScope 兼容 OpenAI 格式），支持替换为任意 OpenAI 兼容接口
- **后端分批抽取 + SSE 实时进度**：按 10 页一批送 LLM，跨批次保留题组延续上下文（completes_previous + group_id 全卷连续）；每完成一批通过 SSE 推一条进度，前端实时显示
- **题组识别**：阅读理解、完形填空、文言文、多步解答题等共享题干题组自动识别，shared_stem 与 questions 分离
- **图片归属**：试卷里的题图 / 选项图 / 听力图按位置归属到题干 / 选项 / 共享题干
- **试卷信息识别**：学科 / 年级 / 考试类型 / 是否含图自动识别并展示
- **公式排版**：题干 / 选项里的 LaTeX 公式（`$...$`、`\[ ... \]` 等）通过 MathJax 自动排版
- **多格式导出**：抽取结果支持导出 JSON / Markdown / CSV，CSV 可直接入题库

## 架构

```
┌───────────────────┐    ┌───────────────────────────────────┐    ┌─────────────┐
│  Browser (Vite)   │───▶│  FastAPI Backend (Python)         │───▶│  TextIn API │
│  React + Tailwind │    │  /api/parse           → OCR       │    │  OCR        │
│                   │    │  /api/extract_stream  → LLM (SSE) │───▶│  LLM        │
│                   │◀───│  /api/image           → 图片代理   │    │             │
└───────────────────┘    └───────────────────────────────────┘    └─────────────┘
```

后端职责：
1. 把试卷送 TextIn 拿到 markdown / pages / detail
2. 把 pages 按 10 页切批，逐批构造 prompt + 该批次 markdown 喂 LLM
3. 每批 LLM 返回的题组 JSON 经规范化、跨批次合并、group_id 重排后逐批 SSE 推回前端
4. 代理 TextIn 单页图片下载（带凭证），让浏览器拿到无水印页面图

前端职责：
1. 上传文件 → POST `/api/parse` 拿 OCR 结果
2. 同时并发：`downloadAllPageImages`（左侧页面图）+ `extractFieldsStream`（SSE 抽取）
3. 抽取过程中实时显示批次进度，结束后展示题组 / 题目 / 选项 / 元信息

## 前置条件

- Python 3.10+
- Node.js 18+
- [TextIn](https://www.textin.com) 账号（OCR 接口凭证）
- OpenAI 兼容的 LLM key（默认是阿里云 DashScope 的 `qwen-flash`；也可换 OpenAI / DeepSeek / Kimi 等任意兼容接口）

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
OPENAI_MODEL=qwen-flash
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
exam-extract/
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── main.py              # FastAPI: /api/parse, /api/extract_stream (SSE), /api/image
│   ├── extractor.py         # 分批抽取核心 + LLM 调用 + 跨批次 group_id 合并
│   ├── prompts.py           # buildBatchExtractionPrompt + SCHEMA + EXAMPLES
│   ├── question_types.py    # 题型枚举单一来源
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                       # 主入口(上传 / 解析 / 抽取 / 结果布局)
        ├── index.css                     # Tailwind + markdown 渲染样式
        ├── constants.js
        ├── api/
        │   ├── textin.js                 # /api/parse + 多页图片下载(并发 + 旋转)
        │   └── llm.js                    # /api/extract_stream SSE 消费(fetch + ReadableStream)
        ├── constants/
        │   └── questionTypes.js
        ├── utils/
        │   └── normalize.js              # countByType / totalScore 等聚合
        └── components/
            ├── UploadZone.jsx
            ├── StepIndicator.jsx
            ├── PageImageViewer.jsx
            ├── ResultLayout.jsx
            ├── ParsePanel.jsx            # 解析原文 markdown 渲染
            ├── ExtractionPanel.jsx       # 题组卡片 / 题目列表 / 顶部统计
            ├── ClassificationCard.jsx    # 试卷元信息(学科/年级/类型)
            └── ExportActions.jsx         # JSON / Markdown / CSV 导出菜单
```

## 二次开发提示

- **替换 LLM 模型**：改 `.env` 的 `OPENAI_MODEL` 即可。`qwen-flash` 速度快、单价低，长试卷分批调用成本可控；如对题组识别精度要求更高，可换 `qwen-plus` / `gpt-4o-mini` 等
- **修改批次大小**：在 [backend/extractor.py](backend/extractor.py) 改 `BATCH_PAGE_SIZE`。值越大单批 LLM 调用更长但批次少，跨批次延续 bug 概率低；值越小并发可能性更强但题组跨批拼接会更频繁
- **新增题型**：同时改 [backend/question_types.py](backend/question_types.py) 与 [frontend/src/constants/questionTypes.js](frontend/src/constants/questionTypes.js) 中的枚举即可（前端有颜色样式，后端只用于 prompt 中告诉模型可选枚举）
- **持久化 / 入库**：`/api/extract_stream` 的最终事件即标准 ExtractionResult，可直接落库或灌进题库系统
- **替换为私有云 / 自托管 OCR**：只需修改 [backend/main.py](backend/main.py) 中的 `TEXTIN_API_URL` 与认证 header
