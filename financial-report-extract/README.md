# 财务三大表抽取工具

> 基于 TextIn 通用文档解析 API 的财报结构化抽取工具，面向 A 股财报中的资产负债表、利润表、现金流量表。

## 为什么做这个项目

在中国大陆资本市场场景里，A 股上市公司年报、半年报和季报通常以 PDF 形式披露，投研、审计辅助、财务分析、信披跟踪都需要在很短时间内拿到三大表的结构化数据。难点不只是“表格多”，而是“表格复杂 + 文档很长 + 时效性要求高”。

公开制度背景：
- 中国证监会于 `2025-03-26` 发布修订后的《上市公司信息披露管理办法》，并将于 `2025-07-01` 起施行，持续强调信息披露应当真实、准确、完整、及时、公平。
- 巨潮资讯网是深圳证券交易所法定信息披露平台，也是大陆客户获取上市公司公告和定期报告的高频入口，说明“快速解析财报 PDF 并抽取结构化表格”具备明确业务价值。

本仓库定位是一个可直接运行的工程样板：`OCR/解析 -> 表格识别 -> 三大表归类 -> 结构化导出`。

## 当前能力（与代码一致）

- 上传文档后调用 TextIn `pdf_to_markdown`，获取 `markdown + detail`。
- 基于 `detail` 中 `sub_type=table_title` 自动定位三大报表。
- 兼容 `rows/cells/html` 三种表格块数据结构进行解析。
- 自动识别“科目列 + 金额列”，输出本期/上期金额。
- 前端自动计算同比并展示涨跌趋势。
- 支持 CSV 导出。
- 输出来源页码 `page_id`，便于回溯。

## 处理流程

1. 前端上传文件到 `/api/parse-document`。
2. 后端调用 TextIn API（`parse_mode=auto`，`page_count=200`）。
3. 从 `result.detail` 中识别报表标题和后续表格块。
4. 标准化列结构并按三大表输出。
5. 前端渲染结果并支持导出。

## 技术栈

- 后端：Python + FastAPI
- 前端：React + TypeScript + Create React App + Tailwind CSS
- 文档解析：TextIn 通用文档解析 API
- 提取方式：规则与结构化字段解析

## 快速开始

### 1) 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
TEXTIN_APP_ID=your_app_id_here
TEXTIN_SECRET_CODE=your_secret_code_here
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
npm start
```

前端默认运行在 `http://localhost:3000`，已通过 `proxy` 代理到后端。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `TEXTIN_APP_ID` | 是 | TextIn 应用 ID |
| `TEXTIN_SECRET_CODE` | 是 | TextIn 应用密钥 |

## API 概览

### `POST /api/parse-document`

- 请求：`multipart/form-data`
  - `file`: 待解析文档
- 返回：

```json
{
  "status": "success",
  "markdown": "...",
  "tables": {
    "balanceSheet": [],
    "incomeStatement": [],
    "cashFlow": []
  }
}
```

## 目录结构

```text
financial-report-extract/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ FinancialReportDemo.tsx
│  │  └─ App.tsx
│  └─ package.json
├─ .env.example
└─ README.md
```

## 适用边界

- 适合：上市公司年报/季报/半年报等财报文档的结构化抽取。
- 建议：优先使用版式规范的 PDF 财报。
- 限制：本项目不做会计口径判断，不替代审计或投研结论。

## 合规与免责声明

- 请确保你有权处理上传文档，避免上传受限或敏感数据。
- 本项目输出仅作为数据处理结果，不构成财务、审计或投资建议。

## 参考资料

- 《上市公司信息披露管理办法》（证监会令第226号，2025-03-26 发布）：https://www.csrc.gov.cn/csrc/c101953/c7547359/content.shtml
- 巨潮资讯网：https://www.cninfo.com.cn/
