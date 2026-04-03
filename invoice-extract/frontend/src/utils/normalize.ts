import type { ExtractionResult, LineItem, TaxEntry, InvoiceTotals } from '../types/invoice';

/**
 * Coerce a value to a number, returning null if not possible.
 */
export function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Strip currency symbols and commas from amount strings, returning a number.
 */
export function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.\-]/g, '');
    if (cleaned === '') return null;
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Normalize date strings to ISO format YYYY-MM-DD if possible.
 */
export function normalizeDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return String(val);

  const s = val.trim();
  if (!s) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Try to parse common formats: MM/DD/YYYY, DD/MM/YYYY, DD-MMM-YYYY, etc.
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  // Return original if we can't parse
  return s;
}

/**
 * Normalize currency code to uppercase 3-letter code.
 */
export function normalizeCurrency(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return null;
  const s = val.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(s)) return s;

  // Map common symbols
  const symbolMap: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₽': 'RUB',
  };
  return symbolMap[s] ?? s;
}

/**
 * Normalize line items: parse amounts, remove TOTAL rows.
 */
function normalizeLineItems(items: LineItem[]): LineItem[] {
  return items
    .filter((item) => {
      const desc = (item.description ?? '').toString().toUpperCase().trim();
      return !['TOTAL', 'GRAND TOTAL', 'SUBTOTAL', 'SUB-TOTAL', 'SUB TOTAL'].includes(desc);
    })
    .map((item, idx) => ({
      ...item,
      line_number: item.line_number ?? idx + 1,
      quantity: toNumber(item.quantity),
      unit_price: parseAmount(item.unit_price),
      line_amount: parseAmount(item.line_amount),
      tax_rate: toNumber(item.tax_rate),
      tax_amount: parseAmount(item.tax_amount),
      discount: parseAmount(item.discount),
    }));
}

/**
 * Normalize totals: parse all amount fields.
 */
function normalizeTotals(totals: InvoiceTotals): InvoiceTotals {
  return {
    subtotal_amount: parseAmount(totals.subtotal_amount),
    discount_amount: parseAmount(totals.discount_amount),
    freight_amount: parseAmount(totals.freight_amount),
    insurance_amount: parseAmount(totals.insurance_amount),
    packing_amount: parseAmount(totals.packing_amount),
    other_charges_amount: parseAmount(totals.other_charges_amount),
    tax_amount: parseAmount(totals.tax_amount),
    rounding_amount: parseAmount(totals.rounding_amount),
    total_amount: parseAmount(totals.total_amount),
    amount_due: parseAmount(totals.amount_due),
  };
}

/**
 * Normalize tax entries.
 */
function normalizeTaxes(taxes: TaxEntry[]): TaxEntry[] {
  return taxes.map((tax) => ({
    ...tax,
    tax_rate: toNumber(tax.tax_rate),
    taxable_amount: parseAmount(tax.taxable_amount),
    tax_amount: parseAmount(tax.tax_amount),
  }));
}

/**
 * Main normalization function: runs post-processing on extraction result.
 */
export function normalizeExtraction(extraction: ExtractionResult): ExtractionResult {
  return {
    ...extraction,
    header: {
      ...extraction.header,
      invoice_date: normalizeDate(extraction.header?.invoice_date),
      due_date: normalizeDate(extraction.header?.due_date),
      currency: normalizeCurrency(extraction.header?.currency),
    },
    totals: normalizeTotals(extraction.totals ?? {}),
    line_items: normalizeLineItems(extraction.line_items ?? []),
    tax_summary: {
      ...extraction.tax_summary,
      taxes: normalizeTaxes(extraction.tax_summary?.taxes ?? []),
    },
  };
}
