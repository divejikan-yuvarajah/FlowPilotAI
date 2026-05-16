/**
 * FlowPilot AI — Reconciliation Engine
 * CTO Blueprint §5.4
 *
 * Matches bank transactions (from Seylan) against open invoices and
 * bills. Uses fuzzy amount matching within a configurable tolerance
 * and a date-proximity window to handle float and processing delays.
 */

import type { SeylanTransaction } from "@/lib/seylan/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  clientName: string;
  amount: number;       // LKR expected payment
  issuedAt: string;     // ISO-8601
  dueAt: string;        // ISO-8601
  reference?: string;   // optional reference hint for matching
}

export interface Bill {
  id: string;
  vendorName: string;
  amount: number;       // LKR expected debit
  dueAt: string;        // ISO-8601
  reference?: string;
}

export interface MatchedPair {
  transactionId: string;
  matchedTo: { type: "invoice" | "bill"; id: string };
  transactionAmount: number;
  expectedAmount: number;
  variance: number;       // transactionAmount - expectedAmount
  variancePct: number;    // variance / expectedAmount * 100
  daysDelta: number;      // abs(postedAt - dueAt) in days
  confidence: "exact" | "fuzzy";
}

export interface UnmatchedTransaction extends SeylanTransaction {
  unmatchedReason: "no_invoice" | "amount_mismatch" | "date_outside_window";
}

export interface ReconciliationResult {
  matched: MatchedPair[];
  unmatchedTransactions: UnmatchedTransaction[];
  unmatchedInvoices: Invoice[];
  unmatchedBills: Bill[];
  reconciliationRate: number;   // matched / total, 0-1
  totalMatched: number;
  totalUnmatched: number;
  surplusCredits: number;       // LKR sum of unmatched credit amounts
  unaccountedDebits: number;    // LKR sum of unmatched debit amounts
  asOf: string;
}

export interface ReconciliationOptions {
  amountTolerancePct?: number;   // default 2% — match if within this % of expected
  dateWindowDays?: number;       // default 5 — match if postedAt within N days of dueAt
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function absDaysDiff(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000,
  );
}

function withinTolerance(
  actual: number,
  expected: number,
  tolerancePct: number,
): boolean {
  if (expected === 0) return actual === 0;
  return Math.abs((actual - expected) / expected) * 100 <= tolerancePct;
}

// ─── Core function ────────────────────────────────────────────────────────────

export function reconcile(
  transactions: SeylanTransaction[],
  invoices: Invoice[],
  bills: Bill[],
  options: ReconciliationOptions = {},
): ReconciliationResult {
  const tolerancePct = options.amountTolerancePct ?? 2;
  const dateWindow = options.dateWindowDays ?? 5;

  const matched: MatchedPair[] = [];
  const unmatchedTransactions: UnmatchedTransaction[] = [];

  // Working sets — remove items as they get matched (1-to-1)
  const openInvoices = [...invoices];
  const openBills = [...bills];

  for (const txn of transactions) {
    let foundMatch = false;

    if (txn.type === "credit") {
      // Try to match against open invoices
      for (let i = 0; i < openInvoices.length; i++) {
        const inv = openInvoices[i];
        const daysDelta = absDaysDiff(txn.postedAt, inv.dueAt);

        if (daysDelta > dateWindow) continue;
        if (!withinTolerance(txn.amount, inv.amount, tolerancePct)) continue;

        const variance = txn.amount - inv.amount;
        matched.push({
          transactionId: txn.id,
          matchedTo: { type: "invoice", id: inv.id },
          transactionAmount: txn.amount,
          expectedAmount: inv.amount,
          variance,
          variancePct: Math.round((variance / inv.amount) * 10000) / 100,
          daysDelta: Math.round(daysDelta * 10) / 10,
          confidence: variance === 0 ? "exact" : "fuzzy",
        });

        openInvoices.splice(i, 1); // consume
        foundMatch = true;
        break;
      }
    } else {
      // Debit — try to match against open bills
      for (let i = 0; i < openBills.length; i++) {
        const bill = openBills[i];
        const daysDelta = absDaysDiff(txn.postedAt, bill.dueAt);

        if (daysDelta > dateWindow) continue;
        if (!withinTolerance(txn.amount, bill.amount, tolerancePct)) continue;

        const variance = txn.amount - bill.amount;
        matched.push({
          transactionId: txn.id,
          matchedTo: { type: "bill", id: bill.id },
          transactionAmount: txn.amount,
          expectedAmount: bill.amount,
          variance,
          variancePct: Math.round((variance / bill.amount) * 10000) / 100,
          daysDelta: Math.round(daysDelta * 10) / 10,
          confidence: variance === 0 ? "exact" : "fuzzy",
        });

        openBills.splice(i, 1);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      unmatchedTransactions.push({
        ...txn,
        unmatchedReason: "no_invoice",
      });
    }
  }

  const totalItems = transactions.length + openInvoices.length + openBills.length;
  const reconciliationRate =
    totalItems === 0
      ? 1
      : Math.round((matched.length / transactions.length) * 1000) / 1000;

  const surplusCredits = unmatchedTransactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  const unaccountedDebits = unmatchedTransactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  return {
    matched,
    unmatchedTransactions,
    unmatchedInvoices: openInvoices,
    unmatchedBills: openBills,
    reconciliationRate,
    totalMatched: matched.length,
    totalUnmatched:
      unmatchedTransactions.length + openInvoices.length + openBills.length,
    surplusCredits: Math.round(surplusCredits),
    unaccountedDebits: Math.round(unaccountedDebits),
    asOf: new Date().toISOString(),
  };
}
