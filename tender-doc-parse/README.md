# 招标文件解析工具

> 面向中国大陆招采场景的结构化信息抽取工具：先用 TextIn 做文档解析，再按 6 大模块并发输出 JSON。

## 为什么做这个项目

在中国大陆招采场景里，招标文件往往页数长、章节多、附件杂，资格条件、评分办法、无效标条款、投标截止时间和响应格式要求经常分散在几十页甚至上百页文件里。人工逐页梳理不仅慢，而且容易遗漏关键限制条件。

公开制度背景：
- 中国政府采购网和全国公共资源交易平台持续发布政府采购、工程建设、药品采购等各类项目文件，说明“长文档快速结构化处理”是大陆客户的高频需求。
- 《中华人民共和国招标投标法》明确，招标文件应载明技术要求、资格审查标准、投标报价要求、评标标准和拟签订合同的主要条款，这也是招标文本天然适合做结构化解析和模块化抽取的原因。

## 当前能力（与代码一致）

- 支持上传 PDF 招标文件（前端限制 PDF）。
- 调用 TextIn 获取 `markdown + pages`。
- 将 Markdown 按标题切块并用关键词路由到 6 个模块。
- 每个模块加载独立提示词模板，并发抽取。
- 模块化输出：
  - 基础信息（`basic`）
  - 资格要求（`qualification`）
  - 评审要求（`evaluation`）
  - 投标要求（`submission`）
  - 无效标风险（`invalid_risk`）
  - 附件材料（`annex`）
- 支持导出汇总 JSON。

## 处理流程

1. 前端上传 PDF -> `POST /api/parse`。
2. 后端调用 TextIn，返回 `markdown/pages`。
3. 前端切块并做模块归类。
4. 前端并发调用 `POST /api/extract`（6 个模块）。
5. 聚合模块结果并导出 JSON。

## 技术栈

- 后端：Python + FastAPI
- 前端：React + TypeScript + Vite + Tailwind CSS
- 文档解析：TextIn 通用文档解析 API
- 大模型：OpenAI 兼容接口（默认 `qwen-plus`）

## 快速开始

### 1) 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
TEXTIN_APP_ID=your_app_id_here
TEXTIN_SECRET_CODE=your_secret_code_here
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-plus
```

### 2) 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端默认运行在 `http://localhost:8000`。

### 3) 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`（Vite 已代理 `/api` 到后端）。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `TEXTIN_APP_ID` | 是 | TextIn 应用 ID |
| `TEXTIN_SECRET_CODE` | 是 | TextIn 应用密钥 |
| `OPENAI_API_KEY` | 是 | OpenAI 兼容接口密钥 |
| `OPENAI_BASE_URL` | 否 | 默认 `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `OPENAI_MODEL` | 否 | 默认 `qwen-plus` |

## API 概览

### `POST /api/parse`

- 请求：`multipart/form-data`，字段 `file`
- 返回：

```json
{
  "markdown": "...",
  "pages": []
}
```

### `POST /api/extract`

- 请求：

```json
{
  "prompt": "模块提示词",
  "markdown": "..."
}
```

- 返回：

```json
{
  "code": 200,
  "result": {
    "llm_json": {
      "sections": {}
    }
  }
}
```

## 提示词模板

模块提示词位于：

- `frontend/public/prompt/basic_prompt.txt`
- `frontend/public/prompt/qualification_prompt.txt`
- `frontend/public/prompt/evaluation_prompt.txt`
- `frontend/public/prompt/submission_prompt.txt`
- `frontend/public/prompt/invalid_risk_prompt.txt`
- `frontend/public/prompt/annex_prompt.txt`

可按你的行业规范（政府采购/工程招标/医疗采购等）直接调整模板。

## 目录结构

```text
tender-doc-parse/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ public/prompt/
│  ├─ src/constants/tenderModules.ts
│  ├─ src/App.tsx
│  └─ package.json
├─ .env.example
└─ README.md
```

## 已知限制

- 当前前端仅支持 PDF 上传。
- 结果以结构化 JSON 为主，UI 暂未开启“点击字段定位到原文坐标”。
- 输出质量依赖原始文档质量、提示词设计和模型能力。

## 合规与免责声明

- 本项目输出用于信息整理与辅助阅读，不构成投标、法律或合规意见。
- 关键条款（资格、评分、时间节点、无效标条件）请务必人工复核。

## 参考资料

- 中国政府采购网：https://www.ccgp.gov.cn/
- 全国公共资源交易平台：https://www.ggzy.gov.cn/
- 《中华人民共和国招标投标法》：https://www.miit.gov.cn/jgsj/cws/hjzcgl/art/2020/art_9138e1118b89484a837eb07fb6c0d756.html
