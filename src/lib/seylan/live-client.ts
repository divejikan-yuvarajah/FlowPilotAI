/**
 * Live Seylan Bank API client — STUB
 *
 * All methods throw until real API credentials are configured.
 * Swap this in by setting SEYLAN_MODE=live in .env once API access
 * is granted during the buildathon.
 */

import type {
  SeylanClient,
  SeylanBalance,
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

function notConfigured(method: string): never {
  throw new Error(
    `Live Seylan API not configured — method "${method}" called with SEYLAN_MODE=live. ` +
      `Set SEYLAN_API_BASE_URL and SEYLAN_API_KEY in .env or switch to SEYLAN_MODE=simulator.`,
  );
}

export const seylanLiveClient: SeylanClient = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async getBalance(): Promise<SeylanBalance> {
    notConfigured("getBalance");
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async getTransactions(_params?: {
    from?: string;
    to?: string;
    limit?: number;
    type?: "credit" | "debit";
  }): Promise<SeylanTransaction[]> {
    notConfigured("getTransactions");
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async transfer(_request: CEFTSTransferRequest): Promise<CEFTSTransferResult> {
    notConfigured("transfer");
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async createJustPayLink(
    _request: JustPayLinkRequest,
  ): Promise<JustPayLinkResult> {
    notConfigured("createJustPayLink");
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async createMerchantQR(
    _request: MerchantQRRequest,
  ): Promise<MerchantQRResult> {
    notConfigured("createMerchantQR");
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async payGovt(_request: GovtPaymentRequest): Promise<GovtPaymentResult> {
    notConfigured("payGovt");
  },
};
