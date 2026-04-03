# 合同审查工具

> 面向中国大陆企业合同初审场景：用 TextIn 解析合同正文，并行完成条款风险审阅、规范审阅和主体识别。

## 为什么做这个项目

在中国大陆企业合同流转里，销售、采购、服务、工程、人事等合同大量以盖章扫描件、图片件和 PDF 形式流转。法务、业务和采购在初审阶段最耗时的工作，往往不是先判断法理，而是先把合同读清楚、把关键条款定位出来。

公开制度背景：
- 国家市场监督管理总局持续发布和更新合同示范文本，说明合同标准化、规范化一直是企业管理中的基础工作。
- 《合同行政监督管理办法》自 `2023-07-01` 起施行，并已于 `2025-03-18` 完成修正，持续强调合同订立、履行中的合规要求，也说明“先把低质量合同稳定解析出来，再做标准化初审”更符合大陆企业的真实使用方式。

本项目目标不是替代律师，而是把“首轮机械性审阅”标准化、结构化。

## 当前能力（与代码一致）

- 支持上传 `PDF / DOC / DOCX`（前端限制，最大 50MB）。
- TextIn 解析后输出合同 Markdown。
- 并行执行两类审阅：
  - 条款审阅（5 类）：责任条款、违约条款、知识产权、保密条款、争议解决。
  - 规范审阅（4 类）：错漏、一致性、格式、修订。
- 自动抽取甲乙方主体信息。
- 一键导出 Word 审查报告（`.docx`）。

## 处理流程

1. 上传合同文件 -> `POST /api/parse`。
2. TextIn 输出 `markdown + pages`。
3. 前端并发调用两次 `POST /api/extract`（条款/规范）。
4. 渲染审阅结果并支持导出报告。

## 技术栈

- 后端：Python + FastAPI
- 前端：React + Vite + Tailwind CSS
- 文档解析：TextIn 通用文档解析 API
- 大模型：OpenAI 兼容接口（默认 `qwen-plus`）
- 报告导出：`docx`（前端生成）

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

前端默认运行在 `http://localhost:5173`（已代理 `/api` 到后端）。

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
  "prompt": "审阅提示词",
  "markdown": "合同正文Markdown"
}
```

- 返回：

```json
{
  "code": 200,
  "result": {
    "llm_json": {}
  }
}
```

## 目录结构

```text
contract-review/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/prompts/
│  ├─ src/components/
│  ├─ src/pages/
│  └─ src/utils/export.js
├─ .env.example
└─ README.md
```

## 已知限制

- 当前版本重点是结构化审阅结果和报告导出，不提供完整原文坐标联动定位。
- 输出质量依赖提示词、模型能力与合同文本质量。
- 对高度专业、跨法域条款仍需人工深审。

## 合规与免责声明

- 本项目结果仅作为合同初审辅助，不构成法律意见。
- 生产使用前建议建立“法务复核 + 版本留痕 + 审批流”机制。

## 参考资料

- 国家市场监督管理总局合同示范文本库：https://htsfwb.samr.gov.cn/
- 《合同行政监督管理办法》：https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2025/art_7bcc7ff64200464daeb4b87ce450592f.html
