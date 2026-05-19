/**
 * FlowPilot AI — Fast Auto-Seed (no external API calls)
 *
 * Called from server components on first authenticated render.
 * Idempotent: returns { seeded: false } if user already has clients.
 *
 * Differences vs the manual /api/seed route:
 *   - No OpenAI calls (uses pre-written risk reasoning + CFO bullets)
 *   - No Seylan JustPay calls (uses static demo URLs)
 *   - No AI cache warming (lazy-fills on first real AI request)
 *
 * Result: ~500ms-1s total, safe to inline in page renders.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import getFixtureTransactions from "@/lib/seylan/fixtures/transactions";
import type { SeylanTransaction } from "@/lib/seylan/types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

function tsOffset(daysOffset: number, hourOffset = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hourOffset, 0, 0, 0);
  return d.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

// ─── Static JustPay demo URL ──────────────────────────────────────────────────

function justpayUrl(invoiceNumber: string): string {
  return `https://justpay.demo/inv/${invoiceNumber}`;
}

// ─── Pre-written AI risk reasoning ────────────────────────────────────────────

const RISK_REASONING: Record<string, string> = {
  "INV-2047": "Nexus Traders has shown a deteriorating payment pattern over the last 90 days (Day 14, 19, 23 late). With trust score at 52 (worsening) and 11 days overdue, escalation to a firm reminder is warranted. Recommend WhatsApp follow-up today and prepare 14-day hardstop notice.",
  "INV-2048": "Second consecutive overdue invoice from Nexus Traders reinforces the worsening pattern. At LKR 142,000 and only 4 days overdue, a stage-1 polite reminder remains appropriate, but escalate if no response within 48 hours.",
  "INV-2051": "Summit Retail typically communicates proactively when late. At 6 days overdue with a Tier B trust score of 71, this is within their normal cycle. Send a friendly check-in; expect payment within 3-5 days.",
  "INV-2060": "Ceylon Logistics is 31 days overdue with cited cash flow issues. This is the most material credit risk in the portfolio for B-tier clients. Issue a formal 14-day hardstop notice and pause further credit exposure until resolved.",
  "INV-2061": "Horizon Tech Solutions is a new client (Tier C) and this is their first major delinquency at 19 days. Trust trend is improving — recommend a CEFTS payment request before further escalation. Worth a phone call to understand context.",
  "INV-2062": "Emerald Garments is a chronic non-payer (Tier D, score 31, declining). At 45 days overdue and LKR 450k outstanding — the single largest exposure — legal escalation is the appropriate next step. Pause all credit immediately.",
  "INV-2063": "Pinnacle Holdings normally pays 2 days early. This 8-day delay is anomalous and likely operational. Send a courteous reminder citing their excellent track record; high likelihood of prompt resolution.",
  "INV-2064": "Royal Spice Exports has a known seasonal cash flow pattern in Q1. At 12 days overdue and Tier B (score 73), a firm stage-2 reminder is appropriate. Offer 7-day grace if requested, but no further extensions.",
  "INV-2065": "Starlight Hotels Group operates a 4-8 day AP cycle that systematically runs late. At 6 days, this is within their typical pattern. Stage-1 reminder appropriate; do not escalate prematurely.",
};

// ─── Automation rules (identical to /api/seed) ────────────────────────────────

const AUTOMATION_RULES = [
  { priority: 1,  name: "Early Warning",      condition_json: { metric: "runway_days", operator: "<", threshold: 30 },                                        action_json: { type: "create_alert", severity: "watch", message: "Runway below 30 days — review upcoming expenses" } },
  { priority: 2,  name: "7-Day Escalation",   condition_json: { metric: "invoice_overdue_days", operator: ">=", threshold: 7 },                               action_json: { type: "send_reminder", channel: "whatsapp", template: "overdue_7d", escalate_to: "owner" } },
  { priority: 3,  name: "14-Day Hardstop",    condition_json: { metric: "invoice_overdue_days", operator: ">=", threshold: 14 },                              action_json: { type: "block_credit", notify: true, template: "formal_notice_14d" } },
  { priority: 4,  name: "Cash Crisis Mode",   condition_json: { metric: "runway_days", operator: "<", threshold: 7 },                                         action_json: { type: "activate_crisis_mode", restrict_outgoing: true, severity: "critical" } },
  { priority: 5,  name: "Trust Demotion",     condition_json: { metric: "trust_score_drop", operator: ">=", threshold: 10, window_days: 30 },                 action_json: { type: "downgrade_risk_tier", notify_client: false } },
  { priority: 6,  name: "Auto Reward",        condition_json: { metric: "payment_days_early", operator: ">", threshold: 0 },                                  action_json: { type: "increase_trust_score", delta: 3, send_appreciation: true } },
  { priority: 7,  name: "Expense Alert",      condition_json: { metric: "expense_vs_baseline_pct", operator: ">", threshold: 50, category: "any" },           action_json: { type: "create_alert", severity: "watch", message: "Expense spike — over 50% above category average" } },
  { priority: 8,  name: "Runway Alert",       condition_json: { metric: "runway_days", operator: "<", threshold: 14 },                                        action_json: { type: "create_alert", severity: "danger", message: "14-day runway threshold breached" } },
  { priority: 9,  name: "Health Score Alert", condition_json: { metric: "health_score", operator: "<", threshold: 50 },                                       action_json: { type: "create_alert", severity: "danger", schedule_review: true } },
  { priority: 10, name: "CEFTS Auto-Suggest", condition_json: { metric: "invoice_overdue_days", operator: ">=", threshold: 3 },                               action_json: { type: "generate_cefts_transfer", auto_send: false, notify_owner: true } },
  { priority: 11, name: "Tax Deadline",       condition_json: { metric: "tax_due_days", operator: "<=", threshold: 7, tax_types: ["EPF","ETF","VAT","IRD"] }, action_json: { type: "create_alert", severity: "watch", suggest_payment: true } },
  { priority: 12, name: "QR Scan Alert",      condition_json: { event: "justpay_payment_received" },                                                          action_json: { type: "mark_invoice_paid", update_trust: true, notify_owner: true } },
];

// ─── Baseline computation ─────────────────────────────────────────────────────

interface BaselineRow {
  category: string;
  vendor: string;
  avg_30d: number;
  avg_60d: number;
  avg_90d: number;
  std_dev_30d: number;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

function computeBaselines(transactions: SeylanTransaction[]): BaselineRow[] {
  const now = Date.now();
  const ms30 = 30 * 86_400_000;
  const ms60 = 60 * 86_400_000;

  const groups = new Map<
    string,
    { cat: string; vendor: string; all: number[]; d30: number[]; d60: number[] }
  >();

  for (const t of transactions) {
    if (t.type !== "debit") continue;
    const age = now - new Date(t.postedAt).getTime();
    const cat = t.category ?? "other";
    const vendor = t.counterparty ?? "unknown";
    const key = `${cat}::${vendor}`;

    const existing = groups.get(key);
    if (existing) {
      existing.all.push(t.amount);
      if (age <= ms30) existing.d30.push(t.amount);
      if (age <= ms60) existing.d60.push(t.amount);
    } else {
      const fresh = { cat, vendor, all: [t.amount], d30: age <= ms30 ? [t.amount] : [], d60: age <= ms60 ? [t.amount] : [] };
      groups.set(key, fresh);
    }
  }

  const avg = (arr: number[], fallback: number[]) => {
    const src = arr.length ? arr : fallback;
    return src.length ? Math.round(src.reduce((s, v) => s + v, 0) / src.length) : 0;
  };

  return Array.from(groups.values()).map((g) => ({
    category: g.cat,
    vendor: g.vendor,
    avg_30d: avg(g.d30, g.all),
    avg_60d: avg(g.d60, g.all),
    avg_90d: avg([], g.all),
    std_dev_30d: Math.round(stdDev(g.d30.length ? g.d30 : g.all)),
  }));
}

// ─── Additional 90-day transactions ───────────────────────────────────────────

function buildAdditionalTransactions(userId: string) {
  const rows: {
    user_id: string;
    external_id: string;
    posted_at: string;
    type: string;
    amount: number;
    reference: string;
    counterparty_name: string;
    description: string;
    category: string;
    matched_invoice_id: string | null;
  }[] = [];

  let seq = 1;
  const tx = (
    daysOffset: number,
    type: "credit" | "debit",
    amount: number,
    counterparty: string,
    description: string,
    category: string,
    ref?: string,
    hourOffset?: number,
  ) => {
    rows.push({
      user_id: userId,
      external_id: `auto-tx-${String(seq).padStart(4, "0")}`,
      posted_at: tsOffset(daysOffset, hourOffset ?? 10),
      type,
      amount,
      reference: ref ?? `REF-AUTO-${seq}`,
      counterparty_name: counterparty,
      description,
      category,
      matched_invoice_id: null,
    });
    seq++;
  };

  // Salary & payroll
  tx(-90, "debit", 485_000, "Payroll Account", "Monthly salaries — February",           "salary");
  tx(-87, "debit",  58_200, "EPF Board",       "EPF contribution — February",            "tax");
  tx(-87, "debit",  11_640, "ETF Board",       "ETF contribution — February",            "tax");
  tx(-60, "debit", 485_000, "Payroll Account", "Monthly salaries — March",               "salary");
  tx(-57, "debit",  58_200, "EPF Board",       "EPF contribution — March",               "tax");
  tx(-57, "debit",  11_640, "ETF Board",       "ETF contribution — March",               "tax");
  tx(-30, "debit", 495_000, "Payroll Account", "Monthly salaries — April",               "salary");
  tx(-27, "debit",  59_400, "EPF Board",       "EPF contribution — April",               "tax");
  tx(-27, "debit",  11_880, "ETF Board",       "ETF contribution — April",               "tax");

  // Rent
  tx(-88, "debit",  85_000, "Colombo Commercial Properties", "Office rent — February",   "rent");
  tx(-58, "debit",  85_000, "Colombo Commercial Properties", "Office rent — March",      "rent");
  tx(-28, "debit",  85_000, "Colombo Commercial Properties", "Office rent — April",      "rent");

  // Utilities
  tx(-82, "debit",  12_450, "Dialog Axiata",   "Broadband & mobile — February",          "utilities");
  tx(-81, "debit",   8_500, "CEB",             "Electricity — February",                 "utilities");
  tx(-52, "debit",  13_200, "Dialog Axiata",   "Broadband & mobile — March",             "utilities");
  tx(-51, "debit",   9_200, "CEB",             "Electricity — March",                    "utilities");
  tx(-22, "debit",  12_450, "Dialog Axiata",   "Broadband & mobile — April",             "utilities");
  tx(-21, "debit",   8_750, "CEB",             "Electricity — April",                    "utilities");

  // Loan repayment
  tx(-89, "debit", 125_000, "Peoples Bank",    "Term loan repayment — February",         "loan_repayment");
  tx(-59, "debit", 125_000, "Peoples Bank",    "Term loan repayment — March",            "loan_repayment");
  tx(-29, "debit", 125_000, "Peoples Bank",    "Term loan repayment — April",            "loan_repayment");

  // Inventory & supplies
  tx(-85, "debit", 185_000, "Janashakthi Distributors", "Inventory restock — February batch",   "inventory");
  tx(-70, "debit", 142_500, "Ceylon Inventory Co",      "Inventory restock — March mid",        "inventory");
  tx(-55, "debit",  96_800, "Ceylon Inventory Co",      "Packaging materials — March",          "inventory");
  tx(-40, "debit", 218_000, "Janashakthi Distributors", "Inventory restock — April (spike)",    "inventory");
  tx(-25, "debit", 155_000, "Ceylon Inventory Co",      "Inventory restock — April mid",        "inventory");
  tx(-10, "debit", 172_000, "Janashakthi Distributors", "Inventory restock — May",              "inventory");

  // Office & supplies
  tx(-78, "debit",  35_000, "Lanka Freight & Cargo",    "Freight charges — February",           "supplies");
  tx(-65, "debit",  28_500, "Colombo Print House",      "Marketing materials print run",         "supplies");
  tx(-50, "debit",  42_300, "Lanka Freight & Cargo",    "Freight & delivery — March",           "supplies");
  tx(-35, "debit",  19_800, "Metro Office Supplies",    "Office stationery — Q2",               "supplies");
  tx(-18, "debit",  38_600, "Lanka Freight & Cargo",    "Freight charges — April",              "supplies");
  tx( -7, "debit",  24_200, "Colombo Print House",      "Brochure print — May",                 "supplies");

  // VAT & tax payments
  tx(-75, "debit",  85_000, "IRD Sri Lanka",   "VAT payment — Q4 previous quarter",      "tax");
  tx(-45, "debit",  92_000, "IRD Sri Lanka",   "VAT payment — Q1",                       "tax");
  tx(-15, "debit",  78_500, "IRD Sri Lanka",   "VAT payment — Q2 partial",               "tax");
  tx(-30, "debit", 145_000, "IRD Sri Lanka",   "Income tax advance payment",             "tax");

  // Revenue credits (client payments)
  tx(-85, "credit", 350_000, "Quantum Finance Ltd",   "Payment — QF-INV-0091",            "revenue", "QF-REF-0091");
  tx(-72, "credit", 280_000, "Blue Wave Exports",     "Payment — BWE-INV-0043",           "revenue", "BWE-REF-0043");
  tx(-65, "credit", 450_000, "Pinnacle Holdings",     "Payment — PH-INV-0017",            "revenue", "PH-REF-0017");
  tx(-55, "credit", 320_000, "Summit Retail",         "Payment — SR-INV-2039",            "revenue", "SR-REF-2039");
  tx(-48, "credit", 480_000, "Quantum Finance Ltd",   "Payment — QF-INV-0095",            "revenue", "QF-REF-0095");
  tx(-42, "credit", 190_000, "Royal Spice Exports",   "Payment — RSE-INV-0008",           "revenue", "RSE-REF-0008");
  tx(-35, "credit", 275_000, "Pinnacle Holdings",     "Payment — PH-INV-0021",            "revenue", "PH-REF-0021");
  tx(-22, "credit", 215_000, "Starlight Hotels Group","Payment — SH-INV-0004",            "revenue", "SH-REF-0004");
  tx(-15, "credit", 520_000, "Quantum Finance Ltd",   "Payment — QF-INV-0102",            "revenue", "QF-REF-0102");
  tx( -8, "credit", 188_000, "Summit Retail",         "Payment — SR-INV-2049",            "revenue", "SR-REF-2049");
  tx( -3, "credit", 340_000, "Royal Spice Exports",   "Payment — RSE-INV-0012",           "revenue", "RSE-REF-0012");

  // Loan disbursement
  tx(-60, "credit", 500_000, "Peoples Bank", "Working capital loan disbursement", "other", "PB-LOAN-2026-04");

  return rows;
}

// ─── Pre-written CFO bullets ──────────────────────────────────────────────────

const CFO_BULLETS = [
  "Critical: Emerald Garments (LKR 450k) is 45 days overdue — escalate to legal recovery this week.",
  "High priority: Issue 14-day hardstop on Ceylon Logistics (LKR 385k, 31 days overdue) and pause further credit.",
  "Cash position: LKR 1.25M with 14-day runway at current burn (LKR 22.3k/day). Defer non-critical inventory spend.",
  "Inventory category is 40% above 90-day baseline — Janashakthi Distributors driving the spike. Review necessity.",
  "Upside: Quantum Finance Ltd reliably pays early. Accelerate INV-2066 (LKR 520k due in 20 days) for faster cash cycle.",
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EnsureSeededResult {
  seeded: boolean;
  reason?: "already-seeded" | "client-insert-failed" | "invoice-insert-failed" | "tx-insert-failed";
  error?: string;
}

/**
 * Idempotently seed full demo dataset for a user.
 * Safe to call on every page render — exits in ~50ms if user already has data.
 */
export async function ensureSeeded(userId: string): Promise<EnsureSeededResult> {
  const db = createAdminClient();

  // ── Idempotency check ──
  const { data: existingClients } = await db
    .from("clients").select("id").eq("user_id", userId).limit(1);
  if (existingClients && existingClients.length > 0) {
    return { seeded: false, reason: "already-seeded" };
  }

  // ── STEP 1: Clients (10) ──
  const { data: insertedClients, error: clientErr } = await db
    .from("clients")
    .insert([
      { user_id: userId, name: "Nexus Traders",          business_type: "Textile manufacturer",   trust_score: 52, trust_trend: "worsening", risk_tier: "D", credit_limit: 250_000,   status: "active", ai_behavioral_notes: "Payment pattern deteriorating. Paid Day 14, 19, 23 on recent invoices. Excuses citing 'supplier delays.'" },
      { user_id: userId, name: "Summit Retail",          business_type: "Multi-store retailer",   trust_score: 71, trust_trend: "stable",    risk_tier: "B", credit_limit: 500_000,   status: "active", ai_behavioral_notes: "Reliable on schedule. Occasional 2-3 day delays. Communicates proactively when late." },
      { user_id: userId, name: "Blue Wave Exports",      business_type: "Export company",         trust_score: 89, trust_trend: "improving", risk_tier: "A", credit_limit: 1_000_000, status: "active", ai_behavioral_notes: "Pays 2-3 days BEFORE due date. Top-tier client." },
      { user_id: userId, name: "Pinnacle Holdings",      business_type: "Retail conglomerate",    trust_score: 84, trust_trend: "stable",    risk_tier: "A", credit_limit: 800_000,   status: "active", ai_behavioral_notes: "Consistently pays within 2 days of due date. Strong financial position. Ideal for extended credit line." },
      { user_id: userId, name: "Ceylon Logistics Ltd",   business_type: "Logistics & freight",    trust_score: 67, trust_trend: "declining", risk_tier: "B", credit_limit: 400_000,   status: "active", ai_behavioral_notes: "Previously reliable but showing strain over past 60 days. Cash flow issues cited. INV-2060 is now 31 days overdue." },
      { user_id: userId, name: "Horizon Tech Solutions", business_type: "IT services",            trust_score: 45, trust_trend: "improving", risk_tier: "C", credit_limit: 200_000,   status: "active", ai_behavioral_notes: "New client — limited payment history. First 2 invoices paid on time; third now 19 days overdue. Monitor closely." },
      { user_id: userId, name: "Emerald Garments (Pvt)", business_type: "Garment manufacturer",   trust_score: 31, trust_trend: "declining", risk_tier: "D", credit_limit: 150_000,   status: "active", ai_behavioral_notes: "Chronic late payer. Largest overdue balance in portfolio at LKR 450k. Has been 45 days unpaid. Legal action may be required." },
      { user_id: userId, name: "Quantum Finance Ltd",    business_type: "Financial services",     trust_score: 91, trust_trend: "stable",    risk_tier: "A", credit_limit: 1_500_000, status: "active", ai_behavioral_notes: "Exemplary payer. Always 1-2 days early. Largest revenue client. High priority for retention and upsell." },
      { user_id: userId, name: "Royal Spice Exports",    business_type: "Spice export company",   trust_score: 73, trust_trend: "stable",    risk_tier: "B", credit_limit: 450_000,   status: "active", ai_behavioral_notes: "Solid mid-tier client. Pays within terms. Seasonal cash flow fluctuations in Q1 — account for this when setting due dates." },
      { user_id: userId, name: "Starlight Hotels Group", business_type: "Hospitality",            trust_score: 58, trust_trend: "stable",    risk_tier: "C", credit_limit: 300_000,   status: "active", ai_behavioral_notes: "Hospitality sector client. Pays 4-8 days late on average, citing accounts payable cycles. INV-2065 is 6 days overdue." },
    ])
    .select("id, name");

  if (clientErr) {
    return { seeded: false, reason: "client-insert-failed", error: clientErr.message };
  }

  const clientMap = Object.fromEntries(
    (insertedClients ?? []).map((c) => [c.name as string, c.id as string]),
  );

  // ── STEP 2: Invoices (22, including 9 overdue for the Radar) ──
  const { data: insertedInvoices, error: invErr } = await db
    .from("invoices")
    .insert([
      // Nexus Traders
      { user_id: userId, client_id: clientMap["Nexus Traders"],          invoice_number: "INV-2047", amount: 185_000, issued_date: dateStr(-41), due_date: dateStr(-11), status: "overdue", risk_score: 78, escalation_stage: "2", ai_risk_reasoning: RISK_REASONING["INV-2047"], justpay_link: justpayUrl("INV-2047") },
      { user_id: userId, client_id: clientMap["Nexus Traders"],          invoice_number: "INV-2048", amount: 142_000, issued_date: dateStr(-34), due_date: dateStr(-4),  status: "overdue", risk_score: 62, escalation_stage: "1", ai_risk_reasoning: RISK_REASONING["INV-2048"], justpay_link: justpayUrl("INV-2048") },
      { user_id: userId, client_id: clientMap["Nexus Traders"],          invoice_number: "INV-2049", amount: 95_000,  issued_date: dateStr(-29), due_date: dateStr(1),   status: "sent",    risk_score: 45 },

      // Summit Retail
      { user_id: userId, client_id: clientMap["Summit Retail"],          invoice_number: "INV-2051", amount: 215_000, issued_date: dateStr(-36), due_date: dateStr(-6),  status: "overdue", risk_score: 55, escalation_stage: "1", ai_risk_reasoning: RISK_REASONING["INV-2051"], justpay_link: justpayUrl("INV-2051") },
      { user_id: userId, client_id: clientMap["Summit Retail"],          invoice_number: "INV-2052", amount: 88_000,  issued_date: dateStr(-22), due_date: dateStr(8),   status: "sent" },

      // Blue Wave Exports
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],      invoice_number: "INV-2053", amount: 425_000, issued_date: dateStr(-33), due_date: dateStr(-3),  status: "paid",    paid_at: tsOffset(-5), paid_amount: 425_000 },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],      invoice_number: "INV-2054", amount: 380_000, issued_date: dateStr(-15), due_date: dateStr(15),  status: "sent" },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],      invoice_number: "INV-2055", amount: 295_000, issued_date: dateStr(-2),  due_date: dateStr(28),  status: "sent" },

      // Ceylon Logistics Ltd — 31d overdue
      { user_id: userId, client_id: clientMap["Ceylon Logistics Ltd"],   invoice_number: "INV-2060", amount: 385_000, issued_date: dateStr(-61), due_date: dateStr(-31), status: "overdue", risk_score: 89, escalation_stage: "3", ai_risk_reasoning: RISK_REASONING["INV-2060"], justpay_link: justpayUrl("INV-2060") },
      { user_id: userId, client_id: clientMap["Ceylon Logistics Ltd"],   invoice_number: "INV-2068", amount: 220_000, issued_date: dateStr(-20), due_date: dateStr(10),  status: "sent" },

      // Horizon Tech Solutions — 19d overdue
      { user_id: userId, client_id: clientMap["Horizon Tech Solutions"], invoice_number: "INV-2061", amount: 210_000, issued_date: dateStr(-49), due_date: dateStr(-19), status: "overdue", risk_score: 74, escalation_stage: "2", ai_risk_reasoning: RISK_REASONING["INV-2061"], justpay_link: justpayUrl("INV-2061") },
      { user_id: userId, client_id: clientMap["Horizon Tech Solutions"], invoice_number: "INV-2069", amount: 145_000, issued_date: dateStr(-10), due_date: dateStr(20),  status: "sent" },

      // Emerald Garments — 45d overdue
      { user_id: userId, client_id: clientMap["Emerald Garments (Pvt)"], invoice_number: "INV-2062", amount: 450_000, issued_date: dateStr(-75), due_date: dateStr(-45), status: "overdue", risk_score: 95, escalation_stage: "3", ai_risk_reasoning: RISK_REASONING["INV-2062"], justpay_link: justpayUrl("INV-2062") },

      // Pinnacle Holdings — 8d overdue
      { user_id: userId, client_id: clientMap["Pinnacle Holdings"],      invoice_number: "INV-2063", amount: 175_000, issued_date: dateStr(-38), due_date: dateStr(-8),  status: "overdue", risk_score: 52, escalation_stage: "1", ai_risk_reasoning: RISK_REASONING["INV-2063"], justpay_link: justpayUrl("INV-2063") },
      { user_id: userId, client_id: clientMap["Pinnacle Holdings"],      invoice_number: "INV-2070", amount: 640_000, issued_date: dateStr(-5),  due_date: dateStr(25),  status: "sent" },

      // Royal Spice Exports — 12d overdue
      { user_id: userId, client_id: clientMap["Royal Spice Exports"],    invoice_number: "INV-2064", amount: 290_000, issued_date: dateStr(-42), due_date: dateStr(-12), status: "overdue", risk_score: 61, escalation_stage: "2", ai_risk_reasoning: RISK_REASONING["INV-2064"], justpay_link: justpayUrl("INV-2064") },
      { user_id: userId, client_id: clientMap["Royal Spice Exports"],    invoice_number: "INV-2071", amount: 185_000, issued_date: dateStr(-8),  due_date: dateStr(22),  status: "sent" },

      // Starlight Hotels — 6d overdue
      { user_id: userId, client_id: clientMap["Starlight Hotels Group"], invoice_number: "INV-2065", amount: 125_000, issued_date: dateStr(-36), due_date: dateStr(-6),  status: "overdue", risk_score: 44, escalation_stage: "1", ai_risk_reasoning: RISK_REASONING["INV-2065"], justpay_link: justpayUrl("INV-2065") },
      { user_id: userId, client_id: clientMap["Starlight Hotels Group"], invoice_number: "INV-2072", amount: 275_000, issued_date: dateStr(-12), due_date: dateStr(18),  status: "sent" },

      // Quantum Finance Ltd
      { user_id: userId, client_id: clientMap["Quantum Finance Ltd"],    invoice_number: "INV-2066", amount: 520_000, issued_date: dateStr(-10), due_date: dateStr(20),  status: "sent" },
      { user_id: userId, client_id: clientMap["Quantum Finance Ltd"],    invoice_number: "INV-2067", amount: 480_000, issued_date: dateStr(-50), due_date: dateStr(-20), status: "paid", paid_at: tsOffset(-22), paid_amount: 480_000 },
    ])
    .select("id, invoice_number");

  if (invErr) {
    return { seeded: false, reason: "invoice-insert-failed", error: invErr.message };
  }

  const invoiceMap = Object.fromEntries(
    (insertedInvoices ?? []).map((i) => [i.invoice_number as string, i.id as string]),
  );

  // ── STEP 3: Transactions (fixtures + 45 additional) ──
  const fixtures = getFixtureTransactions();
  const inv2053Id = invoiceMap["INV-2053"];
  let taggedInv2053 = false;

  const fixtureTxRows = fixtures.map((t) => {
    let matchedInvoiceId: string | null = null;
    if (
      !taggedInv2053 &&
      t.type === "credit" &&
      t.counterparty === "Blue Wave Exports" &&
      Math.abs(t.amount - 425_000) < 50_000
    ) {
      matchedInvoiceId = inv2053Id ?? null;
      taggedInv2053 = true;
    }
    return {
      user_id: userId,
      external_id: t.id,
      posted_at: t.postedAt,
      type: t.type,
      amount: t.amount,
      reference: t.reference,
      counterparty_name: t.counterparty,
      description: t.description,
      category: t.category ?? "other",
      matched_invoice_id: matchedInvoiceId,
    };
  });

  const additionalTxRows = buildAdditionalTransactions(userId);

  // Tag Quantum Finance paid invoice (INV-2067)
  const inv2067Id = invoiceMap["INV-2067"];
  for (const row of additionalTxRows) {
    if (
      row.type === "credit" &&
      row.counterparty_name === "Quantum Finance Ltd" &&
      Math.abs(row.amount - 480_000) < 10_000 &&
      row.matched_invoice_id === null
    ) {
      row.matched_invoice_id = inv2067Id ?? null;
      break;
    }
  }

  const allTxRows = [...fixtureTxRows, ...additionalTxRows];

  const { error: txErr } = await db.from("transactions").insert(allTxRows);
  if (txErr) {
    return { seeded: false, reason: "tx-insert-failed", error: txErr.message };
  }

  // ── STEP 4: Expense baselines ──
  const allSeylanTxns: SeylanTransaction[] = allTxRows.map((row) => ({
    id: row.external_id,
    postedAt: row.posted_at,
    type: row.type as "credit" | "debit",
    amount: row.amount,
    reference: row.reference ?? undefined,
    counterparty: row.counterparty_name ?? undefined,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
  }));

  const baselines = computeBaselines(allSeylanTxns).map((b) => ({
    ...b,
    user_id: userId,
    last_updated: nowIso(),
  }));

  const { error: baselineErr } = await db.from("expense_baselines").insert(baselines);
  if (baselineErr) console.warn("[auto-seed] expense_baselines:", baselineErr.message);

  // ── STEP 5: Automation rules ──
  const { error: rulesErr } = await db.from("automation_rules").insert(
    AUTOMATION_RULES.map((r) => ({ ...r, user_id: userId, is_active: true, trigger_count: 0 })),
  );
  if (rulesErr) console.warn("[auto-seed] automation_rules:", rulesErr.message);

  const { data: ruleRows } = await db
    .from("automation_rules").select("id, name").eq("user_id", userId);
  const ruleByName = Object.fromEntries(
    (ruleRows ?? []).map((r) => [r.name as string, r.id as string]),
  );

  // ── STEP 6: CFO brief ──
  const RUNWAY = 14;
  const BURN_DAILY = 22_300;

  const { error: briefErr } = await db.from("cfo_briefs").insert({
    user_id: userId,
    brief_date: dateStr(0),
    health_score: 48.2,
    runway_days: RUNWAY,
    burn_rate_daily: BURN_DAILY,
    efficiency_score: 63.5,
    bullets: CFO_BULLETS,
    anomalies_json: [
      { vendor: "Janashakthi Distributors", delta_pct: 40.5, category: "inventory" },
      { vendor: "IRD Sri Lanka",            delta_pct: 28.0, category: "tax" },
    ],
    recommendations_json: [
      { priority: 1, action: "Escalate Emerald Garments INV-2062 to legal — 45 days overdue, LKR 450k" },
      { priority: 2, action: "Issue 14-day hardstop on Ceylon Logistics — 31 days overdue, LKR 385k" },
      { priority: 3, action: "Send CEFTS payment request to Horizon Tech for INV-2061 — 19 days overdue" },
      { priority: 4, action: "Defer non-critical inventory spend — April spike 40% above baseline" },
      { priority: 5, action: "Accelerate Quantum Finance invoice cycle to improve cash position" },
    ],
    model_used: "preset",
    generation_time_ms: 0,
  });
  if (briefErr) console.warn("[auto-seed] cfo_briefs:", briefErr.message);

  // ── STEP 7: Alert log (13 entries) ──
  const alertRows = [
    { user_id: userId, rule_id: ruleByName["7-Day Escalation"] ?? null,   rule_name: "7-Day Escalation",   invoice_id: invoiceMap["INV-2047"] ?? null, outcome: "success",     action_taken: "WhatsApp reminder sent",                                  channel: "whatsapp", metadata: { invoice: "INV-2047", client: "Nexus Traders", overdue_days: 11 },                                triggered_at: hoursAgo(2),    outcome_at: hoursAgo(1.9) },
    { user_id: userId, rule_id: ruleByName["Early Warning"] ?? null,      rule_name: "Early Warning",                                                  outcome: "success",     action_taken: "Alert created in dashboard",                              channel: "in_app",   metadata: { runway_days: RUNWAY },                                                                          triggered_at: hoursAgo(5),    outcome_at: hoursAgo(4.9) },
    { user_id: userId, rule_id: ruleByName["Expense Alert"] ?? null,      rule_name: "Expense Alert",                                                  outcome: "success",     action_taken: "Expense spike alert created",                             channel: "in_app",   metadata: { vendor: "Janashakthi Distributors", category: "inventory", amount: 338_000, baseline: 248_000, delta_pct: 36.3 }, triggered_at: hoursAgo(8),    outcome_at: hoursAgo(7.9) },
    { user_id: userId, rule_id: ruleByName["7-Day Escalation"] ?? null,   rule_name: "7-Day Escalation",   invoice_id: invoiceMap["INV-2051"] ?? null, outcome: "no_response", action_taken: "Reminder sent — awaiting response",                       channel: "whatsapp", metadata: { invoice: "INV-2051", client: "Summit Retail", overdue_days: 6 },                                triggered_at: hoursAgo(18),   outcome_at: null },
    { user_id: userId, rule_id: ruleByName["Runway Alert"] ?? null,       rule_name: "Runway Alert",                                                   outcome: "pending",     action_taken: "Awaiting CFO acknowledgement",                            channel: "in_app",   metadata: { runway_days: RUNWAY, threshold: 14 },                                                           triggered_at: hoursAgo(0.5),  outcome_at: null },
    { user_id: userId, rule_id: ruleByName["14-Day Hardstop"] ?? null,    rule_name: "14-Day Hardstop",    invoice_id: invoiceMap["INV-2060"] ?? null, outcome: "pending",     action_taken: "Credit block queued — awaiting approval",                 channel: "in_app",   metadata: { invoice: "INV-2060", client: "Ceylon Logistics Ltd", overdue_days: 31 },                        triggered_at: hoursAgo(24),   outcome_at: null },
    { user_id: userId, rule_id: ruleByName["Trust Demotion"] ?? null,     rule_name: "Trust Demotion",                                                 outcome: "success",     action_taken: "Emerald Garments demoted from C to D tier",               channel: "in_app",   metadata: { client: "Emerald Garments (Pvt)", old_tier: "C", new_tier: "D", trust_drop: 14 },               triggered_at: hoursAgo(36),   outcome_at: hoursAgo(35.8) },
    { user_id: userId, rule_id: ruleByName["CEFTS Auto-Suggest"] ?? null, rule_name: "CEFTS Auto-Suggest", invoice_id: invoiceMap["INV-2061"] ?? null, outcome: "pending",     action_taken: "CEFTS transfer request drafted — awaiting send",          channel: "in_app",   metadata: { invoice: "INV-2061", client: "Horizon Tech Solutions", amount: 210_000 },                       triggered_at: hoursAgo(12),   outcome_at: null },
    { user_id: userId, rule_id: ruleByName["Tax Deadline"] ?? null,       rule_name: "Tax Deadline",                                                   outcome: "success",     action_taken: "VAT deadline alert sent — due in 5 days",                 channel: "in_app",   metadata: { tax_type: "VAT", due_date: dateStr(5), estimated_amount: 78_500 },                              triggered_at: hoursAgo(48),   outcome_at: hoursAgo(47.9) },
    { user_id: userId, rule_id: ruleByName["Health Score Alert"] ?? null, rule_name: "Health Score Alert",                                             outcome: "pending",     action_taken: "Health score review scheduled",                           channel: "in_app",   metadata: { health_score: 48.2, threshold: 50 },                                                            triggered_at: hoursAgo(3),    outcome_at: null },
    { user_id: userId, rule_id: ruleByName["Auto Reward"] ?? null,        rule_name: "Auto Reward",        invoice_id: invoiceMap["INV-2067"] ?? null, outcome: "success",     action_taken: "Trust score increased +3 — appreciation email sent",      channel: "email",    metadata: { invoice: "INV-2067", client: "Quantum Finance Ltd", days_early: 2, new_trust_score: 91 },       triggered_at: hoursAgo(72),   outcome_at: hoursAgo(71.9) },
    { user_id: userId, rule_id: ruleByName["Trust Demotion"] ?? null,     rule_name: "Trust Demotion",                                                 outcome: "success",     action_taken: "Nexus Traders risk tier confirmed D — credit limit reduced", channel: "in_app", metadata: { client: "Nexus Traders", trust_drop: 12, new_score: 52, old_score: 64 },                       triggered_at: hoursAgo(96),   outcome_at: hoursAgo(95.8) },
    { user_id: userId, rule_id: ruleByName["Expense Alert"] ?? null,      rule_name: "Expense Alert",                                                  outcome: "success",     action_taken: "Salary increase spike flagged for CFO review",            channel: "in_app",   metadata: { category: "salary", amount: 495_000, baseline: 485_000, delta_pct: 2.1 },                       triggered_at: hoursAgo(120),  outcome_at: hoursAgo(119.9) },
  ];

  const { error: alertErr } = await db.from("alert_log").insert(alertRows);
  if (alertErr) console.warn("[auto-seed] alert_log:", alertErr.message);

  // ── STEP 8: Suppliers (8) ──
  const { data: insertedSuppliers, error: supplierErr } = await db
    .from("suppliers")
    .insert([
      { user_id: userId, name: "Lanka Logistics",       business_type: "logistics",        payment_reliability_score: 64, trend: "worsening", relationship_status: "strained",  notes: "We've been 3-5 days late on last 4 invoices. Relationship strained.",                                ai_relationship_insight: "Consistent late payments are eroding trust. Lanka Logistics may tighten credit terms if pattern continues." },
      { user_id: userId, name: "Ceylon Inventory Co",   business_type: "inventory",        payment_reliability_score: 82, trend: "stable",    relationship_status: "active",    notes: "Reliable payer relationship. Supplier offers 30-day terms.",                                          ai_relationship_insight: "Strong payment track record. Consider negotiating extended 45-day terms given reliability." },
      { user_id: userId, name: "Dialog Axiata",         business_type: "utilities",        payment_reliability_score: 95, trend: "improving", relationship_status: "excellent", notes: "Auto-debit. Always on time.",                                                                         ai_relationship_insight: "Auto-debit ensures perfect punctuality. Excellent standing with this critical utility provider." },
      { user_id: userId, name: "Office Pro Stationery", business_type: "software",         payment_reliability_score: 71, trend: "stable",    relationship_status: "active",    notes: "Small supplier. Occasionally pay 1-2 days late.",                                                     ai_relationship_insight: "Minor delays have been tolerated so far. Keeping payments within 2 days of due date will maintain goodwill." },
      { user_id: userId, name: "Colombo Print House",   business_type: "printing",         payment_reliability_score: 82, trend: "stable",    relationship_status: "active",    notes: "Marketing collateral supplier. Good turnaround. Consistent on-time payments.",                        ai_relationship_insight: "Reliable relationship with growing volume. Negotiating a quarterly bulk discount could save 8-12% on print costs." },
      { user_id: userId, name: "Lanka Freight & Cargo", business_type: "freight",          payment_reliability_score: 55, trend: "worsening", relationship_status: "at_risk",   notes: "Two overdue obligations totalling LKR 112k. Supplier has issued late-payment warnings.",              ai_relationship_insight: "Current overdue obligations risk service interruption. Prioritise clearing OBL-0140 and OBL-0141 this week to preserve freight capacity." },
      { user_id: userId, name: "Pacific IT Solutions",  business_type: "IT",               payment_reliability_score: 91, trend: "improving", relationship_status: "excellent", notes: "Preferred IT vendor. Software licenses and support retainer. Always paid early.",                    ai_relationship_insight: "Exemplary payment history. Explore multi-year contract negotiation — preferred status will yield significant discounts." },
      { user_id: userId, name: "Metro Office Supplies", business_type: "office supplies",  payment_reliability_score: 70, trend: "stable",    relationship_status: "active",    notes: "Regular office consumables. Paid 1-2 days late twice but within tolerance.",                          ai_relationship_insight: "Stable relationship. Minor delays are within acceptable range. Setting up standing order would improve reliability score." },
    ])
    .select("id, name");

  if (supplierErr) console.warn("[auto-seed] suppliers:", supplierErr.message);

  const supplierMap = Object.fromEntries(
    (insertedSuppliers ?? []).map((s) => [s.name as string, s.id as string]),
  );

  // ── STEP 9: Supplier obligations (28) ──
  const obligationRows = [
    ...(supplierMap["Lanka Logistics"] ? [
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0095", amount: 48_500, due_date: dateStr(-30), status: "paid",    paid_at: tsOffset(-25), paid_amount: 48_500, description: "Freight charges — March batch" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0096", amount: 63_200, due_date: dateStr(-20), status: "paid",    paid_at: tsOffset(-16), paid_amount: 63_200, description: "Warehousing — March" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0097", amount: 51_800, due_date: dateStr(-10), status: "paid",    paid_at: tsOffset(-7),  paid_amount: 51_800, description: "Last-mile delivery — April batch" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0098", amount: 72_400, due_date: dateStr(-5),  status: "overdue", paid_at: null,          paid_amount: null,   description: "April freight — URGENT" },
    ] : []),
    ...(supplierMap["Ceylon Inventory Co"] ? [
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0101", amount: 185_000, due_date: dateStr(-15), status: "paid",    paid_at: tsOffset(-15), paid_amount: 185_000, description: "Inventory restock — April" },
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0102", amount: 142_500, due_date: dateStr(7),   status: "pending", paid_at: null,          paid_amount: null,    description: "May inventory order" },
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0103", amount: 96_800,  due_date: dateStr(15),  status: "pending", paid_at: null,          paid_amount: null,    description: "Packaging materials — May" },
    ] : []),
    ...(supplierMap["Dialog Axiata"] ? [
      { user_id: userId, supplier_id: supplierMap["Dialog Axiata"], reference: "OBL-0110", amount: 12_450, due_date: dateStr(-25), status: "paid",    paid_at: tsOffset(-26), paid_amount: 12_450, description: "Monthly broadband — March" },
      { user_id: userId, supplier_id: supplierMap["Dialog Axiata"], reference: "OBL-0111", amount: 12_450, due_date: dateStr(5),   status: "pending", paid_at: null,          paid_amount: null,   description: "Monthly broadband — May" },
    ] : []),
    ...(supplierMap["Office Pro Stationery"] ? [
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0120", amount: 18_700, due_date: dateStr(-18), status: "paid",    paid_at: tsOffset(-16), paid_amount: 18_700, description: "Office supplies — Q1" },
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0121", amount: 22_300, due_date: dateStr(-8),  status: "paid",    paid_at: tsOffset(-7),  paid_amount: 22_300, description: "Printer cartridges + stationery" },
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0122", amount: 15_600, due_date: dateStr(3),   status: "pending", paid_at: null,          paid_amount: null,   description: "May office supplies order" },
    ] : []),
    ...(supplierMap["Colombo Print House"] ? [
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0130", amount: 28_500, due_date: dateStr(-25), status: "paid",    paid_at: tsOffset(-25), paid_amount: 28_500, description: "Business cards & letterheads — Q1" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0131", amount: 35_200, due_date: dateStr(-10), status: "paid",    paid_at: tsOffset(-10), paid_amount: 35_200, description: "Product brochures — April run" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0132", amount: 42_000, due_date: dateStr(5),   status: "pending", paid_at: null,          paid_amount: null,   description: "Trade fair materials — May" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0133", amount: 18_750, due_date: dateStr(20),  status: "pending", paid_at: null,          paid_amount: null,   description: "Packaging inserts — June order" },
    ] : []),
    ...(supplierMap["Lanka Freight & Cargo"] ? [
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0140", amount: 67_800, due_date: dateStr(-15), status: "overdue", paid_at: null, paid_amount: null, description: "Interisland freight — March" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0141", amount: 45_000, due_date: dateStr(-8),  status: "overdue", paid_at: null, paid_amount: null, description: "Colombo port handling — April" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0142", amount: 52_300, due_date: dateStr(3),   status: "pending", paid_at: null, paid_amount: null, description: "Distribution run — May week 1" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0143", amount: 38_900, due_date: dateStr(12),  status: "pending", paid_at: null, paid_amount: null, description: "Distribution run — May week 2" },
    ] : []),
    ...(supplierMap["Pacific IT Solutions"] ? [
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0150", amount: 85_000,  due_date: dateStr(-20), status: "paid",    paid_at: tsOffset(-22), paid_amount: 85_000, description: "Software licenses — Q1 renewal" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0151", amount: 92_000,  due_date: dateStr(-5),  status: "paid",    paid_at: tsOffset(-5),  paid_amount: 92_000, description: "IT support retainer — April" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0152", amount: 78_500,  due_date: dateStr(10),  status: "pending", paid_at: null,          paid_amount: null,   description: "Cloud infrastructure — May" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0153", amount: 105_000, due_date: dateStr(25),  status: "pending", paid_at: null,          paid_amount: null,   description: "Annual cybersecurity audit" },
    ] : []),
    ...(supplierMap["Metro Office Supplies"] ? [
      { user_id: userId, supplier_id: supplierMap["Metro Office Supplies"], reference: "OBL-0160", amount: 24_200, due_date: dateStr(-12), status: "paid",    paid_at: tsOffset(-11), paid_amount: 24_200, description: "Office consumables — April" },
      { user_id: userId, supplier_id: supplierMap["Metro Office Supplies"], reference: "OBL-0161", amount: 31_500, due_date: dateStr(-3),  status: "paid",    paid_at: tsOffset(-2),  paid_amount: 31_500, description: "Furniture & equipment — May" },
      { user_id: userId, supplier_id: supplierMap["Metro Office Supplies"], reference: "OBL-0162", amount: 19_800, due_date: dateStr(8),   status: "pending", paid_at: null,          paid_amount: null,   description: "Cleaning supplies — May order" },
      { user_id: userId, supplier_id: supplierMap["Metro Office Supplies"], reference: "OBL-0163", amount: 27_600, due_date: dateStr(18),  status: "pending", paid_at: null,          paid_amount: null,   description: "Office stationery — June quarter" },
    ] : []),
  ];

  if (obligationRows.length > 0) {
    const { error: oblErr } = await db
      .from("supplier_obligations")
      .insert(obligationRows);
    if (oblErr) console.warn("[auto-seed] supplier_obligations:", oblErr.message);
  }

  return { seeded: true };
}
