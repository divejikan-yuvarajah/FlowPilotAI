/**
 * FlowPilot AI — Trust Score Engine
 * CTO Blueprint §5.4
 *
 * Calculates a 0-100 creditworthiness score for a client or vendor
 * based on their historical payment behaviour. Scores are composites of
 * timeliness, payment accuracy, and behavioural consistency.
 *
 * Default (no data): score = 70, tier = 'C', trend = 'stable'
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentEvent {
  invoiceId: string;
  invoicedAmount: number;  // LKR
  paidAmount: number;      // LKR
  dueDate: string;         // ISO-8601
  paidAt: string | null;   // null = unpaid
}

export interface TrustScoreComponents {
  timeliness: number;   // 0-100  based on average days late
  accuracy: number;     // 0-100  paid vs invoiced amount
  consistency: number;  // 0-100  inverse of timing variance
}

export interface TrustScoreResult {
  score: number;                          // 0-100 composite
  tier: "A" | "B" | "C" | "D" | "F";
  trend: "improving" | "stable" | "worsening";
  components: TrustScoreComponents;
  sampleSize: number;
  lastUpdated: string;
}

// ─── Weights ──────────────────────────────────────────────────────────────────

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

function scoreToTier(score: number): TrustScoreResult["tier"] {
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

export function calculateTrustScore(
  events: PaymentEvent[],
): TrustScoreResult {
  // Default when no payment history exists
  if (events.length === 0) {
    return {
      score: 70,
      tier: "C",
      trend: "stable",
      components: { timeliness: 70, accuracy: 70, consistency: 70 },
      sampleSize: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Separate paid from unpaid; unpaid invoices penalise timeliness heavily
  const paid = events.filter((e) => e.paidAt !== null);
  const unpaidCount = events.length - paid.length;

  // Days late per payment (negative = early, clamped to 0)
  const daysLateList = paid.map((e) =>
    Math.max(0, daysBetween(e.dueDate, e.paidAt!)),
  );

  // Add a 60-day penalty for each unpaid invoice
  const effectiveLate = [...daysLateList, ...Array(unpaidCount).fill(60)];

  // ── Timeliness (60%) ──────────────────────────────────────────────────────
  const avgDaysLate = mean(effectiveLate);
  const timeliness = clamp(100 - avgDaysLate * 10); // -10 pts per day late

  // ── Accuracy (25%) ────────────────────────────────────────────────────────
  const accuracyList = paid.map((e) => {
    if (e.invoicedAmount === 0) return 100;
    const ratio = e.paidAmount / e.invoicedAmount;
    // Full credit at 100%, scaled penalty for under/over-payment
    return clamp(100 - Math.abs(1 - ratio) * 200);
  });
  const accuracy = clamp(mean(accuracyList));

  // ── Consistency (15%) — inverse of timing variance ────────────────────────
  const lateSd = stdDev(effectiveLate);
  // StdDev of 0 = perfect consistency (100). Each unit of SD costs 3 pts.
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

  let trend: TrustScoreResult["trend"] = "stable";
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
    sampleSize: events.length,
    lastUpdated: new Date().toISOString(),
  };
}
