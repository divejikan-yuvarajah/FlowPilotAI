/**
 * Seylan Bank — hybrid live/simulator router with automatic fallback.
 *
 * Some Seylan APIs (JustPay, Merchant QR, Govt LPOPP) are too complex to
 * implement live in 24h. Even when SEYLAN_MODE=live, those keep using the
 * simulator. The 4 critical APIs (balance, transactions, internal transfer,
 * CEFTS) hit the real sandbox.
 *
 * If a live call fails for ANY reason (network down, timeout, 5xx) the
 * router transparently falls back to the simulator. This guarantees the
 * demo never breaks even if the sandbox is unreachable.
 *
 * Usage:
 *   import { seylan } from "@/lib/seylan/client"
 *   const balance = await seylan.getBalance(user.id)
 */

import { env } from "@/lib/env";
import * as live from "./live-client";
import * as sim from "./simulator";

const LIVE_APIS = new Set([
  "getBalance",
  "listTransactions",
  "initiateInternalTransfer",
  "initiateCEFTSTransfer",
]);

function shouldUseLive(apiName: string): boolean {
  return env.SEYLAN_MODE === "live" && LIVE_APIS.has(apiName);
}

async function withFallback<T>(
  apiName: string,
  liveCall: () => Promise<T>,
  simCall: () => Promise<T>,
): Promise<T> {
  if (!shouldUseLive(apiName)) return simCall();
  try {
    return await liveCall();
  } catch (err) {
    console.warn(
      `[Seylan ${apiName}] Live failed, falling back to simulator:`,
      err instanceof Error ? err.message : err,
    );
    return simCall();
  }
}

export const seylan = {
  // ── Live + fallback ──────────────────────────────────────────────────────
  getBalance: (userId?: string) =>
    withFallback(
      "getBalance",
      () => live.getBalance(userId),
      () => sim.getBalance(userId),
    ),

  listTransactions: (
    userId?: string,
    options?: { numberOfTransactions?: number; startDate?: Date; endDate?: Date },
  ) =>
    withFallback(
      "listTransactions",
      () => live.listTransactions(userId, options),
      () => sim.listTransactions(userId, options),
    ),

  initiateInternalTransfer: (
    args: Parameters<typeof live.initiateInternalTransfer>[0],
  ) =>
    withFallback(
      "initiateInternalTransfer",
      () => live.initiateInternalTransfer(args),
      () => sim.initiateInternalTransfer(args),
    ),

  initiateCEFTSTransfer: (
    args: Parameters<typeof live.initiateCEFTSTransfer>[0],
  ) =>
    withFallback(
      "initiateCEFTSTransfer",
      () => live.initiateCEFTSTransfer(args),
      () => sim.initiateCEFTSTransfer(args),
    ),

  // ── Simulator-only (live deferred) ───────────────────────────────────────
  generateJustPayLink: sim.generateJustPayLink,
  generateMerchantQR: sim.generateMerchantQR,
  scheduleGovtPayment: sim.scheduleGovtPayment,

  // ── Legacy aliases for backward compatibility ────────────────────────────
  createJustPayLink: sim.generateJustPayLink,
  createMerchantQR: sim.generateMerchantQR,
  payGovt: sim.scheduleGovtPayment,

  // ── Health check (for status indicators) ─────────────────────────────────
  checkHealth: () =>
    env.SEYLAN_MODE === "live"
      ? live.checkHealth()
      : Promise.resolve(true),
};

export type SeylanClient = typeof seylan;

// Re-export types for convenience
export type {
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
  TransactionType,
  TransactionCategory,
  GovtTaxType,
} from "./types";
