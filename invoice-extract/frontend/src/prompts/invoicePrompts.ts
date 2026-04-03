import type { OcrResult } from '../types/invoice';

export const CLASSIFICATION_SYSTEM_PROMPT = `你是一个专业的发票文档分类器。请分析文档内容，判断是否为发票并识别子类型。
只输出JSON，禁止输出任何解释文字。`;

export const CLASSIFICATION_USER_PROMPT = `请判断以下文档是否为海外发票，输出严格的JSON格式：
{
  "is_invoice": true,
  "document_type": "invoice",
  "document_subtype": "commercial_invoice",
  "classification_reason": ["存在 Invoice No", "存在 seller/buyer", "存在 line items 与 total"],
  "estimated_line_count": 12,
  "warnings": []
}

document_subtype 枚举值：commercial_invoice | tax_invoice | service_invoice | proforma_invoice | debit_note | credit_note | supplier_invoice | freight_invoice | unknown_invoice | non_invoice

estimated_line_count：粗略估计发票明细行（line items）的数量，不含表头行和合计行，若无明细则填 0。

判别依据：
- 标题词：invoice / tax invoice / commercial invoice / proforma invoice
- 金额词：subtotal / total / amount due / tax amount
- 主体词：bill to / ship to / sold to / buyer / seller / consignee
- 表格词：qty / unit price / amount / description
- 税务词：VAT / GST / CGST / SGST / IGST
- 报关词：Incoterms / HS code / country of origin

若无足够证据则标记为 unknown_invoice 或 non_invoice。
只输出JSON，不输出任何解释。`;

const VALUE_FORMAT_RULE = `
【重要格式要求】
所有叶子字段的值必须使用以下格式（后端坐标匹配依赖此格式）：
- 有值时：{"value": "具体内容"}
- 无值时：{"value": null}
数组字段（如 taxes、line_items）保持数组形式，但数组内每个对象的叶子字段同样遵循上述格式。

输出示例：
{
  "invoice_number": {"value": "INV-2024-001"},
  "invoice_date": {"value": "2024-03-15"},
  "currency": {"value": "USD"},
  "due_date": {"value": null}
}`;

// Phase 2: Header fields (header / parties / shipping / payment / tax_summary / totals / extra_fields / evidence)
export const HEADER_EXTRACTION_PROMPT = `你是一名专业的海外发票结构化抽取专家。请从文档中抽取发票头字段信息。
${VALUE_FORMAT_RULE}

抽取规则：
1. 严禁臆造，文档中没有的字段输出 {"value": null}
2. 金额字段只返回数值字符串，不带货币符号
3. 货币单独返回3位代码如 USD/EUR/JPY/INR
4. 日期统一为 ISO 格式 YYYY-MM-DD，若无法确定则保留原值
5. 税率如 9% 统一为数值字符串 "9"
6. 只输出JSON，禁止输出任何解释文字

输出以下JSON结构：
{
  "header": {
    "invoice_number": {"value": null},
    "invoice_date": {"value": null},
    "due_date": {"value": null},
    "currency": {"value": null},
    "purchase_order_number": {"value": null},
    "order_reference": {"value": null},
    "reference_number": {"value": null},
    "customer_code": {"value": null},
    "account_number": {"value": null}
  },
  "parties": {
    "seller_name": {"value": null},
    "seller_address": {"value": null},
    "seller_tax_id": {"value": null},
    "seller_registration_id": {"value": null},
    "buyer_name": {"value": null},
    "buyer_address": {"value": null},
    "buyer_tax_id": {"value": null},
    "bill_to_name": {"value": null},
    "bill_to_address": {"value": null},
    "ship_to_name": {"value": null},
    "ship_to_address": {"value": null},
    "consignee_name": {"value": null},
    "consignee_address": {"value": null},
    "remit_to_name": {"value": null},
    "remit_to_address": {"value": null}
  },
  "shipping": {
    "incoterms": {"value": null},
    "shipment_method": {"value": null},
    "carrier": {"value": null},
    "awb_bl_number": {"value": null},
    "shipment_date": {"value": null},
    "delivery_date": {"value": null},
    "ship_from": {"value": null},
    "origin_country": {"value": null},
    "destination_country": {"value": null},
    "net_weight": {"value": null},
    "gross_weight": {"value": null},
    "volume_measure": {"value": null},
    "package_count": {"value": null},
    "carton_marks": {"value": null},
    "reason_for_export": {"value": null}
  },
  "payment": {
    "payment_terms": {"value": null},
    "payment_method": {"value": null},
    "bank_name": {"value": null},
    "bank_account": {"value": null},
    "swift_code": {"value": null},
    "iban": {"value": null},
    "amount_due": {"value": null},
    "amount_in_words": {"value": null}
  },
  "tax_summary": {
    "seller_tax_id": {"value": null},
    "buyer_tax_id": {"value": null},
    "place_of_supply": {"value": null},
    "reverse_charge_applicable": {"value": null},
    "taxes": [
      {
        "tax_type": {"value": null},
        "tax_rate": {"value": null},
        "taxable_amount": {"value": null},
        "tax_amount": {"value": null},
        "source_text": {"value": null}
      }
    ]
  },
  "totals": {
    "subtotal_amount": {"value": null},
    "discount_amount": {"value": null},
    "freight_amount": {"value": null},
    "insurance_amount": {"value": null},
    "packing_amount": {"value": null},
    "other_charges_amount": {"value": null},
    "tax_amount": {"value": null},
    "rounding_amount": {"value": null},
    "total_amount": {"value": null},
    "amount_due": {"value": null}
  },
  "extra_fields": {},
  "evidence": {
    "invoice_number": {"source_text": {"value": null}, "source_page": {"value": null}},
    "invoice_date": {"source_text": {"value": null}, "source_page": {"value": null}},
    "currency": {"source_text": {"value": null}, "source_page": {"value": null}},
    "seller_name": {"source_text": {"value": null}, "source_page": {"value": null}},
    "buyer_name": {"source_text": {"value": null}, "source_page": {"value": null}},
    "total_amount": {"source_text": {"value": null}, "source_page": {"value": null}},
    "tax_amount": {"source_text": {"value": null}, "source_page": {"value": null}}
  }
}`;

// Phase 3: Line items only
export const LINE_ITEMS_EXTRACTION_PROMPT = `你是一名专业的海外发票明细表抽取专家。请从文档中抽取所有商品或服务明细行。
${VALUE_FORMAT_RULE}

抽取规则：
1. 严禁臆造，文档中没有的字段输出 {"value": null}
2. 一条商品/服务对应一条 line item
3. TOTAL / GRAND TOTAL / Amount Due 等汇总行禁止进入 line_items
4. 跨行描述允许合并为同一条记录
5. 多页续表合并输出为完整数组
6. 金额只返回数值字符串，不带货币符号
7. 税率如 9% 统一为数值字符串 "9"
8. 只输出JSON，禁止输出任何解释文字

输出以下JSON结构：
{
  "line_items": [
    {
      "line_no": {"value": null},
      "description": {"value": null},
      "product_code": {"value": null},
      "buyer_part_no": {"value": null},
      "seller_part_no": {"value": null},
      "purchase_order": {"value": null},
      "hs_code": {"value": null},
      "origin_country": {"value": null},
      "quantity": {"value": null},
      "unit": {"value": null},
      "unit_price": {"value": null},
      "line_amount": {"value": null},
      "currency": {"value": null},
      "tax_rate": {"value": null},
      "tax_amount": {"value": null},
      "discount_amount": {"value": null},
      "net_weight": {"value": null},
      "gross_weight": {"value": null},
      "service_start_date": {"value": null},
      "service_end_date": {"value": null},
      "package_info": {"value": null},
      "raw_row_text": {"value": null},
      "source_page": {"value": null}
    }
  ]
}`;

export function buildClassificationPrompt(): string {
  return `${CLASSIFICATION_SYSTEM_PROMPT}\n\n${CLASSIFICATION_USER_PROMPT}`;
}
