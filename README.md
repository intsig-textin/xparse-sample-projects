# xparse-sample-projects

基于 [TextIn](https://www.textin.com) 文档解析 API 的结构化抽取示例项目集合，持续更新。每个子目录是一个独立可运行的工具。

## 项目目录

| 目录 | 项目名称 | 说明 |
|------|---------|------|
| [`bank-statement-extract/`](./bank-statement-extract/) | 银行流水抽取工具 | 支持 PDF/图片，分批抽取交易明细，含余额连续性校验与 JSON/CSV 导出 |
| [`invoice-extract/`](./invoice-extract/) | 海外发票抽取工具 | 支持 PDF/Word/图片，自动分类、抽取头部字段与明细行，含规则校验 |
| [`medical-report-extract/`](./medical-report-extract/) | 医疗报告抽取工具 | 支持扫描件与图片，抽取患者信息、诊断、检查指标、治疗与预后 |
| [`contract-review/`](./contract-review/) | 合同审查工具 | 条款风险审阅、规范审阅、主体识别，支持导出 Word 报告 |
| [`tender-doc-parse/`](./tender-doc-parse/) | 招标文件解析工具 | 按 6 大模块并发抽取基础信息、资格要求、评审要求等结构化字段 |
| [`financial-report-extract/`](./financial-report-extract/) | 财务三大表抽取工具 | 基于规则从财报 PDF 中提取资产负债表、利润表、现金流量表 |
| [`national-standard-parse/`](./national-standard-parse/) | 国家标准书知识库解析 | 上传 GB/GB-T 标准文件，按章节切分高质量 chunk，含原文位置高亮与条款检索，作为 RAG 知识库样板 |
| [`exam-extract/`](./exam-extract/) | 试卷题目智能抽取 | 上传 PDF/图片/Word 试卷，后端按 10 页一批送 LLM，SSE 实时推批次进度，输出题组结构与多格式导出 |

---

## bank-statement-extract · 银行流水抽取工具

面向财务审计、贷款审批、个人记账等场景。上传银行流水 PDF 或图片，OCR 解析完成后立即展示结果页，用户手动点击「AI 抽取」触发结构化提取。长流水表格自动按行数分批并发送给 LLM，各批结果流式追加到交易明细表。提取完成后进行余额连续性校验，支持导出 JSON 和 CSV。

**技术栈**：Python + FastAPI · React + Vite · TextIn 文档解析 · OpenAI 兼容接口

**启动方式**：

```bash
# 后端
cd bank-statement-extract/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd bank-statement-extract/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## invoice-extract · 海外发票抽取工具

面向跨境业务场景的发票结构化抽取工具。支持 PDF/Word/图片上传，自动分类发票类型，抽取头部字段、明细行，并进行金额一致性等规则校验。

**技术栈**：Python + FastAPI · React + TypeScript + Vite · TextIn 文档解析 · OpenAI 兼容接口

**启动方式**：

```bash
# 后端
cd invoice-extract/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd invoice-extract/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## medical-report-extract · 医疗报告抽取工具

面向医疗文档结构化场景。支持检验单、影像报告、出院小结等多种文档类型，针对扫描件和拍照件做了优化处理，抽取患者信息、诊断、检查指标、治疗与预后建议。

**技术栈**：Python + FastAPI · React + Vite · TextIn 文档解析 · OpenAI 兼容接口

**启动方式**：

```bash
# 后端
cd medical-report-extract/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd medical-report-extract/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## contract-review · 合同审查工具

面向合同初审场景。解析合同正文后并行执行条款风险审阅（责任、违约、知识产权、保密、争议解决）和规范审阅（错漏、一致性、格式、修订），自动识别甲乙方主体，支持导出 Word 审查报告。

**技术栈**：Python + FastAPI · React + Vite · TextIn 文档解析 · OpenAI 兼容接口

**启动方式**：

```bash
# 后端
cd contract-review/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd contract-review/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## tender-doc-parse · 招标文件解析工具

面向招采场景。将招标文件按标题切块并路由到 6 个模块（基础信息、资格要求、评审要求、投标要求、无效标风险、附件材料），各模块并发抽取，输出结构化 JSON，支持导出汇总结果。

**技术栈**：Python + FastAPI · React + TypeScript + Vite · TextIn 文档解析 · OpenAI 兼容接口

**启动方式**：

```bash
# 后端
cd tender-doc-parse/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd tender-doc-parse/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## financial-report-extract · 财务三大表抽取工具

面向财务分析、投研辅助场景。基于 TextIn 返回的结构化 `detail` 字段，通过规则自动定位并提取资产负债表、利润表、现金流量表，前端自动计算同比趋势，支持 CSV 导出。**无需大模型。**

**技术栈**：Python + FastAPI · React + TypeScript + Create React App · TextIn 文档解析

**启动方式**：

```bash
# 后端（仅需 TextIn 凭证，无需大模型配置）
cd financial-report-extract/backend
cp ../.env.example ../.env  # 填入 TEXTIN_APP_ID 和 TEXTIN_SECRET_CODE
pip install -r requirements.txt && python main.py

# 前端
cd financial-report-extract/frontend
npm install && npm start     # http://localhost:3000
```

---

## national-standard-parse · 国家标准书知识库解析

面向标准条款知识库 / RAG 检索场景。上传一份 GB/GB-T 标准 PDF 或 Word，后端调用 TextIn `pdf_to_markdown` 完成 OCR 后，立刻按 `outline_level` 切分章节级 chunk，前端三栏联动展示页面图、目录、Chunks、表格、图片、Markdown，任何一处选中都会在原图上高亮多边形定位。chunks 可一键导出 JSON，可直接喂给向量库建索引。`/api/extract` 留作 LLM 扩展口子（自动摘要、字段抽取等）。

**技术栈**：Python + FastAPI · React + Vite · Tailwind CSS · TextIn 文档解析 · OpenAI 兼容接口（可选）

**启动方式**：

```bash
# 后端
cd national-standard-parse/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd national-standard-parse/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## exam-extract · 试卷题目智能抽取

面向题库入库 / 智能阅卷场景。上传 PDF / 图片 / Word 试卷，OCR 完成后后端按 10 页一批送 LLM，跨批次保留题组延续上下文（continues_previous + group_id 全卷连续），通过 SSE 把每一批进度实时推回前端。识别出的题组可一键导出 JSON / Markdown / CSV。

**技术栈**：Python + FastAPI · React + Vite · Tailwind CSS · TextIn 文档解析 · OpenAI 兼容接口（默认 qwen-flash）

**启动方式**：

```bash
# 后端
cd exam-extract/backend
cp ../.env.example ../.env  # 填入凭证
pip install -r requirements.txt && python main.py

# 前端
cd exam-extract/frontend
npm install && npm run dev   # http://localhost:5173
```

---

## 申请 TextIn API

访问 [TextIn 开放平台](https://www.textin.com) 注册并获取 `App ID` 与 `Secret Code`。
