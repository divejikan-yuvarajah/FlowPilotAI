// ─── Balance ─────────────────────────────────────────────────────────────────

export interface SeylanBalance {
  balance: number;
  asOf: string;         // ISO-8601 timestamp
  currency: "LKR";
  accountNumber: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType = "credit" | "debit";

export type TransactionCategory =
  | "inventory"
  | "salaries"
  | "logistics"
  | "software"
  | "utilities"
  | "rent"
  | "marketing"
  | "taxes"
  | "client_payment"
  | "other";

export interface SeylanTransaction {
  id: string;
  postedAt: string;         // ISO-8601 timestamp
  type: TransactionType;
  amount: number;           // always positive; direction from `type`
  reference: string;        // bank reference number
  counterparty: string;     // name of paying/receiving party
  description: string;
  category?: TransactionCategory;
}

// ─── CEFTS (Common Electronic Fund Transfer Switch) ──────────────────────────

export interface CEFTSTransferRequest {
  toAccountNumber: string;
  toBankCode: string;       // e.g. "7072" = Seylan, "7010" = BOC
  toAccountName: string;
  amount: number;
  reference: string;        // max 35 chars
  narration: string;
}

export interface CEFTSTransferResult {
  transactionId: string;
  status: "success" | "failed" | "pending";
  failureReason?: string;
  processedAt: string;      // ISO-8601
  fee: number;              // CEFTS fee in LKR
}

// ─── JustPay payment link ─────────────────────────────────────────────────────

export interface JustPayLinkRequest {
  amount: number;
  description: string;
  expiresIn?: number;       // seconds, default 86400 (24h)
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerPhone?: string;
}

export interface JustPayLinkResult {
  linkId: string;
  url: string;              // https://justpay.lk/pay/<linkId>
  expiresAt: string;        // ISO-8601
  qrData?: string;          // QR payload for the same link
}

// ─── Merchant QR ─────────────────────────────────────────────────────────────

export interface MerchantQRRequest {
  amount: number;           // fixed amount, or 0 for open amount
  reference: string;
  merchantName: string;
  note?: string;
}

export interface MerchantQRResult {
  qrData: string;           // raw QR string (EMVCo / LankaPay format)
  imageUrl?: string;        // base64 PNG data-URL
  expiresAt: string;        // ISO-8601
}

// ─── Government Payments (EPF / ETF / VAT / IRD) ─────────────────────────────

export type GovtTaxType = "EPF" | "ETF" | "VAT" | "IRD";

export interface GovtPaymentRequest {
  taxType: GovtTaxType;
  amount: number;
  period: string;           // e.g. "2026-04" for April 2026
  reference: string;        // employer/taxpayer reference number
  narration?: string;
}

export interface GovtPaymentResult {
  paymentId: string;
  taxType: GovtTaxType;
  status: "success" | "failed";
  failureReason?: string;
  receiptNumber: string;
  processedAt: string;      // ISO-8601
  amount: number;
}

// ─── Unified client interface ─────────────────────────────────────────────────

export interface SeylanClient {
  getBalance(): Promise<SeylanBalance>;
  getTransactions(params?: {
    from?: string;
    to?: string;
    limit?: number;
    type?: TransactionType;
  }): Promise<SeylanTransaction[]>;
  transfer(request: CEFTSTransferRequest): Promise<CEFTSTransferResult>;
  createJustPayLink(request: JustPayLinkRequest): Promise<JustPayLinkResult>;
  createMerchantQR(request: MerchantQRRequest): Promise<MerchantQRResult>;
  payGovt(request: GovtPaymentRequest): Promise<GovtPaymentResult>;
}
