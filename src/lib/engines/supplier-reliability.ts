/**
 * FlowPilot AI — Supplier Reliability Engine
 *
 * Mirrors the trust-score engine but from the SME's perspective:
 * instead of "did the client pay us on time?", this answers
 * "did WE pay the supplier on time?".
 *
 * - On time  = paid on or before due_date (daysLate ≤ 0)
 * - Late      = paid after due_date (daysLate > 0)
 * - Tier interpretation: A = excellent payer, F = high-risk payer
 *
 * Default (no data): score = 70, tier = 'C', trend = 'stable'
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierObligation {
  obligationId: string;
  amount: number;       // LKR
  paidAmount: number;   // LKR (0 if unpaid)
  dueDate: string;      // ISO-8601 date string
  paidAt: string | null; // null = unpaid/pending
}

export interface SupplierReliabilityComponents {
  timeliness: number;   // 0-100  how often WE paid on time
  accuracy: number;     // 0-100  paid vs obligated amount
  consistency: number;  // 0-100  inverse of timing variance
}

export interface SupplierReliabilityResult {
  score: number;                            // 0-100 composite
  tier: "A" | "B" | "C" | "D" | "F";
  trend: "improving" | "stable" | "worsening";
  components: SupplierReliabilityComponents;
  sampleSize: number;
  lastUpdated: string;
}

// ─── Weights (identical to trust-score for symmetry) ─────────────────────────

const WEIGHTS = {
  timeliness: 0.60,
  accuracy: 0.25,
  consistency: 0.15,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length,
  );
}

function scoreToTier(score: number): SupplierReliabilityResult["tier"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Core function ────────────────────────────────────────────────────────────

export function calculateSupplierReliability(
  obligations: SupplierObligation[],
): SupplierReliabilityResult {
  // Default when no obligation history exists
  if (obligations.length === 0) {
    return {
      score: 70,
      tier: "C",
      trend: "stable",
      components: { timeliness: 70, accuracy: 70, consistency: 70 },
      sampleSize: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Separate paid from unpaid; unpaid obligations penalise timeliness
  const paid = obligations.filter((o) => o.paidAt !== null);
  const unpaidCount = obligations.length - paid.length;

  // Days late per payment (negative = paid early, clamped to 0 for penalty)
  // "On time" means WE paid on or BEFORE due_date
  const daysLateList = paid.map((o) =>
    Math.max(0, daysBetween(o.dueDate, o.paidAt!)),
  );

  // Add a 60-day penalty per unpaid/overdue obligation
  const effectiveLate = [...daysLateList, ...Array(unpaidCount).fill(60)];

  // ── Timeliness (60%) ──────────────────────────────────────────────────────
  const avgDaysLate = mean(effectiveLate);
  const timeliness = clamp(100 - avgDaysLate * 10); // -10 pts per day late

  // ── Accuracy (25%) ────────────────────────────────────────────────────────
  const accuracyList = paid.map((o) => {
    if (o.amount === 0) return 100;
    const ratio = o.paidAmount / o.amount;
    return clamp(100 - Math.abs(1 - ratio) * 200);
  });
  const accuracy = clamp(mean(accuracyList));

  // ── Consistency (15%) — inverse of timing variance ────────────────────────
  const lateSd = stdDev(effectiveLate);
  const consistency = clamp(100 - lateSd * 3);

  // ── Composite score ───────────────────────────────────────────────────────
  const score = clamp(
    timeliness * WEIGHTS.timeliness +
      accuracy * WEIGHTS.accuracy +
      consistency * WEIGHTS.consistency,
  );

  // ── Trend — compare first half vs second half of history ─────────────────
  const half = Math.ceil(effectiveLate.length / 2);
  const earlyMean = mean(effectiveLate.slice(0, half));
  const recentMean = mean(effectiveLate.slice(half));

  let trend: SupplierReliabilityResult["trend"] = "stable";
  if (effectiveLate.length >= 4) {
    if (recentMean > earlyMean * 1.2 + 1) trend = "worsening";
    else if (recentMean < earlyMean * 0.8 - 0.5) trend = "improving";
  }

  return {
    score: Math.round(score * 10) / 10,
    tier: scoreToTier(score),
    trend,
    components: {
      timeliness: Math.round(timeliness * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      consistency: Math.round(consistency * 10) / 10,
    },
    sampleSize: obligations.length,
    lastUpdated: new Date().toISOString(),
  };
}
