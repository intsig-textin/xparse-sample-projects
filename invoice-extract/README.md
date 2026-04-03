# 海外发票抽取工具

> 面向跨境业务场景的发票结构化抽取工具：先做文档解析，再做分类、字段抽取、明细拆批抽取和结果校验。

## 为什么做这个项目

跨境发票处理难点通常在于：格式不统一、字段命名差异大、多页明细表容易漏行、复核成本高。

行业背景（公开信息）：
- 欧盟理事会于 `2024-11-05` 就 ViDA（VAT in the Digital Age）方案达成一致，其中包含电子发票与数字申报相关安排。
- 欧盟委员会在 `2026-03-18` 启动了对 eInvoicing Directive（2014/55/EU）的修订征询，说明电子发票标准化需求仍在持续提升。

## 当前能力（与代码一致）

- 支持上传 `PDF / DOC / DOCX /IMG`（前端限制，最大 50MB）。
- 文档解析：调用 TextIn 获取 `markdown + pages`。
- 第一阶段：分类（是否发票 + 发票子类型）。
- 第二阶段：抽取头部字段（header/parties/shipping/payment/totals/tax 等）。
- 第三阶段：抽取明细行（line items）。
  - 多页文档自动分批抽取（表格批或分页批），并按顺序流式合并结果。
- 自动校验并输出告警（金额一致性、关键字段缺失、明细行数量异常等）。
- 支持导出抽取 JSON 与解析 Markdown。

## 处理流程

1. 上传文件 -> `POST /api/parse`。
2. TextIn 输出 `markdown/pages`。
3. 分类文档类型。
4. 抽取头部字段。
5. 单次或分批抽取明细行（并发队列）。
6. 归一化结果并执行规则校验，返回告警。

## 技术栈

- 后端：Python + FastAPI
- 前端：React + TypeScript + Vite + Tailwind CSS
- 文档解析：TextIn 通用文档解析 API
- 大模型：OpenAI 兼容接口（默认 `qwen-plus`）

## 快速开始

### 1) 创建环境变量文件

```bash
cp .env.example .env
```

编辑 `.env`，填入：

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
  "prompt": "抽取提示词",
  "markdown": "..."
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

## 内置校验规则（前端）

- `MISSING_TOTAL`：未识别总金额
- `MISSING_INVOICE_NUMBER`：未识别发票号
- `MISSING_DATE` / `MISSING_CURRENCY`
- `LINE_TOTAL_MISMATCH`：明细合计与小计不一致
- `TOTAL_MISMATCH`：计算总额与总金额不一致
- `FEW_LINE_ITEMS`：多页发票明细行过少

## 目录结构

```text
invoice-extract/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/api/
│  ├─ src/components/
│  ├─ src/prompts/invoicePrompts.ts
│  ├─ src/types/invoice.ts
│  └─ src/utils/
├─ .env.example
└─ README.md
```

## 已知限制

- 当前上传端仅开放 `PDF/DOC/DOCX`，未开放图片上传。
- 当前版本以结构化结果与规则校验为主，原文坐标联动暂未在 UI 中启用。
- 对极端复杂版式/低质量扫描件，仍建议人工复核关键金额与税务字段。

## 合规与免责声明

- 本项目输出仅用于数据整理与对账辅助，不构成税务、财务或法律建议。
- 涉及跨境税务申报时，请以当地法规与专业意见为准。

## 参考资料

- Council of the EU: VAT in the Digital Age（2024-11-05）：https://www.consilium.europa.eu/en/press/press-releases/2024/11/05/taxation-council-agrees-on-vat-in-the-digital-age-package/
- European Commission eInvoicing（Directive 2014/55/EU）：https://single-market-economy.ec.europa.eu/single-market/public-procurement/digital-procurement/einvoicing_en
- European Commission consultation on revising eInvoicing Directive（2026-03-18）：https://single-market-economy.ec.europa.eu/news/european-commissions-launches-targeted-consultation-revise-einvoicing-directive-2026-03-18_en
