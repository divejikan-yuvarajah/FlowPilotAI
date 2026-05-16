/**
 * FlowPilot AI — Runway Model Engine
 * CTO Blueprint §5.4
 *
 * Projects how many days the current cash balance will last based on
 * historical burn rate, with optimistic / base / pessimistic scenarios.
 * Uses only bank transaction data — no accrual adjustments.
 */

import type { SeylanTransaction } from "@/lib/seylan/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunwayInput {
  currentBalance: number;         // LKR, as of now
  transactions: SeylanTransaction[];
  lookbackDays?: number;          // default 30; window for burn rate calc
  projectionDays?: number;        // default 90; how far to project
}

export interface DailyProjection {
  date: string;       // ISO date
  balance: number;
  cumulativeBurn: number;
}

export interface RunwayScenarios {
  optimistic: number;   // runway days at 80% of base burn
  base: number;         // runway days at 100% of base burn
  pessimistic: number;  // runway days at 130% of base burn
}

export interface RunwayResult {
  runwayDays: number;               // base scenario
  projectedZeroDate: string;        // ISO date balance hits 0 (base)
  dailyBurnRate: number;            // average LKR/day (debits only)
  monthlyBurnRate: number;          // dailyBurnRate × 30
  weeklyNetFlow: number;            // average net (credits - debits) per week
  scenarios: RunwayScenarios;
  confidence: "high" | "medium" | "low";
  projections: DailyProjection[];   // daily balance for projectionDays
  asOf: string;                     // ISO timestamp
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Core function ────────────────────────────────────────────────────────────

export function calculateRunway(input: RunwayInput): RunwayResult {
  const lookback = input.lookbackDays ?? 30;
  const projectionDays = input.projectionDays ?? 90;
  const now = new Date();
  const cutoff = new Date(now.getTime() - lookback * 86_400_000);

  // Filter transactions to lookback window
  const recent = input.transactions.filter(
    (t) => new Date(t.postedAt) >= cutoff,
  );

  // Separate debits and credits
  const debits = recent.filter((t) => t.type === "debit");
  const credits = recent.filter((t) => t.type === "credit");

  const totalDebits = debits.reduce((s, t) => s + t.amount, 0);
  const totalCredits = credits.reduce((s, t) => s + t.amount, 0);

  // Daily rates over the lookback window
  const dailyBurnRate = totalDebits / lookback;
  const dailyCreditRate = totalCredits / lookback;
  const dailyNetBurn = Math.max(0, dailyBurnRate - dailyCreditRate);

  // Confidence: high if >= 20 transactions, medium if >= 7, low otherwise
  const confidence: RunwayResult["confidence"] =
    recent.length >= 20 ? "high" : recent.length >= 7 ? "medium" : "low";

  // ── Scenarios ────────────────────────────────────────────────────────────
  function daysUntilZero(burnMultiplier: number): number {
    const effectiveBurn = dailyNetBurn * burnMultiplier;
    if (effectiveBurn <= 0) return 999; // effectively infinite
    return Math.floor(input.currentBalance / effectiveBurn);
  }

  const scenarios: RunwayScenarios = {
    optimistic: daysUntilZero(0.8),
    base: daysUntilZero(1.0),
    pessimistic: daysUntilZero(1.3),
  };

  const runwayDays = scenarios.base;
  const projectedZeroDate = isoDateStr(addDays(now, runwayDays));

  // ── Daily projections ────────────────────────────────────────────────────
  const projections: DailyProjection[] = [];
  let balance = input.currentBalance;
  let cumulativeBurn = 0;

  for (let i = 1; i <= projectionDays; i++) {
    balance = Math.max(0, balance - dailyNetBurn);
    cumulativeBurn += dailyNetBurn;
    projections.push({
      date: isoDateStr(addDays(now, i)),
      balance: Math.round(balance),
      cumulativeBurn: Math.round(cumulativeBurn),
    });
  }

  return {
    runwayDays,
    projectedZeroDate,
    dailyBurnRate: Math.round(dailyBurnRate),
    monthlyBurnRate: Math.round(dailyBurnRate * 30),
    weeklyNetFlow: Math.round((totalCredits - totalDebits) / (lookback / 7)),
    scenarios,
    confidence,
    projections,
    asOf: now.toISOString(),
  };
}
