/**
 * FlowPilot AI — Live Seylan Bank sandbox client.
 *
 * Hits the real Seylan sandbox at http://34.21.206.87:3000.
 * Sandbox is HTTP (not HTTPS) — this is intentional, do not change.
 * Auth: x-api-key header on every request.
 *
 * Response envelope: every Seylan response is wrapped as
 *   { <ResponseName>: { Status: { Code, Message, Description }, ...data } }
 * Status.Code === "0000" means success. Anything else = error with details
 * in Status.Description.
 */

import { env } from "@/lib/env";
import type {
  SeylanBalance,
  SeylanTransaction,
  TransferResult,
  CEFTSTransferRequest,
  InternalTransferRequest,
} from "./types";

const BASE = env.SEYLAN_API_BASE_URL;
const KEY = env.SEYLAN_API_KEY;

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    "x-api-key": KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extra ?? {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...headers(), ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(env.SEYLAN_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e.name === "TimeoutError") {
      throw new Error(
        `Seylan API timeout after ${env.SEYLAN_REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw new Error(`Seylan network error: ${e.message ?? "unknown"}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Seylan HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Seylan timestamp parser ──────────────────────────────────────────────────
// Seylan returns 'YYYY-MM-DD-HH.MM.SS.SSSSSS'. Convert to ISO-8601.

function parseSeylanTimestamp(s?: string): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})\.(\d{2})\.(\d{2})\.(\d+)$/);
  if (m) {
    return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5].slice(0, 3)}Z`;
  }
  return s;
}

// ─── 1. Account Balance Inquiry ──────────────────────────────────────────────

export async function getBalance(_userId?: string): Promise<SeylanBalance> {
  const account = env.SEYLAN_TEST_SOURCE_ACCOUNT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await call<any>(
    `/Inquiry/Account/AccountInquiry/1.0/GetAccountBalance` +
      `?AccountCategory=EXT&AccountNumber=${account}`,
  );
  const r = data.Account_Balance_Inquiry;
  if (r?.Status?.Code !== "0000") {
    throw new Error(
      `Balance inquiry failed: ${r?.Status?.Message ?? "unknown"} (${r?.Status?.Code ?? "no code"})`,
    );
  }
  const a = r.Account;
  return {
    balance: parseFloat(a.Current_available_balance ?? "0"),
    ledgerBalance: parseFloat(a.Ledger_balance ?? "0"),
    currency: a.Currency_mnemonic ?? "LKR",
    accountNumber: `****${account.slice(-4)}`,
    accountHolder: a.Customer_full_name,
    asOf: new Date().toISOString(),
  };
}

// ─── 2. Account Transaction History ──────────────────────────────────────────

export async function listTransactions(
  _userId?: string,
  options?: {
    numberOfTransactions?: number;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<SeylanTransaction[]> {
  const account = env.SEYLAN_TEST_SOURCE_ACCOUNT;
  let url =
    `/Inquiry/Account/AccountInquiry/1.0/GetAccountTransactions` +
    `?AccountCategory=EXT&AccountNumber=${account}`;

  if (options?.startDate && options?.endDate) {
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    url += `&StartDate=${fmt(options.startDate)}&EndDate=${fmt(options.endDate)}`;
  } else {
    url += `&NumberOfTransactions=${options?.numberOfTransactions ?? 50}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await call<any>(url);
  const r = data.TransactionHistoryInquiryResponse;
  if (r?.Status?.Code !== "0000") {
    throw new Error(
      `Transaction history failed: ${r?.Status?.Message ?? "unknown"} (${r?.Status?.Code})`,
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txns: any[] = Array.isArray(r.Transaction) ? r.Transaction : [];

  return txns.map((t): SeylanTransaction => {
    const postingAmount = parseFloat(t.Posting_amount ?? "0");
    return {
      id:
        t.Event_key ??
        t.Narrative_4 ??
        `${t.Posting_date}-${t.Posting_sequence_number}`,
      postedAt: parseSeylanTimestamp(t.Timestamp) ?? t.Posting_date,
      type: postingAmount >= 0 ? "credit" : "debit",
      amount: Math.abs(postingAmount),
      balanceAfter: parseFloat(t.Running_balance ?? "0"),
      reference: t.Users_own_reference ?? t.Narrative_4 ?? "",
      description: t.Transaction_Code_Name ?? t.Transaction_code_mnemonic ?? "",
      counterparty: t.Narrative_1 ?? null,
      transactionCode: t.Transaction_code,
      valueDate: t.Value_date,
    };
  });
}

// ─── 3. Internal Transfer (within Seylan) ────────────────────────────────────

export async function initiateInternalTransfer(
  args: InternalTransferRequest,
): Promise<TransferResult> {
  const payload = {
    FundsTransfer_Request: {
      Account_category: "EXT",
      Source_account_number: env.SEYLAN_TEST_SOURCE_ACCOUNT,
      Destination_account_number:
        args.destinationAccount ?? env.SEYLAN_TEST_INTERNAL_DEST,
      Transaction_amount: args.amount.toFixed(2),
      Debit_transaction_code: "020",
      Credit_transaction_code: "520",
      User_reference: args.reference.slice(0, 16),
      Source_account_narration_1: (args.sourceNarration ?? "").slice(0, 35),
      Source_account_narration_2: "",
      Source_account_narration_3: "",
      Destination_account_narration_1: (args.destNarration ?? "").slice(0, 35),
      Destination_account_narration_2: "",
      Destination_account_narration_3: "",
      Application_type: "",
      Input_branch: "",
      Input_user: "",
      Workstation_id: "",
      Posting_batch: "",
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await call<any>(
    "/Posting/Account/InternalTransfer/1.0/TransferFunds",
    { method: "POST", body: JSON.stringify(payload) },
  );
  const r = data.FundsTransfer_Response;
  if (r?.Status?.Code !== "0000") {
    return {
      status: "failed",
      reason: r?.Status?.Message ?? r?.Status?.Description ?? "Unknown error",
      code: r?.Status?.Code,
      responseDesc: r?.Status?.Description,
    };
  }
  return {
    status: "completed",
    externalRef: r.Status.Transaction_Reference,
    completedAt: r.Status.Timestamp ?? new Date().toISOString(),
  };
}

// ─── 4. CEFTS Interbank Transfer ─────────────────────────────────────────────

export async function initiateCEFTSTransfer(
  args: CEFTSTransferRequest,
): Promise<TransferResult> {
  const payload = {
    CEFTSTransactionRequest: {
      Processing_code: "482000",
      Transaction_code: "52",
      Transaction_amount: args.amount.toFixed(2),
      Card_acceptor_terminal_id: "",
      Card_acceptor_id: "",
      Terminal_location: "",
      Channel_type: "ANY",
      Account_category: "EXT",
      Source_account_number: env.SEYLAN_TEST_SOURCE_ACCOUNT,
      Source_card_number: "",
      Source_customer_name: "FlowPilot AI",
      Source_bank_code: "7287", // Seylan bank code — do not change
      Source_branch_code: "",
      Source_wallet_number: "",
      Destination_card_number: "",
      Destination_account_number:
        args.destinationAccount ?? env.SEYLAN_TEST_CEFTS_DEST_ACCOUNT,
      Destination_bank_code:
        args.destinationBankCode ?? env.SEYLAN_TEST_CEFTS_DEST_BANK,
      Destination_customer_name: args.recipientName.slice(0, 30),
      Destination_branch_code: "",
      Destination_wallet_number: "",
      Currency_code: "LKR",
      Reference: args.reference.slice(0, 20),
      Particular_details: "",
      Additional_data: "",
      Authorized_user: "",
      Customer_account_narration_1: "",
      Customer_account_narration_2: "",
      Customer_account_narration_3: "",
      Internal_account_narration_1: "",
      Internal_account_narration_2: "",
      Internal_account_narration_3: "",
      Application_type: [],
      Input_branch: [],
      Input_user: [],
      Workstation_id: [],
      Posting_batch: [],
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await call<any>(
    "/Posting/Account/Cefts/1.0/InitiateCEFTSTransfer",
    { method: "POST", body: JSON.stringify(payload) },
  );
  const r = data.CEFTSTransactionResponse;
  if (r?.Status?.Code !== "0000") {
    return {
      status: "failed",
      reason: r?.Status?.Description ?? r?.Status?.Message ?? "Unknown error",
      code: r?.Status?.Code,
      responseDesc: r?.Status?.Description,
    };
  }
  const d = r.CEFTSTransaction_Detail;
  return {
    status: "completed",
    externalRef: r.Status.Transaction_Reference,
    transactionId: d?.Transaction_id,
    approvalNumber: d?.Approval_number,
    completedAt: r.Status.Timestamp ?? new Date().toISOString(),
    responseDesc: d?.Response_code_desc,
  };
}

// ─── 5/6/7. JustPay / Merchant QR / Govt — deferred, use simulator path ──────

export async function generateJustPayLink(): Promise<never> {
  throw new Error("JustPay live integration deferred — use simulator path");
}

export async function generateMerchantQR(): Promise<never> {
  throw new Error("Merchant QR live integration deferred — use simulator path");
}

export async function scheduleGovtPayment(): Promise<never> {
  throw new Error(
    "Govt payment live integration deferred — use simulator path",
  );
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    await getBalance("healthcheck");
    return true;
  } catch {
    return false;
  }
}
