/**
 * FlowPilot AI — Anomaly Detection Engine
 *
 * Detects abnormal spending by comparing each debit transaction against
 * the 30-day average for its (category, vendor) pair from a pre-computed
 * baseline map. Anomalies are ranked by severity.
 */

import type { SeylanTransaction, TransactionCategory } from "@/lib/seylan/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BaselineEntry {
  category: TransactionCategory;
  vendor: string;
  avgAmount: number;     // 30-day average debit for this (category, vendor) pair
  sampleSize: number;    // number of transactions used to compute the average
}

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface Anomaly {
  transactionId: string;
  postedAt: string;
  category: TransactionCategory;
  vendor: string;
  baseline: number;     // expected average amount
  actual: number;       // actual amount in this transaction
  deltaPct: number;     // (actual - baseline) / baseline * 100
  severity: AnomalySeverity;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  totalScanned: number;
  anomalyRate: number;  // anomalies / totalScanned, 0-1
  asOf: string;
}

// ─── Severity thresholds ──────────────────────────────────────────────────────
// (over baseline, in percent)

const SEVERITY_THRESHOLDS: Record<AnomalySeverity, number> = {
  low: 0,         // anything >= sensitivityPct but < medium
  medium: 50,     // 50%+ over baseline
  high: 100,      // 100%+ over baseline (double)
  critical: 200,  // 200%+ over baseline (triple)
};

function toSeverity(deltaPct: number): AnomalySeverity {
  if (deltaPct >= SEVERITY_THRESHOLDS.critical) return "critical";
  if (deltaPct >= SEVERITY_THRESHOLDS.high) return "high";
  if (deltaPct >= SEVERITY_THRESHOLDS.medium) return "medium";
  return "low";
}

// ─── Baseline builder ─────────────────────────────────────────────────────────
//
// Convenience function: build a baseline map from a transaction history.
// Pass historical transactions (e.g. last 30 days) to pre-compute baselines
// before calling detectAnomalies.

export function buildBaselines(
  transactions: SeylanTransaction[],
): BaselineEntry[] {
  const map = new Map<string, { total: number; count: number; category: TransactionCategory; vendor: string }>();

  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const category = txn.category ?? "other";
    const vendor = txn.counterparty ?? "unknown";
    const key = `${category}::${vendor.toLowerCase()}`;

    const existing = map.get(key);
    if (existing) {
      existing.total += txn.amount;
      existing.count++;
    } else {
      map.set(key, { total: txn.amount, count: 1, category, vendor });
    }
  }

  return Array.from(map.values()).map(({ total, count, category, vendor }) => ({
    category,
    vendor,
    avgAmount: Math.round((total / count) * 100) / 100,
    sampleSize: count,
  }));
}

// ─── Core function ────────────────────────────────────────────────────────────

export function detectAnomalies(
  transactions: SeylanTransaction[],
  baselines: BaselineEntry[],
  sensitivityPct = 30,
): AnomalyDetectionResult {
  // Index baselines by (category, vendor) for O(1) lookup
  const baselineIndex = new Map<string, number>();
  for (const entry of baselines) {
    const key = `${entry.category}::${entry.vendor.toLowerCase()}`;
    baselineIndex.set(key, entry.avgAmount);
  }

  const debits = transactions.filter((t) => t.type === "debit");
  const anomalies: Anomaly[] = [];

  for (const txn of debits) {
    const category = txn.category ?? "other";
    const vendor = txn.counterparty ?? "unknown";
    const key = `${category}::${vendor.toLowerCase()}`;

    const baseline = baselineIndex.get(key);
    if (baseline === undefined || baseline === 0) continue; // no baseline to compare against

    const threshold = baseline * (1 + sensitivityPct / 100);

    if (txn.amount > threshold) {
      const deltaPct = Math.round(((txn.amount - baseline) / baseline) * 10000) / 100;
      anomalies.push({
        transactionId: txn.id,
        postedAt: txn.postedAt,
        category,
        vendor,
        baseline: Math.round(baseline),
        actual: txn.amount,
        deltaPct,
        severity: toSeverity(deltaPct),
      });
    }
  }

  // Sort by severity desc, then deltaPct desc
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  anomalies.sort(
    (a, b) =>
      severityOrder[b.severity] - severityOrder[a.severity] ||
      b.deltaPct - a.deltaPct,
  );

  return {
    anomalies,
    totalScanned: debits.length,
    anomalyRate:
      debits.length === 0
        ? 0
        : Math.round((anomalies.length / debits.length) * 1000) / 1000,
    asOf: new Date().toISOString(),
  };
}
