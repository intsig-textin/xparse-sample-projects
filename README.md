# xparse-sample-projects

基于 [TextIn](https://www.textin.com) 文档解析 API 的结构化抽取示例项目集合。每个子目录是一个独立可运行的工具，包含 Python FastAPI 后端与 React 前端。

## 项目目录

| 目录 | 项目名称 | 说明 |
|------|---------|------|
| [`invoice-extract/`](./invoice-extract/) | 海外发票抽取工具 | 支持 PDF/Word/图片，自动分类、抽取头部字段与明细行，含规则校验 |
| [`medical-report-extract/`](./medical-report-extract/) | 医疗报告抽取工具 | 支持扫描件与图片，抽取患者信息、诊断、检查指标、治疗与预后 |
| [`contract-review/`](./contract-review/) | 合同审查工具 | 条款风险审阅、规范审阅、主体识别，支持导出 Word 报告 |
| [`tender-doc-parse/`](./tender-doc-parse/) | 招标文件解析工具 | 按 6 大模块并发抽取基础信息、资格要求、评审要求等结构化字段 |
| [`financial-report-extract/`](./financial-report-extract/) | 财务三大表抽取工具 | 基于规则从财报 PDF 中提取资产负债表、利润表、现金流量表 |

## 技术架构

所有项目采用统一架构：

```
文档上传
  ↓
POST /api/parse  →  TextIn 文档解析 API（pdf_to_markdown）
  ↓
markdown 文本
  ↓
POST /api/extract  →  OpenAI 兼容大模型接口
  ↓
结构化 JSON 展示与导出
```

- **后端**：Python + FastAPI，统一在 `backend/` 目录
- **前端**：React + Vite（financial-report-extract 使用 Create React App），统一在 `frontend/` 目录
- **文档解析**：TextIn 通用文档解析 API（`/ai/service/v1/pdf_to_markdown`）
- **大模型**：OpenAI 兼容接口，默认配置 `qwen-plus`（financial-report-extract 不调用大模型）

## 快速开始

每个项目目录下有独立的 `README.md`，包含详细启动说明。通用步骤如下：

**1. 配置环境变量**

```bash
cd <项目目录>
cp .env.example .env
# 编辑 .env，填入 TextIn 和大模型 API 凭证
```

**2. 启动后端**

```bash
cd backend
pip install -r requirements.txt
python main.py
# 后端运行在 http://localhost:8000
```

**3. 启动前端**

```bash
cd frontend
npm install
npm run dev        # Vite 项目，访问 http://localhost:5173
# 或
npm start          # financial-report-extract（CRA），访问 http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 适用项目 |
|------|------|---------|
| `TEXTIN_APP_ID` | TextIn 应用 ID | 全部 |
| `TEXTIN_SECRET_CODE` | TextIn 应用密钥 | 全部 |
| `OPENAI_API_KEY` | 大模型接口密钥 | 除 financial-report-extract |
| `OPENAI_BASE_URL` | 大模型接口地址 | 除 financial-report-extract |
| `OPENAI_MODEL` | 模型名称，默认 `qwen-plus` | 除 financial-report-extract |

## 申请 TextIn API

访问 [TextIn 开放平台](https://www.textin.com) 注册并获取 `App ID` 与 `Secret Code`。
