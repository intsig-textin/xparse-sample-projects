@'
content = r'''# 招标文件解析 Demo（前端）

本项目为招标文件智能抽取 Demo 的前端页面，支持上传招标 PDF，调用 TextIn 试用 OCR 转 Markdown，再按 6 大业务模块并行调用 LLM 后端抽取结构化信息并可视化展示。

## 功能概览

- PDF 上传与预览（本地预览，支持拖拽/点击上传）
- TextIn 试用 OCR → Markdown 解析
- Markdown 按标题切分并自动归类 6 大模块
- 6 模块并行 LLM 抽取（展示实时进度与日志）
- 结构化结果可视化（表格/列表/文本/Markdown 渲染）
- 一键导出 JSON 结果

## 快速启动

```bash
npm install
npm run dev
```

默认通过 Vite Proxy 访问后端：
- LLM 后端：`http://localhost:8081`

## 使用流程（前端操作）

1. 打开页面，点击或拖拽上传 PDF（前端限制：PDF、最大 50MB）。
2. 点击“开始智能处理”。
3. 系统流程：
   - 调用 TextIn 试用接口进行 OCR → Markdown；
   - Markdown 按标题切分成块；
   - 通过关键词归类到 6 个业务模块；
   - 并行调用 LLM 后端抽取结构化内容。
4. 在“处理进度流”中查看每个模块状态；完成后点击“查看”。
5. 在结果页切换模块查看结构化信息；右侧可预览 PDF。
6. 点击“导出 JSON”下载抽取结果。

## 抽取模块说明

- 基础信息
- 资格要求
- 评审要求
- 投标要求
- 无效标风险
- 附件材料

模块与栏目配置见：`src/constants/tenderModules.ts`

## 数据与接口

前端主要调用两类接口：

1. TextIn 试用 OCR（PDF → Markdown）
   - 代码位置：`src/App.tsx` 中 `callTextInTrialParse`
   - 默认直连：`https://api.textin.com/home/user_trial_ocr`
   - 可选代理：`/textin`（Vite 已配置）

2. LLM 后端抽取
   - 接口：`/ai/service/llm_extraction?stream=0`
   - 代理：`/ai` → `http://localhost:8081`
   - 请求体包含：`prompt`、`model`、`ocr.result.markdown`、`ocr.result.pages`

## 接口返回示例（LLM 后端）

以下为 `后端服务JSON返回示例.json` 的精简示例（节选）：

```json
{
  "code": 200,
  "message": "success",
  "result": {
    "version": "v1.1.10",
    "llm_json": {
      "module_key": "submission",
      "module_name": "投标文件要求",
      "sections": {
        "bid_document": {
          "title": "投标文件",
          "blocks": [
            {
              "type": "list",
              "title": "投标文件组成",
              "items": [
                { "key": "1", "label": "投标函及投标函附录", "value": "" },
                { "key": "2", "label": "法定代表人身份证明或授权委托书", "value": "" }
              ]
            }
          ]
        },
        "bidding": {
          "title": "投标",
          "blocks": [
            { "type": "text", "title": "投标截止时间", "value": "..." }
          ]
        }
      }
    }
  }
}
```

## Prompt 文件

每个模块的提示词放在：`public/prompt/`

文件命名规则：
- `basic_prompt.txt`
- `qualification_prompt.txt`
- `evaluation_prompt.txt`
- `submission_prompt.txt`
- `invalid_risk_prompt.txt`
- `annex_prompt.txt`

前端运行时按模块自动加载对应 prompt。

## 部署说明

前端为 Vite 构建的静态站点，部署时需要保证 LLM 后端可访问。

1. 构建

```bash
npm install
npm run build
```

2. 部署静态文件

将 `frontend/dist/` 部署到任意静态服务器（如 Nginx/Apache/CDN）。
生产环境建议配置反向代理，将 `/ai` 转发至后端服务：

```
/ai  ->  http://<LLM后端地址>
```

如果需要通过代理访问 TextIn，可同时配置 `/textin` 代理到 `https://api.textin.com`。

## 目录结构（关键部分）

```
frontend/
  src/
    App.tsx                  # 主页面与核心流程
    constants/tenderModules.ts
    utils/parser.ts          # Markdown 切分与模块归类逻辑（历史版本）
  public/
    prompt/                  # 各模块 prompt 文件
```

## 注意事项

- TextIn 试用接口存在 IP 限流；如需稳定使用建议切换正式接口或使用自建服务。
- 如果需要走代理访问 TextIn，可在 `App.tsx` 中将 `TRIAL_API_URL` 改为 `/textin/...`。
- 当前前端包含对“历史 LLM JSON 结构”的兼容逻辑（`normalizeSectionsFromRaw`）。

## 常见问题

- 页面一直停在“处理中”
  - 检查后端是否在 `http://localhost:8081` 正常运行。

- prompt 读取失败
  - 确认 `public/prompt/` 下对应模块文件存在且命名正确。

- PDF 无法预览
  - 浏览器可能阻止本地 objectURL 预览，尝试刷新或重新上传。
'''

with open(r'd:\DEMO\zhaobiao\frontend\README.md', 'w', encoding='utf-8') as f:
    f.write(content)
'@ | python -