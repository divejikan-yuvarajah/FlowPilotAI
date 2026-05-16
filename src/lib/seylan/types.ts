/**
 * FlowPilot AI — Seylan Bank type definitions.
 *
 * Unified shape used by BOTH the live client (real Seylan sandbox)
 * and the simulator. New shape introduced for live integration.
 */

// ─── Account ──────────────────────────────────────────────────────────────────

export interface SeylanBalance {
  balance: number;          // current available balance
  ledgerBalance: number;    // total ledger balance
  currency: string;         // e.g. "LKR"
  accountNumber: string;    // masked: "****1234"
  accountHolder?: string;   // customer full name
  asOf: string;             // ISO timestamp
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType = "credit" | "debit";

/**
 * Legacy category type (kept for fixture/seed compatibility). Live Seylan API
 * does not categorise — categorisation happens server-side via the AI engine.
 */
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
  | "other"
  | string;

export interface SeylanTransaction {
  id: string;                       // unique event key from Seylan
  postedAt: string;                 // ISO timestamp
  type: TransactionType;
  amount: number;                   // positive; direction is in `type`
  balanceAfter?: number;
  reference?: string;
  description?: string;
  counterparty?: string | null;
  transactionCode?: string;
  valueDate?: string;
  category?: TransactionCategory;   // legacy: only present in fixtures
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export interface TransferResult {
  status: "completed" | "failed" | "pending";
  externalRef?: string;
  transactionId?: string;
  approvalNumber?: string;
  completedAt?: string;
  reason?: string;
  code?: string;
  responseDesc?: string;
}

export interface CEFTSTransferRequest {
  userId: string;
  destinationAccount?: string;
  destinationBankCode?: string;
  recipientName: string;
  amount: number;
  reference: string;
}

export interface InternalTransferRequest {
  userId: string;
  destinationAccount?: string;
  amount: number;
  reference: string;
  sourceNarration?: string;
  destNarration?: string;
}

// ─── JustPay (simulator-only) ─────────────────────────────────────────────────

export interface JustPayLinkRequest {
  amount: number;
  description?: string;
  expiresIn?: number;          // seconds
  customerEmail?: string;
  customerPhone?: string;
}

export interface JustPayLinkResult {
  paymentLink: string;
  expiresAt: string;
  qrPayload?: string;
  // Legacy aliases (kept for backward-compat with existing callers)
  url?: string;
  linkId?: string;
  qrData?: string;
}

// ─── Merchant QR (simulator-only) ─────────────────────────────────────────────

export interface MerchantQRRequest {
  amount: number;
  reference?: string;
  merchantName: string;
  note?: string;
}

export interface MerchantQRResult {
  qrImageUrl: string;
  qrPayload: string;
  // Legacy aliases
  qrData?: string;
  expiresAt?: string;
}

// ─── Government payments (simulator-only) ─────────────────────────────────────

export type GovtTaxType = "EPF" | "ETF" | "VAT" | "IRD";

export interface GovtPaymentRequest {
  taxType: GovtTaxType;
  amount: number;
  period: string;
  reference: string;
}

export interface GovtPaymentResult {
  paymentId: string;
  taxType: GovtTaxType;
  status: "success" | "failed";
  receiptNumber: string;
  processedAt: string;
  amount: number;
  failureReason?: string;
}
