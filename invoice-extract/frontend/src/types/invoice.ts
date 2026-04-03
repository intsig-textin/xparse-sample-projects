// ─── OCR Types ────────────────────────────────────────────────────────────────

export interface OcrPageContent {
  pos: number[];
  text: string;
  type?: string;
}

export interface OcrPage {
  image_id: string;
  page_id?: number;
  content: OcrPageContent[];
  width?: number;
  height?: number;
}

export interface OcrResult {
  markdown: string;
  pages: OcrPage[];
}

// ─── LLM Classification Types ─────────────────────────────────────────────────

export type DocumentSubtype =
  | 'commercial_invoice'
  | 'tax_invoice'
  | 'service_invoice'
  | 'proforma_invoice'
  | 'debit_note'
  | 'credit_note'
  | 'supplier_invoice'
  | 'freight_invoice'
  | 'unknown_invoice'
  | 'non_invoice';

export interface ClassificationResult {
  is_invoice: boolean;
  document_type: string;
  document_subtype: DocumentSubtype;
  classification_reason: string[];
  estimated_line_count: number;
  warnings: string[];
}

// ─── LLM Extraction Types ─────────────────────────────────────────────────────

export interface BoundingRegion {
  page_id?: number;    // 1-based, returned by backend
  page_index?: number; // 0-based array index, legacy/unused
  position?: number[];
  value?: string;
  char_pos?: unknown[];
}

export interface ExtractedField {
  value?: string | number | null;
  bounding_regions?: BoundingRegion[];
  source_text?: string | null;
  source_page?: number | null;
  [key: string]: unknown;
}

export interface TaxEntry {
  tax_type?: string | null;
  tax_rate?: number | null;
  taxable_amount?: number | null;
  tax_amount?: number | null;
  [key: string]: unknown;
}

export interface LineItem {
  line_number?: number | null;
  description?: string | null;
  hs_code?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  line_amount?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  discount?: number | null;
  origin_country?: string | null;
  bounding_regions?: BoundingRegion[];
  [key: string]: unknown;
}

export interface InvoiceHeader {
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  purchase_order_number?: string | null;
  order_reference?: string | null;
  reference_number?: string | null;
  customer_code?: string | null;
  account_number?: string | null;
}

export interface InvoiceParties {
  seller_name?: string | null;
  seller_address?: string | null;
  seller_tax_id?: string | null;
  seller_registration_id?: string | null;
  buyer_name?: string | null;
  buyer_address?: string | null;
  buyer_tax_id?: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  ship_to_name?: string | null;
  ship_to_address?: string | null;
  consignee_name?: string | null;
  consignee_address?: string | null;
  remit_to_name?: string | null;
  remit_to_address?: string | null;
}

export interface InvoiceShipping {
  incoterms?: string | null;
  shipment_method?: string | null;
  carrier?: string | null;
  awb_bl_number?: string | null;
  shipment_date?: string | null;
  delivery_date?: string | null;
  ship_from?: string | null;
  origin_country?: string | null;
  destination_country?: string | null;
  net_weight?: string | null;
  gross_weight?: string | null;
  volume_measure?: string | null;
  package_count?: number | null;
  carton_marks?: string | null;
  reason_for_export?: string | null;
}

export interface InvoicePayment {
  payment_terms?: string | null;
  payment_method?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  amount_due?: number | null;
  amount_in_words?: string | null;
}

export interface TaxSummary {
  seller_tax_id?: string | null;
  buyer_tax_id?: string | null;
  place_of_supply?: string | null;
  reverse_charge_applicable?: boolean | null;
  taxes?: TaxEntry[];
}

export interface InvoiceTotals {
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  freight_amount?: number | null;
  insurance_amount?: number | null;
  packing_amount?: number | null;
  other_charges_amount?: number | null;
  tax_amount?: number | null;
  rounding_amount?: number | null;
  total_amount?: number | null;
  amount_due?: number | null;
}

export interface EvidenceEntry {
  source_text?: string | null;
  source_page?: number | null;
  bounding_regions?: BoundingRegion[];
}

export interface InvoiceEvidence {
  invoice_number?: EvidenceEntry;
  invoice_date?: EvidenceEntry;
  currency?: EvidenceEntry;
  seller_name?: EvidenceEntry;
  buyer_name?: EvidenceEntry;
  total_amount?: EvidenceEntry;
  tax_amount?: EvidenceEntry;
}

export interface ExtractionResult {
  header: InvoiceHeader;
  parties: InvoiceParties;
  shipping: InvoiceShipping;
  payment: InvoicePayment;
  tax_summary: TaxSummary;
  totals: InvoiceTotals;
  line_items: LineItem[];
  extra_fields: Record<string, unknown>;
  evidence: InvoiceEvidence;
}

// ─── LLM Response Types ───────────────────────────────────────────────────────

export interface LlmPageDimension {
  width: number;
  height: number;
  page_index?: number;
}

export interface LlmApiResponse {
  result?: {
    llm_json?: string | ExtractionResult | ClassificationResult;
    raw_json?: Record<string, unknown>;
    pages?: LlmPageDimension[];
  };
  code?: number;
  message?: string;
}

// ─── Validation Types ─────────────────────────────────────────────────────────

export type WarningLevel = 'high' | 'medium' | 'low';

export type WarningCode =
  | 'MISSING_TOTAL'
  | 'MISSING_INVOICE_NUMBER'
  | 'MISSING_DATE'
  | 'MISSING_CURRENCY'
  | 'MISSING_PARTIES'
  | 'TOTAL_MISMATCH'
  | 'LINE_TOTAL_MISMATCH'
  | 'FEW_LINE_ITEMS';

export interface ValidationWarning {
  code: WarningCode;
  level: WarningLevel;
  message: string;
}

// ─── App State Types ──────────────────────────────────────────────────────────

export type ProcessingStep =
  | 'idle'
  | 'uploading'
  | 'ocr'
  | 'classify'
  | 'extract'
  | 'validate'
  | 'done'
  | 'error';

export interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}

export interface PageImage {
  imageId: string;
  blobUrl: string;
  pageIndex: number;
  width?: number;
  height?: number;
}

export interface AppResult {
  ocrResult: OcrResult;
  classification: ClassificationResult;
  extraction: ExtractionResult;
  rawJson: Record<string, unknown>;
  llmPages: LlmPageDimension[];
  pageImages: PageImage[];
  warnings: ValidationWarning[];
  markdown: string;
  isLoadingMoreItems: boolean;
}

// ─── Highlight Types ──────────────────────────────────────────────────────────

export interface HighlightRect {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldLabel?: string;
}
