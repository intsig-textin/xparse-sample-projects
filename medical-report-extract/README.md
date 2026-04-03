# 医疗报告抽取工具

> 面向中国大陆医疗文档结构化场景：支持检验/影像/病历等文档上传，自动抽取患者信息、诊断、检查指标、治疗与预后建议。

## 为什么做这个项目

在中国大陆医疗信息化场景里，检验报告、影像报告、病历首页、出院记录等数据大量沉淀在 PDF、扫描件、拍照件和历史归档文档中。很多材料版式不统一、清晰度不稳定，先把低质量文档稳定解析出来，才谈得上后续抽取、治理和共享。

公开政策背景：
- 国家卫生健康委于 `2018-12-03` 印发《电子病历系统应用水平分级评价管理办法（试行）》及评价标准（试行），持续推动以电子病历为核心的医疗机构信息化建设。
- 国家卫生健康委等 7 部门于 `2024-11-27` 印发《关于进一步推进医疗机构检查检验结果互认的指导意见》，提出到 `2025`、`2027`、`2030` 年分阶段推进互认，说明医疗文档标准化、结构化处理的价值正在持续提升。

## 当前能力（与代码一致）

- 支持上传：`JPG/JPEG/PNG/BMP/TIFF/WebP/PDF/DOC/DOCX`（最大 50MB）。
- TextIn 解析文档，返回 `markdown + pages`。
- 自动抽取标准化 JSON，核心包含 7 个顶层段：
  - `report_type`
  - `patient_info`
  - `report_info`
  - `diagnosis`
  - `examination`
  - `treatment`
  - `prognosis`
- 对检验指标（`exam_items`）和用药信息（`medications`）做数组化提取。
- 支持导出：
  - 解析结果 Markdown / JSON
  - 抽取结果 JSON

## 处理流程

1. 上传文档 -> `POST /api/parse`。
2. TextIn 返回 `markdown/pages`。
3. 前端触发 `POST /api/extract`。
4. 返回结构化 JSON。
5. 前端分区展示并支持导出。

## 技术栈

- 后端：Python + FastAPI
- 前端：React + Vite + Tailwind CSS
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
  "prompt": "医疗抽取提示词",
  "markdown": "..."
}
```

- 返回：

```json
{
  "code": 200,
  "result": {
    "llm_json": {},
    "raw_json": {}
  }
}
```

## 目录结构

```text
medical-report-extract/
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/api/
│  ├─ src/components/
│  ├─ src/constants.js
│  └─ src/App.jsx
├─ .env.example
└─ README.md
```

## 已知限制

- 当前版本以“结构化抽取 + 导出”能力为主，字段坐标联动定位暂未启用。
- 文档类型差异较大，建议在业务侧增加人工复核环节。
- 复杂影像结论或医疗判断不应由本工具直接替代临床决策。

## 合规与免责声明

- 请勿上传未脱敏或未经授权的敏感健康信息。
- 本项目输出仅作信息整理与数据处理辅助，不构成医疗建议或诊断意见。

## 参考资料

- 《关于印发电子病历系统应用水平分级评价管理办法（试行）及评价标准（试行）的通知》：https://www.nhc.gov.cn/yzygj/c100068/201812/b01f63185ef74a41afa30adeb5c58ccf.shtml
- 《关于进一步推进医疗机构检查检验结果互认的指导意见》：https://www.nhc.gov.cn/yzygj/c100068/202411/e26dde958ae74bf5b8f4fe97d83253c7.shtml
