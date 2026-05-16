/**
 * Seylan Bank Simulator
 *
 * Realistic in-memory simulation used as both:
 *   (a) the default when SEYLAN_MODE=simulator
 *   (b) the fallback when SEYLAN_MODE=live but the sandbox is unreachable
 *
 * The virtual balance burns down at ~LKR 18,500/day to demo the
 * cash-flow stress scenario in the War Room.
 *
 * Exports MATCH the live client interface (named functions), so the
 * router can swap implementations without consumer changes.
 */

import type {
  SeylanBalance,
  SeylanTransaction,
  TransferResult,
  CEFTSTransferRequest,
  InternalTransferRequest,
  JustPayLinkRequest,
  JustPayLinkResult,
  MerchantQRRequest,
  MerchantQRResult,
  GovtPaymentRequest,
  GovtPaymentResult,
} from "./types";
import getFixtureTransactions from "./fixtures/transactions";

// ─── Virtual balance ──────────────────────────────────────────────────────────

const INITIAL_BALANCE = 1_247_500;
const BURN_RATE_PER_DAY = 18_500;
const BURN_RATE_PER_MS = BURN_RATE_PER_DAY / (24 * 60 * 60 * 1000);

const ACCOUNT_NUMBER = "0290-1006-1247";
const BANK_CODE = "7287";

const _startTime = Date.now();

function getCurrentBalance(): number {
  const elapsed = Date.now() - _startTime;
  return Math.max(0, INITIAL_BALANCE - Math.floor(elapsed * BURN_RATE_PER_MS));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function simId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

function futureIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function shortDelay(): Promise<void> {
  return new Promise((res) =>
    setTimeout(res, 120 + Math.floor(Math.random() * 230)),
  );
}

// ─── Live-compatible exports ──────────────────────────────────────────────────

export async function getBalance(_userId?: string): Promise<SeylanBalance> {
  await shortDelay();
  const bal = getCurrentBalance();
  return {
    balance: bal,
    ledgerBalance: bal + 25_000, // simulate float
    currency: "LKR",
    accountNumber: `****${ACCOUNT_NUMBER.slice(-4)}`,
    accountHolder: "FlowPilot AI Demo Business (Pvt) Ltd",
    asOf: nowIso(),
  };
}

export async function listTransactions(
  _userId?: string,
  options?: {
    numberOfTransactions?: number;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<SeylanTransaction[]> {
  await shortDelay();
  let txns = getFixtureTransactions();

  if (options?.startDate) {
    const from = options.startDate.getTime();
    txns = txns.filter((t) => new Date(t.postedAt).getTime() >= from);
  }
  if (options?.endDate) {
    const to = options.endDate.getTime();
    txns = txns.filter((t) => new Date(t.postedAt).getTime() <= to);
  }
  const limit = options?.numberOfTransactions ?? 100;
  return txns.slice(0, limit);
}

export async function initiateCEFTSTransfer(
  args: CEFTSTransferRequest,
): Promise<TransferResult> {
  await shortDelay();
  if (args.amount > getCurrentBalance()) {
    return {
      status: "failed",
      reason: "Insufficient funds (simulator)",
      code: "SIM-INSUFFICIENT",
    };
  }
  return {
    status: "completed",
    externalRef: simId("CEFTS-SIM"),
    transactionId: simId("TXN"),
    approvalNumber: Math.floor(100000 + Math.random() * 900000).toString(),
    completedAt: nowIso(),
    responseDesc: "Simulated CEFTS transfer completed",
  };
}

export async function initiateInternalTransfer(
  args: InternalTransferRequest,
): Promise<TransferResult> {
  await shortDelay();
  if (args.amount > getCurrentBalance()) {
    return {
      status: "failed",
      reason: "Insufficient funds (simulator)",
      code: "SIM-INSUFFICIENT",
    };
  }
  return {
    status: "completed",
    externalRef: simId("INT-SIM"),
    completedAt: nowIso(),
    responseDesc: "Simulated internal transfer completed",
  };
}

// ─── Simulator-only flows ─────────────────────────────────────────────────────

export async function generateJustPayLink(
  request: JustPayLinkRequest,
): Promise<JustPayLinkResult> {
  await shortDelay();
  const linkId = simId("JP");
  const expiresIn = request.expiresIn ?? 86_400;
  const url = `https://justpay.lk/pay/${linkId}`;
  const qrPayload = `00020101021226${linkId}5204000053033445802LK5910FlowPilot6007Colombo6304ABCD`;

  return {
    paymentLink: url,
    expiresAt: futureIso(expiresIn),
    qrPayload,
    // Legacy aliases
    url,
    linkId,
    qrData: qrPayload,
  };
}

export async function generateMerchantQR(
  request: MerchantQRRequest,
): Promise<MerchantQRResult> {
  await shortDelay();
  const merchantName = request.merchantName.slice(0, 25).toUpperCase();
  const amountStr =
    request.amount > 0
      ? `54${String(request.amount.toFixed(2).length).padStart(2, "0")}${request.amount.toFixed(2)}`
      : "";

  const qrPayload = [
    "000201",
    "010211",
    `26${String(BANK_CODE.length + 4).padStart(2, "0")}0004${BANK_CODE}`,
    amountStr,
    "5204000053033445802LK",
    `59${String(merchantName.length).padStart(2, "0")}${merchantName}`,
    "6007Colombo",
    "6304BEEF",
  ].join("");

  return {
    qrPayload,
    qrImageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50' y='50' text-anchor='middle' font-size='6'>${qrPayload.slice(0, 40)}</text></svg>`,
    )}`,
    // Legacy aliases
    qrData: qrPayload,
    expiresAt: futureIso(3600),
  };
}

export async function scheduleGovtPayment(
  request: GovtPaymentRequest,
): Promise<GovtPaymentResult> {
  await shortDelay();
  if (request.amount > getCurrentBalance()) {
    return {
      paymentId: simId("GOVT"),
      taxType: request.taxType,
      status: "failed",
      receiptNumber: "",
      processedAt: nowIso(),
      amount: request.amount,
      failureReason: "Insufficient funds",
    };
  }
  return {
    paymentId: simId("GOVT"),
    taxType: request.taxType,
    status: "success",
    receiptNumber: `REC-${request.taxType}-${Date.now()}`,
    processedAt: nowIso(),
    amount: request.amount,
  };
}

export async function checkHealth(): Promise<boolean> {
  return true;
}

// ─── Legacy aliases kept for backward compatibility ──────────────────────────
//
// Some pre-existing consumers (seed route) still call the old method names.
// Keep these as aliases so we don't have to touch them.

export const getTransactions = listTransactions;
export const transfer = initiateCEFTSTransfer;
export const createJustPayLink = generateJustPayLink;
export const createMerchantQR = generateMerchantQR;
export const payGovt = scheduleGovtPayment;
