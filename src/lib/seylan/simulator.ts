/**
 * Seylan Bank Simulator
 *
 * Provides a realistic in-memory simulation of the Seylan Bank API.
 * The virtual balance burns down at ~LKR 18,500/day to simulate
 * the cash-flow stress scenario shown in the War Room.
 */

import type {
  SeylanBalance,
  SeylanClient,
  SeylanTransaction,
  CEFTSTransferRequest,
  CEFTSTransferResult,
  JustPayLinkRequest,
  JustPayLinkResult,
  MerchantQRRequest,
  MerchantQRResult,
  GovtPaymentRequest,
  GovtPaymentResult,
} from "./types";
import getFixtureTransactions from "./fixtures/transactions";

// ─── Virtual balance module state ─────────────────────────────────────────────

const INITIAL_BALANCE = 1_247_500;
const BURN_RATE_PER_DAY = 18_500; // LKR/day
const BURN_RATE_PER_MS = BURN_RATE_PER_DAY / (24 * 60 * 60 * 1000);

const ACCOUNT_NUMBER = "0290-1006-1247";
const BANK_CODE = "7072"; // Seylan Bank

// Track the baseline so burn is relative to server start time
const _startTime = Date.now();
const _pendingTransfers: CEFTSTransferResult[] = [];

function getCurrentBalance(): number {
  const elapsed = Date.now() - _startTime;
  const burned = Math.floor(elapsed * BURN_RATE_PER_MS);
  return Math.max(0, INITIAL_BALANCE - burned);
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

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
  // Simulate ~120-350 ms API latency
  return new Promise((res) =>
    setTimeout(res, 120 + Math.floor(Math.random() * 230)),
  );
}

// ─── Simulator implementation ─────────────────────────────────────────────────

async function getBalance(): Promise<SeylanBalance> {
  await shortDelay();
  return {
    balance: getCurrentBalance(),
    asOf: nowIso(),
    currency: "LKR",
    accountNumber: ACCOUNT_NUMBER,
  };
}

async function getTransactions(params?: {
  from?: string;
  to?: string;
  limit?: number;
  type?: "credit" | "debit";
}): Promise<SeylanTransaction[]> {
  await shortDelay();
  let txns = getFixtureTransactions();

  if (params?.from) {
    const from = new Date(params.from).getTime();
    txns = txns.filter((t) => new Date(t.postedAt).getTime() >= from);
  }
  if (params?.to) {
    const to = new Date(params.to).getTime();
    txns = txns.filter((t) => new Date(t.postedAt).getTime() <= to);
  }
  if (params?.type) {
    txns = txns.filter((t) => t.type === params.type);
  }

  return txns.slice(0, params?.limit ?? 100);
}

async function transfer(
  request: CEFTSTransferRequest,
): Promise<CEFTSTransferResult> {
  await shortDelay();

  // Reject if balance would go negative
  if (request.amount > getCurrentBalance()) {
    const result: CEFTSTransferResult = {
      transactionId: simId("CEFTS"),
      status: "failed",
      failureReason: "Insufficient funds",
      processedAt: nowIso(),
      fee: 0,
    };
    return result;
  }

  const result: CEFTSTransferResult = {
    transactionId: simId("CEFTS"),
    status: "success",
    processedAt: nowIso(),
    fee: request.amount <= 500_000 ? 25 : 50, // LKR CEFTS fee tiers
  };

  _pendingTransfers.push(result);
  return result;
}

async function createJustPayLink(
  request: JustPayLinkRequest,
): Promise<JustPayLinkResult> {
  await shortDelay();
  const linkId = simId("JP");
  const expiresIn = request.expiresIn ?? 86400;

  return {
    linkId,
    url: `https://justpay.lk/pay/${linkId}`,
    expiresAt: futureIso(expiresIn),
    qrData: `00020101021226${linkId}5204000053033445802LK5910FlowPilot6007Colombo6304ABCD`,
  };
}

async function createMerchantQR(
  request: MerchantQRRequest,
): Promise<MerchantQRResult> {
  await shortDelay();
  const merchantName = request.merchantName.slice(0, 25).toUpperCase();
  const amountStr =
    request.amount > 0
      ? `54${String(request.amount.toFixed(2).length).padStart(2, "0")}${request.amount.toFixed(2)}`
      : "";

  const qrData = [
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
    qrData,
    expiresAt: futureIso(3600), // QR valid 1 hour
  };
}

async function payGovt(
  request: GovtPaymentRequest,
): Promise<GovtPaymentResult> {
  await shortDelay();

  if (request.amount > getCurrentBalance()) {
    return {
      paymentId: simId("GOVT"),
      taxType: request.taxType,
      status: "failed",
      failureReason: "Insufficient funds",
      receiptNumber: "",
      processedAt: nowIso(),
      amount: request.amount,
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

// ─── Export as SeylanClient ───────────────────────────────────────────────────

export const seylanSimulator: SeylanClient = {
  getBalance,
  getTransactions,
  transfer,
  createJustPayLink,
  createMerchantQR,
  payGovt,
};
