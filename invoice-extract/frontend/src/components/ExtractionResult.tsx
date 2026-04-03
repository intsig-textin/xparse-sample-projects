import React, { useState, useCallback } from 'react';
import type {
  ExtractionResult,
  ClassificationResult,
  ValidationWarning,
  BoundingRegion,
  HighlightRect,
  LlmPageDimension,
} from '../types/invoice';
import { extractHighlightRects, getFirstPageIndex } from '../utils/coordinates';

interface ExtractionResultProps {
  extraction: ExtractionResult;
  classification: ClassificationResult;
  warnings: ValidationWarning[];
  rawJson: Record<string, unknown>;
  llmPages: LlmPageDimension[];
  onFieldClick: (highlight: HighlightRect, pageIndex: number) => void;
  onNoPosition: () => void;
  isLoadingMoreItems?: boolean;
}

// Subtype label map
const SUBTYPE_LABELS: Record<string, string> = {
  commercial_invoice: '商业发票',
  tax_invoice: '税务发票',
  service_invoice: '服务发票',
  proforma_invoice: '形式发票',
  debit_note: '借记单',
  credit_note: '贷记单',
  supplier_invoice: '供应商发票',
  freight_invoice: '运费发票',
  unknown_invoice: '未知发票类型',
  non_invoice: '非发票文档',
};

const SUBTYPE_COLORS: Record<string, string> = {
  commercial_invoice: 'bg-blue-100 text-blue-700',
  tax_invoice: 'bg-purple-100 text-purple-700',
  service_invoice: 'bg-teal-100 text-teal-700',
  proforma_invoice: 'bg-indigo-100 text-indigo-700',
  debit_note: 'bg-orange-100 text-orange-700',
  credit_note: 'bg-green-100 text-green-700',
  supplier_invoice: 'bg-cyan-100 text-cyan-700',
  freight_invoice: 'bg-sky-100 text-sky-700',
  unknown_invoice: 'bg-slate-100 text-slate-600',
  non_invoice: 'bg-red-100 text-red-700',
};

const WARNING_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-400' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
};

interface FieldRowProps {
  label: string;
  value: unknown;
  boundingRegions?: BoundingRegion[];
  llmPages: LlmPageDimension[];
  onFieldClick: (highlight: HighlightRect, pageIndex: number) => void;
  onNoPosition: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label,
  value,
  boundingRegions,
  llmPages,
  onFieldClick,
  onNoPosition,
}) => {
  if (value === null || value === undefined || value === '') return null;

  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

  const handleClick = useCallback(() => {
    if (!boundingRegions || boundingRegions.length === 0) {
      onNoPosition();
      return;
    }
    const rects = extractHighlightRects(boundingRegions, llmPages, label);
    if (rects.length === 0) {
      onNoPosition();
      return;
    }
    const firstRect = rects[0];
    onFieldClick(firstRect, firstRect.pageIndex);
  }, [boundingRegions, llmPages, label, onFieldClick, onNoPosition]);

  const hasPosition = boundingRegions && boundingRegions.length > 0;

  return (
    <div
      onClick={handleClick}
      className={`
        flex gap-3 py-2.5 px-3 rounded-lg transition-colors group
        ${hasPosition
          ? 'cursor-pointer hover:bg-indigo-50'
          : 'cursor-pointer hover:bg-slate-50'
        }
      `}
    >
      <span className="text-xs font-medium text-slate-400 w-36 flex-shrink-0 pt-0.5 group-hover:text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-700 flex-1 break-all">{displayValue}</span>
      {hasPosition && (
        <svg
          className="w-3.5 h-3.5 text-indigo-300 group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-slate-500">{icon}</span>
        <span className="text-sm font-semibold text-slate-700 flex-1">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-2">{children}</div>}
    </div>
  );
};

// Field label maps per section
const HEADER_LABELS: Record<string, string> = {
  invoice_number: '发票编号',
  invoice_date: '发票日期',
  due_date: '到期日期',
  currency: '货币',
  purchase_order_number: 'PO 号',
  order_reference: '订单参考',
  reference_number: '参考编号',
  customer_code: '客户编码',
  account_number: '账户编号',
};

const PARTIES_LABELS: Record<string, string> = {
  seller_name: '卖方名称',
  seller_address: '卖方地址',
  seller_tax_id: '卖方税号',
  seller_registration_id: '卖方注册号',
  buyer_name: '买方名称',
  buyer_address: '买方地址',
  buyer_tax_id: '买方税号',
  bill_to_name: '账单抬头',
  bill_to_address: '账单地址',
  ship_to_name: '收货方',
  ship_to_address: '收货地址',
  consignee_name: '收货人',
  consignee_address: '收货人地址',
  remit_to_name: '汇款方',
  remit_to_address: '汇款地址',
};

const SHIPPING_LABELS: Record<string, string> = {
  incoterms: '贸易条款',
  shipment_method: '运输方式',
  carrier: '承运商',
  awb_bl_number: '提单/运单号',
  shipment_date: '发货日期',
  delivery_date: '交货日期',
  ship_from: '发货地',
  origin_country: '原产地',
  destination_country: '目的地',
  net_weight: '净重',
  gross_weight: '毛重',
  volume_measure: '体积',
  package_count: '包装件数',
  carton_marks: '箱唛',
  reason_for_export: '出口原因',
};

const PAYMENT_LABELS: Record<string, string> = {
  payment_terms: '付款条款',
  payment_method: '付款方式',
  bank_name: '银行名称',
  bank_account: '银行账号',
  swift_code: 'SWIFT 代码',
  iban: 'IBAN',
  amount_due: '应付金额',
  amount_in_words: '大写金额',
};

const TOTALS_LABELS: Record<string, string> = {
  subtotal_amount: '小计',
  discount_amount: '折扣',
  freight_amount: '运费',
  insurance_amount: '保险费',
  packing_amount: '包装费',
  other_charges_amount: '其他费用',
  tax_amount: '税额',
  rounding_amount: '舍入',
  total_amount: '总金额',
  amount_due: '应付金额',
};

export const ExtractionResultPanel: React.FC<ExtractionResultProps> = ({
  extraction,
  classification,
  warnings,
  rawJson,
  llmPages,
  onFieldClick,
  onNoPosition,
  isLoadingMoreItems = false,
}) => {
  const [warningsOpen, setWarningsOpen] = useState(true);

  // Helper to get bounding regions from raw_json for a field.
  // Tries two paths:
  //   1. rawJson[sectionKey][fieldKey].bounding_regions  (direct {"value":...} leaf)
  //   2. rawJson.evidence[fieldKey].source_text.value.bounding_regions  (evidence section)
  const getBR = (sectionKey: string, fieldKey: string): BoundingRegion[] => {
    // Primary: direct field in its own section
    const section = rawJson[sectionKey];
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const field = (section as Record<string, unknown>)[fieldKey];
      if (field && typeof field === 'object' && !Array.isArray(field)) {
        const br = (field as Record<string, unknown>).bounding_regions;
        if (Array.isArray(br)) return br as BoundingRegion[];
      }
    }
    // Fallback: evidence[fieldKey].source_text.value.bounding_regions
    const evidenceRaw = rawJson['evidence'];
    if (evidenceRaw && typeof evidenceRaw === 'object' && !Array.isArray(evidenceRaw)) {
      const evEntry = (evidenceRaw as Record<string, unknown>)[fieldKey];
      if (evEntry && typeof evEntry === 'object' && !Array.isArray(evEntry)) {
        const sourceText = (evEntry as Record<string, unknown>)['source_text'];
        if (sourceText && typeof sourceText === 'object' && !Array.isArray(sourceText)) {
          const valueObj = (sourceText as Record<string, unknown>)['value'];
          if (valueObj && typeof valueObj === 'object' && !Array.isArray(valueObj)) {
            const br = (valueObj as Record<string, unknown>).bounding_regions;
            if (Array.isArray(br)) return br as BoundingRegion[];
          }
        }
      }
    }
    return [];
  };

  const renderSectionFields = (
    data: Record<string, unknown>,
    labels: Record<string, string>,
    sectionKey: string
  ) => {
    return Object.entries(labels).map(([key, label]) => {
      const value = data[key];
      if (value === null || value === undefined || value === '') return null;
      return (
        <FieldRow
          key={key}
          label={label}
          value={value}
          boundingRegions={getBR(sectionKey, key)}
          llmPages={llmPages}
          onFieldClick={onFieldClick}
          onNoPosition={onNoPosition}
        />
      );
    });
  };

  const subtypeLabel = SUBTYPE_LABELS[classification.document_subtype] ?? classification.document_subtype;
  const subtypeColor = SUBTYPE_COLORS[classification.document_subtype] ?? 'bg-slate-100 text-slate-600';

  const highWarnings = warnings.filter((w) => w.level === 'high');
  const medWarnings = warnings.filter((w) => w.level === 'medium');
  const lowWarnings = warnings.filter((w) => w.level === 'low');

  return (
    <div className="space-y-4 p-4">
      {/* Classification badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${subtypeColor}`}>
          {subtypeLabel}
        </span>
        {classification.is_invoice ? (
          <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            已识别为发票
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            非发票文档
          </span>
        )}
        {classification.classification_reason.length > 0 && (
          <span className="text-xs text-slate-400">
            {classification.classification_reason.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setWarningsOpen(!warningsOpen)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-semibold text-amber-700 flex-1">
              校验警告
              <span className="ml-2 text-xs font-normal">
                {highWarnings.length > 0 && (
                  <span className="text-red-600">{highWarnings.length} 高 </span>
                )}
                {medWarnings.length > 0 && (
                  <span className="text-amber-600">{medWarnings.length} 中 </span>
                )}
                {lowWarnings.length > 0 && (
                  <span className="text-blue-600">{lowWarnings.length} 低</span>
                )}
              </span>
            </span>
            <svg
              className={`w-4 h-4 text-amber-400 transition-transform duration-200 ${warningsOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {warningsOpen && (
            <div className="p-3 space-y-2">
              {warnings.map((w, idx) => {
                const colors = WARNING_COLORS[w.level];
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
                    <div>
                      <span className={`text-xs font-medium ${colors.text} mr-2`}>[{w.code}]</span>
                      <span className={`text-xs ${colors.text}`}>{w.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Header section */}
      <Section
        title="基本信息"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        {renderSectionFields(extraction.header as Record<string, unknown>, HEADER_LABELS, 'header')}
      </Section>

      {/* Parties section */}
      <Section
        title="交易方"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      >
        {renderSectionFields(extraction.parties as Record<string, unknown>, PARTIES_LABELS, 'parties')}
      </Section>

      {/* Totals section */}
      <Section
        title="金额汇总"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        {renderSectionFields(extraction.totals as Record<string, unknown>, TOTALS_LABELS, 'totals')}
      </Section>

      {/* Line items */}
      {(extraction.line_items?.length > 0 || isLoadingMoreItems) && (
        <Section
          title={
            isLoadingMoreItems
              ? `行项目 (${extraction.line_items?.length ?? 0} 条，加载中…)`
              : `行项目 (${extraction.line_items?.length ?? 0} 条)`
          }
          defaultOpen={(extraction.line_items?.length ?? 0) <= 10}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-2 py-2 font-medium text-slate-500 w-8">#</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-500">描述</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-500">数量</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-500">单价</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-500">金额</th>
                </tr>
              </thead>
              <tbody>
                {(extraction.line_items ?? []).map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      if (item.bounding_regions && item.bounding_regions.length > 0) {
                        const rects = extractHighlightRects(item.bounding_regions, llmPages, `行项目 ${idx + 1}`);
                        if (rects.length > 0) {
                          onFieldClick(rects[0], rects[0].pageIndex);
                        } else {
                          onNoPosition();
                        }
                      } else {
                        onNoPosition();
                      }
                    }}
                  >
                    <td className="px-2 py-2 text-slate-400">{item.line_number ?? idx + 1}</td>
                    <td className="px-2 py-2 text-slate-700 max-w-[200px] truncate" title={item.description ?? ''}>
                      {item.description ?? '-'}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {item.quantity ?? '-'}
                      {item.unit ? ` ${item.unit}` : ''}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {item.unit_price != null ? item.unit_price.toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-slate-700">
                      {item.line_amount != null ? item.line_amount.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Streaming loading indicator */}
            {isLoadingMoreItems && (
              <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100">
                <svg className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-xs text-indigo-500">正在加载更多明细行…</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Shipping section */}
      {Object.values(extraction.shipping ?? {}).some((v) => v !== null && v !== undefined) && (
        <Section
          title="物流运输"
          defaultOpen={false}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
        >
          {renderSectionFields(extraction.shipping as Record<string, unknown>, SHIPPING_LABELS, 'shipping')}
        </Section>
      )}

      {/* Payment section */}
      {Object.values(extraction.payment ?? {}).some((v) => v !== null && v !== undefined) && (
        <Section
          title="付款信息"
          defaultOpen={false}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        >
          {renderSectionFields(extraction.payment as Record<string, unknown>, PAYMENT_LABELS, 'payment')}
        </Section>
      )}

      {/* Tax summary */}
      {(extraction.tax_summary?.taxes?.length ?? 0) > 0 && (
        <Section
          title="税务汇总"
          defaultOpen={false}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        >
          <div className="px-3 py-2 space-y-2">
            {extraction.tax_summary?.place_of_supply && (
              <FieldRow
                label="供应地"
                value={extraction.tax_summary.place_of_supply}
                llmPages={llmPages}
                onFieldClick={onFieldClick}
                onNoPosition={onNoPosition}
              />
            )}
            {extraction.tax_summary?.taxes?.map((tax, idx) => (
              <div key={idx} className="text-xs p-2 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-600">{tax.tax_type ?? `税项 ${idx + 1}`}</span>
                {tax.tax_rate != null && (
                  <span className="ml-2 text-slate-400">税率: {tax.tax_rate}%</span>
                )}
                {tax.taxable_amount != null && (
                  <span className="ml-2 text-slate-400">
                    应税额: {typeof tax.taxable_amount === 'number' ? tax.taxable_amount.toLocaleString() : tax.taxable_amount}
                  </span>
                )}
                {tax.tax_amount != null && (
                  <span className="ml-2 font-medium text-slate-700">
                    税额: {typeof tax.tax_amount === 'number' ? tax.tax_amount.toLocaleString() : tax.tax_amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Extra fields */}
      {extraction.extra_fields && Object.keys(extraction.extra_fields).length > 0 && (
        <Section
          title="其他字段"
          defaultOpen={false}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
        >
          {Object.entries(extraction.extra_fields).map(([key, val]) => (
            <FieldRow
              key={key}
              label={key}
              value={val}
              llmPages={llmPages}
              onFieldClick={onFieldClick}
              onNoPosition={onNoPosition}
            />
          ))}
        </Section>
      )}
    </div>
  );
};
