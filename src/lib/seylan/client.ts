/**
 * Seylan Bank unified client
 *
 * Single entry point for all Seylan API calls throughout the app.
 * Reads SEYLAN_MODE from the environment and delegates to the
 * simulator (default) or the live client stub.
 *
 * Usage:
 *   import { seylan } from "@/lib/seylan/client"
 *   const balance = await seylan.getBalance()
 */

import { seylanSimulator } from "./simulator";
import { seylanLiveClient } from "./live-client";
import type { SeylanClient } from "./types";

const mode = process.env.SEYLAN_MODE ?? "simulator";

if (mode !== "simulator" && mode !== "live") {
  throw new Error(
    `Invalid SEYLAN_MODE "${mode}". Must be "simulator" or "live".`,
  );
}

export const seylan: SeylanClient =
  mode === "live" ? seylanLiveClient : seylanSimulator;

// Re-export types for convenience
export type {
  SeylanBalance,
  SeylanTransaction,
  SeylanClient,
  CEFTSTransferRequest,
  CEFTSTransferResult,
  JustPayLinkRequest,
  JustPayLinkResult,
  MerchantQRRequest,
  MerchantQRResult,
  GovtPaymentRequest,
  GovtPaymentResult,
  TransactionCategory,
  TransactionType,
  GovtTaxType,
} from "./types";
