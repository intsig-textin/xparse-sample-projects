// LLM API endpoint (proxied to backend)
export const LLM_EXTRACTION_URL = '/api/extract'
export const LLM_MODEL = 'qwen-plus'

// Accepted file types
export const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// LLM Extraction Prompt
export const LLM_PROMPT = `你是专业医疗文档信息提取专家，擅长处理各类医疗报告（检验报告、影像报告、门诊/住院病历、诊断证明、手术记录、出院小结、体检报告、医嘱单、随访记录等）。

## 任务
分析下方医疗文档，识别报告类型，提取所有有价值的关键信息，输出结构化 JSON。

## 顶层结构（固定7个英文 key）
{
  "report_type": {"value": "报告类型，中文，尽量具体"},
  "patient_info":  { /* 患者基本信息 */ },
  "report_info":   { /* 报告标识、机构、医生、时间等 */ },
  "diagnosis":     { /* 诊断、主诉、现病史、体征等 */ },
  "examination":   { /* 检查/检验详情 */ },
  "treatment":     { /* 治疗、手术、用药等 */ },
  "prognosis":     { /* 预后、出院医嘱、随访建议等 */ }
}

## 【重要】值格式规范
所有叶子字段的值必须用 {"value": "..."} 包裹：
- 有值时：{"value": "具体内容"}
- 无值/文档中未提及时：{"value": null}

示例（正确格式）：
{
  "report_type": {"value": "血常规检验报告"},
  "patient_info": {
    "患者姓名": {"value": "张三"},
    "性别": {"value": "男"},
    "年龄": {"value": "56岁"},
    "住院号": {"value": null}
  },
  "report_info": {
    "医疗机构": {"value": "湖南省岳阳县人民医院"},
    "报告日期": {"value": "2024-11-01"}
  }
}

## 字段规则
1. 顶层 7 个 key 使用英文（固定不变），各节内部字段名一律使用中文
2. 根据报告实际内容决定每节包含哪些字段——该报告类型中有价值的信息都应提取，不要遗漏
3. 文档中不涉及的顶层节可省略；不要捏造原文中没有的信息
4. 只输出纯 JSON，不要输出任何解释文字或 markdown 代码块标记

## 两类特殊字段（必须遵守格式）

**检验指标表格** → 放入 examination.exam_items（数组，key 固定为英文 exam_items）
每行字段名用中文，每个值同样用 {"value": "..."} 包裹，根据表格实际列决定字段，但必须包含名称和结果：
{"名称": {"value": "血红蛋白"}, "结果": {"value": "135"}, "单位": {"value": "g/L"}, "参考范围": {"value": "120-160"}, "状态": {"value": "正常"}}
注意：必须完整提取表格每一行，绝对不能遗漏任何检验项目。

**用药信息** → 放入 treatment.medications（数组，key 固定为英文 medications）
每项字段名用中文，每个值用 {"value": "..."} 包裹：
{"药品名称": {"value": "阿莫西林"}, "用法用量": {"value": "0.5g"}, "给药途径": {"value": "口服"}, "疗程": {"value": "7天"}}
注意：如有多种药物，必须全部列出。`

// Section labels for display
export const SECTION_LABELS = {
  patient_info: '患者信息',
  report_info: '报告信息',
  diagnosis: '诊断信息',
  examination: '检查项目',
  treatment: '治疗信息',
  prognosis: '预后信息',
}

// Field labels map
export const FIELD_LABELS = {
  name: '患者姓名',
  gender: '性别',
  age: '年龄',
  birth_date: '出生日期',
  id_number: '身份证号',
  patient_id: '患者ID/病历号',
  contact: '联系方式',
  past_medical_history: '既往病史',
  allergy_history: '过敏史',
  family_history: '家族史',
  report_id: '报告编号',
  institution: '医疗机构',
  department: '科室',
  attending_doctor: '主治医生',
  report_doctor: '报告医生',
  review_doctor: '审核医生',
  report_date: '报告日期',
  exam_date: '检查日期',
  visit_date: '就诊日期',
  admission_date: '入院日期',
  discharge_date: '出院日期',
  hospitalization_days: '住院天数',
  primary_diagnosis: '主要诊断',
  secondary_diagnoses: '次要诊断',
  complications: '并发症',
  icd_code: 'ICD-10编码',
  chief_complaint: '主诉',
  present_illness: '现病史',
  physical_exam: '体格检查',
  temperature: '体温',
  pulse: '脉搏',
  respiration: '呼吸',
  blood_pressure: '血压',
  other: '其他体征',
  exam_name: '检查项目',
  exam_part: '检查部位',
  exam_method: '检查方法',
  exam_items: '检验指标',
  imaging_findings: '影像所见',
  exam_conclusion: '检查结论',
  surgery: '手术信息',
  surgery_name: '手术名称',
  surgery_date: '手术日期',
  surgery_method: '手术方式',
  anesthesia: '麻醉方式',
  blood_loss: '术中出血量',
  duration: '手术时长',
  post_op_diagnosis: '术后诊断',
  medications: '用药信息',
  other_treatment: '其他治疗',
  condition_at_discharge: '出院时情况',
  discharge_advice: '出院医嘱',
  follow_up: '随访建议',
  recheck_time: '复查时间',
  prognosis: '预后评估',
  report_type: '报告类型',
}
