import type {
  ExtractionResult,
  ValidationWarning,
  WarningCode,
  WarningLevel,
} from '../types/invoice';

function warn(code: WarningCode, level: WarningLevel, message: string): ValidationWarning {
  return { code, level, message };
}

function safeNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const TOLERANCE = 0.01; // 1%

function withinTolerance(a: number, b: number): boolean {
  if (b === 0) return Math.abs(a) < 0.01;
  return Math.abs(a - b) / Math.abs(b) <= TOLERANCE;
}

export function validateExtraction(
  extraction: ExtractionResult,
  pageCount: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const totals = extraction.totals ?? {};
  const header = extraction.header ?? {};
  const parties = extraction.parties ?? {};
  const lineItems = extraction.line_items ?? [];

  // 1. Missing total_amount
  if (safeNum(totals.total_amount) === null && safeNum(totals.amount_due) === null) {
    warnings.push(warn('MISSING_TOTAL', 'high', '未找到发票总金额（total_amount / amount_due）'));
  }

  // 2. Missing invoice_number
  if (!header.invoice_number) {
    warnings.push(warn('MISSING_INVOICE_NUMBER', 'high', '未找到发票编号（invoice_number）'));
  }

  // 3. Missing invoice_date
  if (!header.invoice_date) {
    warnings.push(warn('MISSING_DATE', 'medium', '未找到发票日期（invoice_date）'));
  }

  // 4. Missing currency
  if (!header.currency) {
    warnings.push(warn('MISSING_CURRENCY', 'medium', '未找到货币类型（currency）'));
  }

  // 5. Missing both seller and buyer
  const hasSeller =
    !!(parties.seller_name || parties.bill_to_name || parties.remit_to_name);
  const hasBuyer =
    !!(parties.buyer_name || parties.ship_to_name || parties.consignee_name);
  if (!hasSeller && !hasBuyer) {
    warnings.push(warn('MISSING_PARTIES', 'medium', '未找到卖方或买方信息（seller_name / buyer_name）'));
  }

  // 6. Line items sum vs subtotal
  if (lineItems.length > 0 && safeNum(totals.subtotal_amount) !== null) {
    const lineSum = lineItems.reduce((acc, item) => {
      const amt = safeNum(item.line_amount);
      return acc + (amt ?? 0);
    }, 0);
    const subtotal = safeNum(totals.subtotal_amount)!;
    if (!withinTolerance(lineSum, subtotal)) {
      warnings.push(
        warn(
          'LINE_TOTAL_MISMATCH',
          'medium',
          `行项目合计 ${lineSum.toFixed(2)} 与小计 ${subtotal.toFixed(2)} 不一致（超出 1% 容差）`
        )
      );
    }
  }

  // 7. subtotal + tax + freight + insurance - discount vs total_amount
  const subtotal = safeNum(totals.subtotal_amount);
  const totalAmount = safeNum(totals.total_amount) ?? safeNum(totals.amount_due);
  if (subtotal !== null && totalAmount !== null) {
    const taxAmt = safeNum(totals.tax_amount) ?? 0;
    const freightAmt = safeNum(totals.freight_amount) ?? 0;
    const insuranceAmt = safeNum(totals.insurance_amount) ?? 0;
    const packingAmt = safeNum(totals.packing_amount) ?? 0;
    const otherAmt = safeNum(totals.other_charges_amount) ?? 0;
    const discountAmt = safeNum(totals.discount_amount) ?? 0;
    const roundingAmt = safeNum(totals.rounding_amount) ?? 0;

    const computed = subtotal + taxAmt + freightAmt + insuranceAmt + packingAmt + otherAmt - discountAmt + roundingAmt;

    if (!withinTolerance(computed, totalAmount)) {
      warnings.push(
        warn(
          'TOTAL_MISMATCH',
          'high',
          `计算总额 ${computed.toFixed(2)} 与发票总额 ${totalAmount.toFixed(2)} 不一致（超出 1% 容差）`
        )
      );
    }
  }

  // 8. Multi-page invoice with few line items
  if (pageCount > 2 && lineItems.length < 2) {
    warnings.push(
      warn(
        'FEW_LINE_ITEMS',
        'low',
        `发票共 ${pageCount} 页，但仅抽取到 ${lineItems.length} 条行项目，请检查是否有遗漏`
      )
    );
  }

  return warnings;
}
