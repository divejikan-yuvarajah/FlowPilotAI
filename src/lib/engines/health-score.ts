/**
 * FlowPilot AI — Business Health Score Engine
 *
 * Produces a single 0-100 composite score representing the overall
 * financial health of a business, with grade and status signal.
 *
 * Weights:
 *   runway        30%
 *   trust         25%
 *   punctuality   15%
 *   expense       15%
 *   cash          15%
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthScoreInput {
  /** Days of cash runway remaining (0 = critical, 90+ = healthy) */
  runwayDays: number;
  /** Average trust score across all active clients/vendors (0-100) */
  trustScoreAvg: number;
  /** Fraction of payments made on or before due date (0-1) */
  onTimePaymentRate: number;
  /** Expense control score: low cost variance = high score (0-100) */
  expenseControlScore: number;
  /** Current balance divided by 30-day burn rate */
  cashRatio: number;
}

export interface HealthScoreComponents {
  runway: number;       // 0-100
  trust: number;        // 0-100
  punctuality: number;  // 0-100
  expense: number;      // 0-100
  cash: number;         // 0-100
}

export type HealthGrade = "A" | "B" | "C" | "D" | "F";
export type HealthStatus = "healthy" | "watch" | "danger" | "critical";

export interface HealthScoreResult {
  score: number;
  grade: HealthGrade;
  components: HealthScoreComponents;
  status: HealthStatus;
}

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS: Record<keyof HealthScoreComponents, number> = {
  runway: 0.30,
  trust: 0.25,
  punctuality: 0.15,
  expense: 0.15,
  cash: 0.15,
};

// ─── Normalisation functions ──────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** runwayDays → 0-100. 0 days = 0, 90+ days = 100. */
function normaliseRunway(days: number): number {
  return clamp((days / 90) * 100);
}

/** trustScoreAvg is already 0-100. Pass through with clamp. */
function normaliseTrust(avg: number): number {
  return clamp(avg);
}

/** onTimePaymentRate 0-1 → 0-100. */
function normalisePunctuality(rate: number): number {
  return clamp(rate * 100);
}

/** expenseControlScore is already 0-100. Pass through with clamp. */
function normaliseExpense(score: number): number {
  return clamp(score);
}

/**
 * cashRatio (balance / 30-day burn) → 0-100.
 * Ratio of 0 = 0, ratio of 3+ = 100 (3 months of runway in liquid cash).
 */
function normaliseCash(ratio: number): number {
  return clamp((ratio / 3) * 100);
}

// ─── Grade + Status mappings ──────────────────────────────────────────────────

function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function scoreToStatus(score: number): HealthStatus {
  if (score > 75) return "healthy";
  if (score >= 50) return "watch";
  if (score >= 30) return "danger";
  return "critical";
}

// ─── Core function ────────────────────────────────────────────────────────────

export function calculateHealthScore(
  input: HealthScoreInput,
): HealthScoreResult {
  const components: HealthScoreComponents = {
    runway: normaliseRunway(input.runwayDays),
    trust: normaliseTrust(input.trustScoreAvg),
    punctuality: normalisePunctuality(input.onTimePaymentRate),
    expense: normaliseExpense(input.expenseControlScore),
    cash: normaliseCash(input.cashRatio),
  };

  const score = clamp(
    (Object.keys(components) as Array<keyof HealthScoreComponents>).reduce(
      (sum, key) => sum + components[key] * WEIGHTS[key],
      0,
    ),
  );

  const rounded = Math.round(score * 10) / 10;

  return {
    score: rounded,
    grade: scoreToGrade(rounded),
    components: {
      runway: Math.round(components.runway * 10) / 10,
      trust: Math.round(components.trust * 10) / 10,
      punctuality: Math.round(components.punctuality * 10) / 10,
      expense: Math.round(components.expense * 10) / 10,
      cash: Math.round(components.cash * 10) / 10,
    },
    status: scoreToStatus(rounded),
  };
}
