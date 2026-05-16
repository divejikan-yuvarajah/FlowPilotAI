/**
 * Trust Score Engine — unit tests
 *
 * Run with:  npx tsx src/lib/engines/__tests__/trust-score.test.ts
 *
 * Uses only console.assert — no Jest or test runner required.
 */

import { calculateTrustScore, type PaymentEvent } from "../trust-score";

// ─── Tiny test harness ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function describe(title: string, fn: () => void): void {
  console.log(`\n${title}`);
  fn();
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvent(
  dueDate: string,
  paidAt: string | null,
  invoicedAmount = 100_000,
  paidAmount?: number,
): PaymentEvent {
  return {
    invoiceId: `INV-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    invoicedAmount,
    paidAmount: paidAmount ?? invoicedAmount,
    dueDate,
    paidAt,
  };
}

// ─── Case 1: All on-time payments ─────────────────────────────────────────────

describe("Case 1 — All payments made on time (score >= 90, trend stable)", () => {
  const events: PaymentEvent[] = [
    makeEvent("2025-12-01", "2025-11-30"),  // 1 day early
    makeEvent("2026-01-01", "2025-12-31"),  // 1 day early
    makeEvent("2026-02-01", "2026-01-30"),  // 2 days early
    makeEvent("2026-03-01", "2026-02-28"),  // 1 day early
    makeEvent("2026-04-01", "2026-04-01"),  // exact on due date
    makeEvent("2026-05-01", "2026-05-01"),  // exact on due date
  ];

  const result = calculateTrustScore(events);

  assert(result.score >= 90, `score >= 90 (got ${result.score})`);
  assert(result.tier === "A", `tier = 'A' (got '${result.tier}')`);
  assert(result.trend === "stable", `trend = 'stable' (got '${result.trend}')`);
  assert(result.sampleSize === 6, `sampleSize = 6 (got ${result.sampleSize})`);
  assert(result.components.timeliness === 100, `timeliness = 100 (got ${result.components.timeliness})`);
  assert(result.components.accuracy === 100, `accuracy = 100 (got ${result.components.accuracy})`);
});

// ─── Case 2: Worsening late payments ──────────────────────────────────────────

describe("Case 2 — Pattern of worsening late payments (trend = 'worsening', score < 70)", () => {
  // Payments get progressively later: 0, 0, 3, 6, 10, 14 days late
  const events: PaymentEvent[] = [
    makeEvent("2025-12-01", "2025-12-01"),  //  0 days late
    makeEvent("2026-01-01", "2026-01-01"),  //  0 days late
    makeEvent("2026-02-01", "2026-02-04"),  //  3 days late
    makeEvent("2026-03-01", "2026-03-07"),  //  6 days late
    makeEvent("2026-04-01", "2026-04-11"),  // 10 days late
    makeEvent("2026-05-01", "2026-05-15"),  // 14 days late
  ];

  const result = calculateTrustScore(events);

  assert(result.trend === "worsening", `trend = 'worsening' (got '${result.trend}')`);
  assert(result.score < 70, `score < 70 (got ${result.score})`);
  assert(
    result.tier === "C" || result.tier === "D" || result.tier === "F",
    `tier is C, D or F (got '${result.tier}')`,
  );
  assert(result.components.timeliness < 80, `timeliness < 80 (got ${result.components.timeliness})`);
});

// ─── Case 3: Empty events ─────────────────────────────────────────────────────

describe("Case 3 — No payment history (score = 70, tier = 'C', trend = 'stable')", () => {
  const result = calculateTrustScore([]);

  assert(result.score === 70, `score = 70 (got ${result.score})`);
  assert(result.tier === "C", `tier = 'C' (got '${result.tier}')`);
  assert(result.trend === "stable", `trend = 'stable' (got '${result.trend}')`);
  assert(result.sampleSize === 0, `sampleSize = 0 (got ${result.sampleSize})`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests passed`);
}
