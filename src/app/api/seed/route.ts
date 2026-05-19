/**
 * FlowPilot AI — Demo Data Seeder
 * POST /api/seed
 *
 * Seeds a full demo dataset for the authenticated user.
 * Protected: requires valid session + DEV/PREVIEW env only.
 * Idempotent: safe to call multiple times (returns 200 if already seeded).
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seylan } from "@/lib/seylan/client";
import getFixtureTransactions from "@/lib/seylan/fixtures/transactions";
import type { SeylanTransaction } from "@/lib/seylan/types";

// ─── Guards ───────────────────────────────────────────────────────────────────

function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production";
}

// ─── OpenRouter helper ────────────────────────────────────────────────────────

const OR_BASE = "https://api.openai.com/v1/chat/completions";

async function callOpenRouter(
  model: string,
  prompt: string,
  maxTokens = 400,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "[AI generation skipped — set OPENAI_API_KEY to enable]";
  }
  try {
    const res = await fetch(OR_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return `[OpenRouter error ${res.status}]`;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? "[No content]";
  } catch {
    return "[OpenRouter network error]";
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD (for `date` columns) */
function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

/** Returns full ISO-8601 (for `timestamptz` columns) */
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

// ─── Automation rules ─────────────────────────────────────────────────────────

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

// ─── Additional transactions (90-day history) ─────────────────────────────────

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
      external_id: `extra-tx-${String(seq).padStart(4, "0")}`,
      posted_at: tsOffset(daysOffset, hourOffset ?? 10),
      type,
      amount,
      reference: ref ?? `REF-EXTRA-${seq}`,
      counterparty_name: counterparty,
      description,
      category,
      matched_invoice_id: null,
    });
    seq++;
  };

  // ── Salary & payroll ──
  tx(-90, "debit", 485_000, "Payroll Account", "Monthly salaries — February",           "salary");
  tx(-87, "debit",  58_200, "EPF Board",       "EPF contribution — February",            "tax");
  tx(-87, "debit",  11_640, "ETF Board",       "ETF contribution — February",            "tax");
  tx(-60, "debit", 485_000, "Payroll Account", "Monthly salaries — March",               "salary");
  tx(-57, "debit",  58_200, "EPF Board",       "EPF contribution — March",               "tax");
  tx(-57, "debit",  11_640, "ETF Board",       "ETF contribution — March",               "tax");
  tx(-30, "debit", 495_000, "Payroll Account", "Monthly salaries — April",               "salary");
  tx(-27, "debit",  59_400, "EPF Board",       "EPF contribution — April",               "tax");
  tx(-27, "debit",  11_880, "ETF Board",       "ETF contribution — April",               "tax");

  // ── Rent ──
  tx(-88, "debit",  85_000, "Colombo Commercial Properties", "Office rent — February",   "rent");
  tx(-58, "debit",  85_000, "Colombo Commercial Properties", "Office rent — March",      "rent");
  tx(-28, "debit",  85_000, "Colombo Commercial Properties", "Office rent — April",      "rent");

  // ── Utilities ──
  tx(-82, "debit",  12_450, "Dialog Axiata",   "Broadband & mobile — February",          "utilities");
  tx(-81, "debit",   8_500, "CEB",             "Electricity — February",                 "utilities");
  tx(-52, "debit",  13_200, "Dialog Axiata",   "Broadband & mobile — March",             "utilities");
  tx(-51, "debit",   9_200, "CEB",             "Electricity — March",                    "utilities");
  tx(-22, "debit",  12_450, "Dialog Axiata",   "Broadband & mobile — April",             "utilities");
  tx(-21, "debit",   8_750, "CEB",             "Electricity — April",                    "utilities");

  // ── Loan repayment ──
  tx(-89, "debit", 125_000, "Peoples Bank",    "Term loan repayment — February",         "loan_repayment");
  tx(-59, "debit", 125_000, "Peoples Bank",    "Term loan repayment — March",            "loan_repayment");
  tx(-29, "debit", 125_000, "Peoples Bank",    "Term loan repayment — April",            "loan_repayment");

  // ── Inventory & supplies ──
  tx(-85, "debit", 185_000, "Janashakthi Distributors", "Inventory restock — February batch",   "inventory");
  tx(-70, "debit", 142_500, "Ceylon Inventory Co",      "Inventory restock — March mid",        "inventory");
  tx(-55, "debit",  96_800, "Ceylon Inventory Co",      "Packaging materials — March",          "inventory");
  tx(-40, "debit", 218_000, "Janashakthi Distributors", "Inventory restock — April (spike)",    "inventory");
  tx(-25, "debit", 155_000, "Ceylon Inventory Co",      "Inventory restock — April mid",        "inventory");
  tx(-10, "debit", 172_000, "Janashakthi Distributors", "Inventory restock — May",              "inventory");

  // ── Office & supplies ──
  tx(-78, "debit",  35_000, "Lanka Freight & Cargo",    "Freight charges — February",           "supplies");
  tx(-65, "debit",  28_500, "Colombo Print House",      "Marketing materials print run",         "supplies");
  tx(-50, "debit",  42_300, "Lanka Freight & Cargo",    "Freight & delivery — March",           "supplies");
  tx(-35, "debit",  19_800, "Metro Office Supplies",    "Office stationery — Q2",               "supplies");
  tx(-18, "debit",  38_600, "Lanka Freight & Cargo",    "Freight charges — April",              "supplies");
  tx( -7, "debit",  24_200, "Colombo Print House",      "Brochure print — May",                 "supplies");

  // ── VAT & tax payments ──
  tx(-75, "debit",  85_000, "IRD Sri Lanka",   "VAT payment — Q4 previous quarter",      "tax");
  tx(-45, "debit",  92_000, "IRD Sri Lanka",   "VAT payment — Q1",                       "tax");
  tx(-15, "debit",  78_500, "IRD Sri Lanka",   "VAT payment — Q2 partial",               "tax");
  tx(-30, "debit", 145_000, "IRD Sri Lanka",   "Income tax advance payment",             "tax");

  // ── Revenue credits (client payments) ──
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

  // ── Loan disbursement (one-off working capital) ──
  tx(-60, "credit", 500_000, "Peoples Bank", "Working capital loan disbursement", "other", "PB-LOAN-2026-04");

  return rows;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST() {
  if (isProductionEnv()) {
    return NextResponse.json({ error: "Seeder is disabled in production" }, { status: 403 });
  }

  // Auth check
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const db = createAdminClient();

  // Idempotency check
  const { data: existingClients } = await db
    .from("clients").select("id").eq("user_id", userId).limit(1);
  if (existingClients && existingClients.length > 0) {
    return NextResponse.json({ alreadySeeded: true }, { status: 200 });
  }

  const startedAt = nowIso();
  let cachedCount = 0;

  // ── STEP 1: Clients (10 total) ───────────────────────────────────────────

  const { data: insertedClients, error: clientErr } = await db
    .from("clients")
    .insert([
      // ── Original 3 ──
      {
        user_id: userId,
        name: "Nexus Traders",
        business_type: "Textile manufacturer",
        trust_score: 52,
        trust_trend: "worsening",
        risk_tier: "D",
        credit_limit: 250_000,
        status: "active",
        ai_behavioral_notes: "Payment pattern deteriorating. Paid Day 14, 19, 23 on recent invoices. Excuses citing 'supplier delays.'",
      },
      {
        user_id: userId,
        name: "Summit Retail",
        business_type: "Multi-store retailer",
        trust_score: 71,
        trust_trend: "stable",
        risk_tier: "B",
        credit_limit: 500_000,
        status: "active",
        ai_behavioral_notes: "Reliable on schedule. Occasional 2-3 day delays. Communicates proactively when late.",
      },
      {
        user_id: userId,
        name: "Blue Wave Exports",
        business_type: "Export company",
        trust_score: 89,
        trust_trend: "improving",
        risk_tier: "A",
        credit_limit: 1_000_000,
        status: "active",
        ai_behavioral_notes: "Pays 2-3 days BEFORE due date. Top-tier client.",
      },
      // ── 7 new clients ──
      {
        user_id: userId,
        name: "Pinnacle Holdings",
        business_type: "Retail conglomerate",
        trust_score: 84,
        trust_trend: "stable",
        risk_tier: "A",
        credit_limit: 800_000,
        status: "active",
        ai_behavioral_notes: "Consistently pays within 2 days of due date. Strong financial position. Ideal for extended credit line.",
      },
      {
        user_id: userId,
        name: "Ceylon Logistics Ltd",
        business_type: "Logistics & freight",
        trust_score: 67,
        trust_trend: "declining",
        risk_tier: "B",
        credit_limit: 400_000,
        status: "active",
        ai_behavioral_notes: "Previously reliable but showing strain over past 60 days. Cash flow issues cited. INV-2060 is now 31 days overdue.",
      },
      {
        user_id: userId,
        name: "Horizon Tech Solutions",
        business_type: "IT services",
        trust_score: 45,
        trust_trend: "improving",
        risk_tier: "C",
        credit_limit: 200_000,
        status: "active",
        ai_behavioral_notes: "New client — limited payment history. First 2 invoices paid on time; third now 19 days overdue. Monitor closely.",
      },
      {
        user_id: userId,
        name: "Emerald Garments (Pvt)",
        business_type: "Garment manufacturer",
        trust_score: 31,
        trust_trend: "declining",
        risk_tier: "D",
        credit_limit: 150_000,
        status: "active",
        ai_behavioral_notes: "Chronic late payer. Largest overdue balance in portfolio at LKR 450k. Has been 45 days unpaid. Legal action may be required.",
      },
      {
        user_id: userId,
        name: "Quantum Finance Ltd",
        business_type: "Financial services",
        trust_score: 91,
        trust_trend: "stable",
        risk_tier: "A",
        credit_limit: 1_500_000,
        status: "active",
        ai_behavioral_notes: "Exemplary payer. Always 1-2 days early. Largest revenue client. High priority for retention and upsell.",
      },
      {
        user_id: userId,
        name: "Royal Spice Exports",
        business_type: "Spice export company",
        trust_score: 73,
        trust_trend: "stable",
        risk_tier: "B",
        credit_limit: 450_000,
        status: "active",
        ai_behavioral_notes: "Solid mid-tier client. Pays within terms. Seasonal cash flow fluctuations in Q1 — account for this when setting due dates.",
      },
      {
        user_id: userId,
        name: "Starlight Hotels Group",
        business_type: "Hospitality",
        trust_score: 58,
        trust_trend: "stable",
        risk_tier: "C",
        credit_limit: 300_000,
        status: "active",
        ai_behavioral_notes: "Hospitality sector client. Pays 4-8 days late on average, citing accounts payable cycles. INV-2065 is 6 days overdue.",
      },
    ])
    .select("id, name");

  if (clientErr) {
    return NextResponse.json({ error: `Client seed failed: ${clientErr.message}` }, { status: 500 });
  }

  const clientMap = Object.fromEntries(
    (insertedClients ?? []).map((c) => [c.name as string, c.id as string]),
  );

  // ── STEP 2: JustPay links + AI risk reasoning (9 overdue invoices) ────────

  const [
    link2047, link2048, link2051,
    link2060, link2061, link2062,
    link2063, link2064, link2065,
  ] = await Promise.all([
    seylan.createJustPayLink({ amount: 185_000, description: "INV-2047 — Nexus Traders",        expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 142_000, description: "INV-2048 — Nexus Traders",        expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 215_000, description: "INV-2051 — Summit Retail",        expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 385_000, description: "INV-2060 — Ceylon Logistics Ltd", expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 210_000, description: "INV-2061 — Horizon Tech",         expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 450_000, description: "INV-2062 — Emerald Garments",     expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 175_000, description: "INV-2063 — Pinnacle Holdings",    expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 290_000, description: "INV-2064 — Royal Spice Exports",  expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 125_000, description: "INV-2065 — Starlight Hotels",     expiresIn: 86_400 * 7 }),
  ]);

  const [
    risk2047, risk2048, risk2051,
    risk2060, risk2061, risk2062,
    risk2063, risk2064, risk2065,
  ] = await Promise.all([
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Nexus Traders | Score: 52 (worsening) | Tier: D\nINV-2047 | LKR 185,000 | 11 days overdue. Pattern: 14, 19, 23 days late.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Nexus Traders | Score: 52 (worsening) | Tier: D\nINV-2048 | LKR 142,000 | 4 days overdue. Pattern: 14, 19, 23 days late.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Summit Retail | Score: 71 (stable) | Tier: B\nINV-2051 | LKR 215,000 | 6 days overdue. Communicates proactively.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Ceylon Logistics Ltd | Score: 67 (declining) | Tier: B\nINV-2060 | LKR 385,000 | 31 days overdue. Cash flow issues cited by client.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Horizon Tech Solutions | Score: 45 (improving) | Tier: C\nINV-2061 | LKR 210,000 | 19 days overdue. First major overdue for this client.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Emerald Garments (Pvt) | Score: 31 (declining) | Tier: D\nINV-2062 | LKR 450,000 | 45 days overdue. Chronic non-payer. Legal escalation likely.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Pinnacle Holdings | Score: 84 (stable) | Tier: A\nINV-2063 | LKR 175,000 | 8 days overdue. Usually pays early — first late payment.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Royal Spice Exports | Score: 73 (stable) | Tier: B\nINV-2064 | LKR 290,000 | 12 days overdue. Seasonal cash flow issue noted.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Starlight Hotels Group | Score: 58 (stable) | Tier: C\nINV-2065 | LKR 125,000 | 6 days overdue. Typical AP cycle delay.`, 200),
  ]);
  cachedCount += 9;

  // ── STEP 3: Invoices (22 total) ──────────────────────────────────────────

  const { data: insertedInvoices, error: invErr } = await db
    .from("invoices")
    .insert([
      // ── Nexus Traders (D-tier, worsening) ──
      { user_id: userId, client_id: clientMap["Nexus Traders"],         invoice_number: "INV-2047", amount: 185_000, issued_date: dateStr(-41), due_date: dateStr(-11), status: "overdue", risk_score: 78, escalation_stage: "2", ai_risk_reasoning: risk2047, justpay_link: link2047.url },
      { user_id: userId, client_id: clientMap["Nexus Traders"],         invoice_number: "INV-2048", amount: 142_000, issued_date: dateStr(-34), due_date: dateStr(-4),  status: "overdue", risk_score: 62, escalation_stage: "1", ai_risk_reasoning: risk2048, justpay_link: link2048.url },
      { user_id: userId, client_id: clientMap["Nexus Traders"],         invoice_number: "INV-2049", amount: 95_000,  issued_date: dateStr(-29), due_date: dateStr(1),   status: "sent",    risk_score: 45 },

      // ── Summit Retail (B-tier, stable) ──
      { user_id: userId, client_id: clientMap["Summit Retail"],         invoice_number: "INV-2051", amount: 215_000, issued_date: dateStr(-36), due_date: dateStr(-6),  status: "overdue", risk_score: 55, escalation_stage: "1", ai_risk_reasoning: risk2051, justpay_link: link2051.url },
      { user_id: userId, client_id: clientMap["Summit Retail"],         invoice_number: "INV-2052", amount: 88_000,  issued_date: dateStr(-22), due_date: dateStr(8),   status: "sent" },

      // ── Blue Wave Exports (A-tier, improving) ──
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],     invoice_number: "INV-2053", amount: 425_000, issued_date: dateStr(-33), due_date: dateStr(-3),  status: "paid",    paid_at: tsOffset(-5), paid_amount: 425_000 },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],     invoice_number: "INV-2054", amount: 380_000, issued_date: dateStr(-15), due_date: dateStr(15),  status: "sent" },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"],     invoice_number: "INV-2055", amount: 295_000, issued_date: dateStr(-2),  due_date: dateStr(28),  status: "sent" },

      // ── Ceylon Logistics Ltd (B-tier, declining) — 31 days overdue ──
      { user_id: userId, client_id: clientMap["Ceylon Logistics Ltd"],  invoice_number: "INV-2060", amount: 385_000, issued_date: dateStr(-61), due_date: dateStr(-31), status: "overdue", risk_score: 89, escalation_stage: "3", ai_risk_reasoning: risk2060, justpay_link: link2060.url },
      { user_id: userId, client_id: clientMap["Ceylon Logistics Ltd"],  invoice_number: "INV-2068", amount: 220_000, issued_date: dateStr(-20), due_date: dateStr(10),  status: "sent" },

      // ── Horizon Tech Solutions (C-tier, improving) — 19 days overdue ──
      { user_id: userId, client_id: clientMap["Horizon Tech Solutions"], invoice_number: "INV-2061", amount: 210_000, issued_date: dateStr(-49), due_date: dateStr(-19), status: "overdue", risk_score: 74, escalation_stage: "2", ai_risk_reasoning: risk2061, justpay_link: link2061.url },
      { user_id: userId, client_id: clientMap["Horizon Tech Solutions"], invoice_number: "INV-2069", amount: 145_000, issued_date: dateStr(-10), due_date: dateStr(20),  status: "sent" },

      // ── Emerald Garments (D-tier, declining) — 45 days overdue ──
      { user_id: userId, client_id: clientMap["Emerald Garments (Pvt)"], invoice_number: "INV-2062", amount: 450_000, issued_date: dateStr(-75), due_date: dateStr(-45), status: "overdue", risk_score: 95, escalation_stage: "3", ai_risk_reasoning: risk2062, justpay_link: link2062.url },

      // ── Pinnacle Holdings (A-tier, stable) — 8 days overdue ──
      { user_id: userId, client_id: clientMap["Pinnacle Holdings"],     invoice_number: "INV-2063", amount: 175_000, issued_date: dateStr(-38), due_date: dateStr(-8),  status: "overdue", risk_score: 52, escalation_stage: "1", ai_risk_reasoning: risk2063, justpay_link: link2063.url },
      { user_id: userId, client_id: clientMap["Pinnacle Holdings"],     invoice_number: "INV-2070", amount: 640_000, issued_date: dateStr(-5),  due_date: dateStr(25),  status: "sent" },

      // ── Royal Spice Exports (B-tier, stable) — 12 days overdue ──
      { user_id: userId, client_id: clientMap["Royal Spice Exports"],   invoice_number: "INV-2064", amount: 290_000, issued_date: dateStr(-42), due_date: dateStr(-12), status: "overdue", risk_score: 61, escalation_stage: "2", ai_risk_reasoning: risk2064, justpay_link: link2064.url },
      { user_id: userId, client_id: clientMap["Royal Spice Exports"],   invoice_number: "INV-2071", amount: 185_000, issued_date: dateStr(-8),  due_date: dateStr(22),  status: "sent" },

      // ── Starlight Hotels Group (C-tier, stable) — 6 days overdue ──
      { user_id: userId, client_id: clientMap["Starlight Hotels Group"], invoice_number: "INV-2065", amount: 125_000, issued_date: dateStr(-36), due_date: dateStr(-6),  status: "overdue", risk_score: 44, escalation_stage: "1", ai_risk_reasoning: risk2065, justpay_link: link2065.url },
      { user_id: userId, client_id: clientMap["Starlight Hotels Group"], invoice_number: "INV-2072", amount: 275_000, issued_date: dateStr(-12), due_date: dateStr(18),  status: "sent" },

      // ── Quantum Finance Ltd (A-tier, exemplary payer) ──
      { user_id: userId, client_id: clientMap["Quantum Finance Ltd"],   invoice_number: "INV-2066", amount: 520_000, issued_date: dateStr(-10), due_date: dateStr(20),  status: "sent" },
      { user_id: userId, client_id: clientMap["Quantum Finance Ltd"],   invoice_number: "INV-2067", amount: 480_000, issued_date: dateStr(-50), due_date: dateStr(-20), status: "paid", paid_at: tsOffset(-22), paid_amount: 480_000 },
    ])
    .select("id, invoice_number");

  if (invErr) {
    return NextResponse.json({ error: `Invoice seed failed: ${invErr.message}` }, { status: 500 });
  }

  const invoiceMap = Object.fromEntries(
    (insertedInvoices ?? []).map((i) => [i.invoice_number as string, i.id as string]),
  );

  // ── STEP 4: Transactions (fixtures + 45 additional) ──────────────────────

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

  // Tag the Quantum Finance paid invoice (INV-2067)
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
    return NextResponse.json({ error: `Transaction seed failed: ${txErr.message}` }, { status: 500 });
  }

  // ── STEP 5: Expense baselines ─────────────────────────────────────────────

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
  if (baselineErr) console.warn("expense_baselines warning:", baselineErr.message);

  // ── STEP 6: Automation rules ──────────────────────────────────────────────

  const { error: rulesErr } = await db.from("automation_rules").insert(
    AUTOMATION_RULES.map((r) => ({ ...r, user_id: userId, is_active: true, trigger_count: 0 })),
  );
  if (rulesErr) {
    return NextResponse.json({ error: `Rules seed failed: ${rulesErr.message}` }, { status: 500 });
  }

  const { data: ruleRows } = await db
    .from("automation_rules").select("id, name").eq("user_id", userId);
  const ruleByName = Object.fromEntries(
    (ruleRows ?? []).map((r) => [r.name as string, r.id as string]),
  );

  // ── STEP 7: CFO brief (updated for full dataset) ──────────────────────────

  const overdueTotal = 185_000 + 142_000 + 215_000 + 385_000 + 210_000 + 450_000 + 175_000 + 290_000 + 125_000;
  const BALANCE   = 1_247_500;
  const RUNWAY    = 14;
  const BURN_DAILY = 22_300;

  const cfoBriefRaw = await callOpenRouter(
    "gpt-4o-mini",
    `AI CFO for Sri Lankan SME. Daily brief — 5 bullet points max (JSON array of strings).
Cash: LKR ${BALANCE.toLocaleString()} | Runway: ${RUNWAY} days | Overdue receivables: LKR ${overdueTotal.toLocaleString()} across 9 invoices.
Critical clients: Emerald Garments (LKR 450k, 45d overdue, Tier D), Ceylon Logistics (LKR 385k, 31d overdue, Tier B).
At-risk: Horizon Tech (LKR 210k, 19d overdue), Royal Spice (LKR 290k, 12d overdue).
Star clients: Quantum Finance (Tier A, always early), Blue Wave Exports (Tier A, paid INV-2053 early).
Burn: LKR ${BURN_DAILY.toLocaleString()}/day. Monthly salary LKR 495k, rent LKR 85k, loan repayment LKR 125k.
Reply ONLY with a JSON array like ["bullet1","bullet2","bullet3","bullet4","bullet5"].`,
    400,
  );

  let bullets: string[];
  try {
    const jsonMatch = cfoBriefRaw.match(/\[[\s\S]*\]/);
    bullets = jsonMatch ? (JSON.parse(jsonMatch[0]) as string[]) : [cfoBriefRaw];
  } catch {
    bullets = [cfoBriefRaw];
  }

  const { error: briefErr } = await db.from("cfo_briefs").insert({
    user_id: userId,
    brief_date: dateStr(0),
    health_score: 48.2,
    runway_days: RUNWAY,
    burn_rate_daily: BURN_DAILY,
    efficiency_score: 63.5,
    bullets,
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
    model_used: "gpt-4o-mini",
    generation_time_ms: 0,
  });
  if (briefErr) console.warn("cfo_briefs warning:", briefErr.message);

  // ── STEP 8: Alert log (13 total) ──────────────────────────────────────────

  const alertRows = [
    // ── Existing 5 ──
    {
      user_id: userId,
      rule_id: ruleByName["7-Day Escalation"] ?? null,
      rule_name: "7-Day Escalation",
      invoice_id: invoiceMap["INV-2047"] ?? null,
      outcome: "success",
      action_taken: "WhatsApp reminder sent",
      channel: "whatsapp",
      metadata: { invoice: "INV-2047", client: "Nexus Traders", overdue_days: 11 },
      triggered_at: hoursAgo(2),
      outcome_at: hoursAgo(1.9),
    },
    {
      user_id: userId,
      rule_id: ruleByName["Early Warning"] ?? null,
      rule_name: "Early Warning",
      outcome: "success",
      action_taken: "Alert created in dashboard",
      channel: "in_app",
      metadata: { runway_days: RUNWAY },
      triggered_at: hoursAgo(5),
      outcome_at: hoursAgo(4.9),
    },
    {
      user_id: userId,
      rule_id: ruleByName["Expense Alert"] ?? null,
      rule_name: "Expense Alert",
      outcome: "success",
      action_taken: "Expense spike alert created",
      channel: "in_app",
      metadata: { vendor: "Janashakthi Distributors", category: "inventory", amount: 338_000, baseline: 248_000, delta_pct: 36.3 },
      triggered_at: hoursAgo(8),
      outcome_at: hoursAgo(7.9),
    },
    {
      user_id: userId,
      rule_id: ruleByName["7-Day Escalation"] ?? null,
      rule_name: "7-Day Escalation",
      invoice_id: invoiceMap["INV-2051"] ?? null,
      outcome: "no_response",
      action_taken: "Reminder sent — awaiting response",
      channel: "whatsapp",
      metadata: { invoice: "INV-2051", client: "Summit Retail", overdue_days: 6 },
      triggered_at: hoursAgo(18),
      outcome_at: null,
    },
    {
      user_id: userId,
      rule_id: ruleByName["Runway Alert"] ?? null,
      rule_name: "Runway Alert",
      outcome: "pending",
      action_taken: "Awaiting CFO acknowledgement",
      channel: "in_app",
      metadata: { runway_days: RUNWAY, threshold: 14 },
      triggered_at: hoursAgo(0.5),
      outcome_at: null,
    },
    // ── 8 new entries ──
    {
      user_id: userId,
      rule_id: ruleByName["14-Day Hardstop"] ?? null,
      rule_name: "14-Day Hardstop",
      invoice_id: invoiceMap["INV-2060"] ?? null,
      outcome: "pending",
      action_taken: "Credit block queued — awaiting approval",
      channel: "in_app",
      metadata: { invoice: "INV-2060", client: "Ceylon Logistics Ltd", overdue_days: 31 },
      triggered_at: hoursAgo(24),
      outcome_at: null,
    },
    {
      user_id: userId,
      rule_id: ruleByName["Trust Demotion"] ?? null,
      rule_name: "Trust Demotion",
      outcome: "success",
      action_taken: "Emerald Garments demoted from C to D tier",
      channel: "in_app",
      metadata: { client: "Emerald Garments (Pvt)", old_tier: "C", new_tier: "D", trust_drop: 14 },
      triggered_at: hoursAgo(36),
      outcome_at: hoursAgo(35.8),
    },
    {
      user_id: userId,
      rule_id: ruleByName["CEFTS Auto-Suggest"] ?? null,
      rule_name: "CEFTS Auto-Suggest",
      invoice_id: invoiceMap["INV-2061"] ?? null,
      outcome: "pending",
      action_taken: "CEFTS transfer request drafted — awaiting send",
      channel: "in_app",
      metadata: { invoice: "INV-2061", client: "Horizon Tech Solutions", amount: 210_000 },
      triggered_at: hoursAgo(12),
      outcome_at: null,
    },
    {
      user_id: userId,
      rule_id: ruleByName["Tax Deadline"] ?? null,
      rule_name: "Tax Deadline",
      outcome: "success",
      action_taken: "VAT deadline alert sent — due in 5 days",
      channel: "in_app",
      metadata: { tax_type: "VAT", due_date: dateStr(5), estimated_amount: 78_500 },
      triggered_at: hoursAgo(48),
      outcome_at: hoursAgo(47.9),
    },
    {
      user_id: userId,
      rule_id: ruleByName["Health Score Alert"] ?? null,
      rule_name: "Health Score Alert",
      outcome: "pending",
      action_taken: "Health score review scheduled",
      channel: "in_app",
      metadata: { health_score: 48.2, threshold: 50 },
      triggered_at: hoursAgo(3),
      outcome_at: null,
    },
    {
      user_id: userId,
      rule_id: ruleByName["Auto Reward"] ?? null,
      rule_name: "Auto Reward",
      invoice_id: invoiceMap["INV-2067"] ?? null,
      outcome: "success",
      action_taken: "Trust score increased +3 — appreciation email sent",
      channel: "email",
      metadata: { invoice: "INV-2067", client: "Quantum Finance Ltd", days_early: 2, new_trust_score: 91 },
      triggered_at: hoursAgo(72),
      outcome_at: hoursAgo(71.9),
    },
    {
      user_id: userId,
      rule_id: ruleByName["Trust Demotion"] ?? null,
      rule_name: "Trust Demotion",
      outcome: "success",
      action_taken: "Nexus Traders risk tier confirmed D — credit limit reduced",
      channel: "in_app",
      metadata: { client: "Nexus Traders", trust_drop: 12, new_score: 52, old_score: 64 },
      triggered_at: hoursAgo(96),
      outcome_at: hoursAgo(95.8),
    },
    {
      user_id: userId,
      rule_id: ruleByName["Expense Alert"] ?? null,
      rule_name: "Expense Alert",
      outcome: "success",
      action_taken: "Salary increase spike flagged for CFO review",
      channel: "in_app",
      metadata: { category: "salary", amount: 495_000, baseline: 485_000, delta_pct: 2.1 },
      triggered_at: hoursAgo(120),
      outcome_at: hoursAgo(119.9),
    },
  ];

  const { error: alertErr } = await db.from("alert_log").insert(alertRows);
  if (alertErr) console.warn("alert_log warning:", alertErr.message);

  // ── STEP 9: Pre-warm AI cache (9 invoices × 4 = 36 entries) ──────────────

  const overdueForCache = [
    { number: "INV-2047", client: "Nexus Traders",          amount: 185_000, overdue: 11, trust: 52 },
    { number: "INV-2048", client: "Nexus Traders",          amount: 142_000, overdue: 4,  trust: 52 },
    { number: "INV-2051", client: "Summit Retail",           amount: 215_000, overdue: 6,  trust: 71 },
    { number: "INV-2060", client: "Ceylon Logistics Ltd",   amount: 385_000, overdue: 31, trust: 67 },
    { number: "INV-2061", client: "Horizon Tech Solutions", amount: 210_000, overdue: 19, trust: 45 },
    { number: "INV-2062", client: "Emerald Garments (Pvt)", amount: 450_000, overdue: 45, trust: 31 },
    { number: "INV-2063", client: "Pinnacle Holdings",      amount: 175_000, overdue: 8,  trust: 84 },
    { number: "INV-2064", client: "Royal Spice Exports",    amount: 290_000, overdue: 12, trust: 73 },
    { number: "INV-2065", client: "Starlight Hotels Group", amount: 125_000, overdue: 6,  trust: 58 },
  ];

  const cacheExpiry = new Date(Date.now() + 7 * 86_400_000).toISOString();

  type CacheJob = { cacheKey: string; model: string; promptPreview: string; prompt: string; maxTokens: number };

  const cacheJobs: CacheJob[] = overdueForCache.flatMap((inv) => [
    {
      cacheKey: `analyze-risk:${inv.number}`,
      model: "gpt-4o-mini",
      promptPreview: `Risk analysis ${inv.number} — ${inv.client}`,
      prompt: `Risk analysis: ${inv.number} | ${inv.client} | LKR ${inv.amount.toLocaleString()} | ${inv.overdue}d overdue | Trust: ${inv.trust}. 2 sentences + recommended action.`,
      maxTokens: 150,
    },
    {
      cacheKey: `draft-recovery:${inv.number}:stage:1`,
      model: "gpt-4o-mini",
      promptPreview: `Recovery stage 1 ${inv.number}`,
      prompt: `Polite WhatsApp reminder (3 sentences) for ${inv.number}, ${inv.client}, LKR ${inv.amount.toLocaleString()}, ${inv.overdue} days overdue. Mention JustPay link available.`,
      maxTokens: 150,
    },
    {
      cacheKey: `draft-recovery:${inv.number}:stage:2`,
      model: "gpt-4o-mini",
      promptPreview: `Recovery stage 2 ${inv.number}`,
      prompt: `Firm escalation message (3 sentences) for ${inv.number}, ${inv.client}, LKR ${inv.amount.toLocaleString()}, ${inv.overdue} days overdue. Reference credit facility impact.`,
      maxTokens: 150,
    },
    {
      cacheKey: `draft-recovery:${inv.number}:stage:3`,
      model: "gpt-4o-mini",
      promptPreview: `Recovery stage 3 (final notice) ${inv.number}`,
      prompt: `Formal final notice (3 sentences) for ${inv.number}, ${inv.client}, LKR ${inv.amount.toLocaleString()}, ${inv.overdue} days overdue. State credit suspension in 48h if unpaid.`,
      maxTokens: 150,
    },
  ]);

  const warmingResults = await Promise.all(
    cacheJobs.map((job) => callOpenRouter(job.model, job.prompt, job.maxTokens)),
  );

  const cacheRows = cacheJobs.map((job, i) => ({
    cache_key: job.cacheKey,
    user_id: userId,
    model: job.model,
    prompt_preview: job.promptPreview,
    response: { content: warmingResults[i] },
    expires_at: cacheExpiry,
  }));

  const { error: cacheErr } = await db
    .from("ai_cache")
    .upsert(cacheRows, { onConflict: "cache_key" });
  if (cacheErr) console.warn("ai_cache seed warning:", cacheErr.message);

  cachedCount += cacheRows.length;

  // ── STEP 10: Suppliers (8 total) ──────────────────────────────────────────

  const { data: insertedSuppliers, error: supplierErr } = await db
    .from("suppliers")
    .insert([
      // ── Original 4 ──
      {
        user_id: userId,
        name: "Lanka Logistics",
        business_type: "logistics",
        payment_reliability_score: 64,
        trend: "worsening",
        relationship_status: "strained",
        notes: "We've been 3-5 days late on last 4 invoices. Relationship strained.",
        ai_relationship_insight: "Consistent late payments are eroding trust. Lanka Logistics may tighten credit terms if pattern continues.",
      },
      {
        user_id: userId,
        name: "Ceylon Inventory Co",
        business_type: "inventory",
        payment_reliability_score: 82,
        trend: "stable",
        relationship_status: "active",
        notes: "Reliable payer relationship. Supplier offers 30-day terms.",
        ai_relationship_insight: "Strong payment track record. Consider negotiating extended 45-day terms given reliability.",
      },
      {
        user_id: userId,
        name: "Dialog Axiata",
        business_type: "utilities",
        payment_reliability_score: 95,
        trend: "improving",
        relationship_status: "excellent",
        notes: "Auto-debit. Always on time.",
        ai_relationship_insight: "Auto-debit ensures perfect punctuality. Excellent standing with this critical utility provider.",
      },
      {
        user_id: userId,
        name: "Office Pro Stationery",
        business_type: "software",
        payment_reliability_score: 71,
        trend: "stable",
        relationship_status: "active",
        notes: "Small supplier. Occasionally pay 1-2 days late.",
        ai_relationship_insight: "Minor delays have been tolerated so far. Keeping payments within 2 days of due date will maintain goodwill.",
      },
      // ── 4 new suppliers ──
      {
        user_id: userId,
        name: "Colombo Print House",
        business_type: "printing",
        payment_reliability_score: 82,
        trend: "stable",
        relationship_status: "active",
        notes: "Marketing collateral supplier. Good turnaround. Consistent on-time payments.",
        ai_relationship_insight: "Reliable relationship with growing volume. Negotiating a quarterly bulk discount could save 8-12% on print costs.",
      },
      {
        user_id: userId,
        name: "Lanka Freight & Cargo",
        business_type: "freight",
        payment_reliability_score: 55,
        trend: "worsening",
        relationship_status: "at_risk",
        notes: "Two overdue obligations totalling LKR 112k. Supplier has issued late-payment warnings.",
        ai_relationship_insight: "Current overdue obligations risk service interruption. Prioritise clearing OBL-0140 and OBL-0141 this week to preserve freight capacity.",
      },
      {
        user_id: userId,
        name: "Pacific IT Solutions",
        business_type: "IT",
        payment_reliability_score: 91,
        trend: "improving",
        relationship_status: "excellent",
        notes: "Preferred IT vendor. Software licenses and support retainer. Always paid early.",
        ai_relationship_insight: "Exemplary payment history. Explore multi-year contract negotiation — preferred status will yield significant discounts.",
      },
      {
        user_id: userId,
        name: "Metro Office Supplies",
        business_type: "office supplies",
        payment_reliability_score: 70,
        trend: "stable",
        relationship_status: "active",
        notes: "Regular office consumables. Paid 1-2 days late twice but within tolerance.",
        ai_relationship_insight: "Stable relationship. Minor delays are within acceptable range. Setting up standing order would improve reliability score.",
      },
    ])
    .select("id, name");

  if (supplierErr) {
    console.warn("suppliers seed warning:", supplierErr.message);
  }

  const supplierMap = Object.fromEntries(
    (insertedSuppliers ?? []).map((s) => [s.name as string, s.id as string]),
  );

  // ── STEP 11: Supplier obligations (28 total) ──────────────────────────────

  const obligationRows = [
    // ── Lanka Logistics (4) ──
    ...(supplierMap["Lanka Logistics"] ? [
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0095", amount: 48_500, due_date: dateStr(-30), status: "paid",    paid_at: tsOffset(-25), paid_amount: 48_500, description: "Freight charges — March batch" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0096", amount: 63_200, due_date: dateStr(-20), status: "paid",    paid_at: tsOffset(-16), paid_amount: 63_200, description: "Warehousing — March" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0097", amount: 51_800, due_date: dateStr(-10), status: "paid",    paid_at: tsOffset(-7),  paid_amount: 51_800, description: "Last-mile delivery — April batch" },
      { user_id: userId, supplier_id: supplierMap["Lanka Logistics"], reference: "OBL-0098", amount: 72_400, due_date: dateStr(-5),  status: "overdue", paid_at: null,          paid_amount: null,   description: "April freight — URGENT" },
    ] : []),

    // ── Ceylon Inventory Co (3) ──
    ...(supplierMap["Ceylon Inventory Co"] ? [
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0101", amount: 185_000, due_date: dateStr(-15), status: "paid",    paid_at: tsOffset(-15), paid_amount: 185_000, description: "Inventory restock — April" },
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0102", amount: 142_500, due_date: dateStr(7),   status: "pending", paid_at: null,          paid_amount: null,    description: "May inventory order" },
      { user_id: userId, supplier_id: supplierMap["Ceylon Inventory Co"], reference: "OBL-0103", amount: 96_800,  due_date: dateStr(15),  status: "pending", paid_at: null,          paid_amount: null,    description: "Packaging materials — May" },
    ] : []),

    // ── Dialog Axiata (2) ──
    ...(supplierMap["Dialog Axiata"] ? [
      { user_id: userId, supplier_id: supplierMap["Dialog Axiata"], reference: "OBL-0110", amount: 12_450, due_date: dateStr(-25), status: "paid",    paid_at: tsOffset(-26), paid_amount: 12_450, description: "Monthly broadband — March" },
      { user_id: userId, supplier_id: supplierMap["Dialog Axiata"], reference: "OBL-0111", amount: 12_450, due_date: dateStr(5),   status: "pending", paid_at: null,          paid_amount: null,   description: "Monthly broadband — May" },
    ] : []),

    // ── Office Pro Stationery (3) ──
    ...(supplierMap["Office Pro Stationery"] ? [
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0120", amount: 18_700, due_date: dateStr(-18), status: "paid",    paid_at: tsOffset(-16), paid_amount: 18_700, description: "Office supplies — Q1" },
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0121", amount: 22_300, due_date: dateStr(-8),  status: "paid",    paid_at: tsOffset(-7),  paid_amount: 22_300, description: "Printer cartridges + stationery" },
      { user_id: userId, supplier_id: supplierMap["Office Pro Stationery"], reference: "OBL-0122", amount: 15_600, due_date: dateStr(3),   status: "pending", paid_at: null,          paid_amount: null,   description: "May office supplies order" },
    ] : []),

    // ── Colombo Print House (4 new) ──
    ...(supplierMap["Colombo Print House"] ? [
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0130", amount: 28_500, due_date: dateStr(-25), status: "paid",    paid_at: tsOffset(-25), paid_amount: 28_500, description: "Business cards & letterheads — Q1" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0131", amount: 35_200, due_date: dateStr(-10), status: "paid",    paid_at: tsOffset(-10), paid_amount: 35_200, description: "Product brochures — April run" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0132", amount: 42_000, due_date: dateStr(5),   status: "pending", paid_at: null,          paid_amount: null,   description: "Trade fair materials — May" },
      { user_id: userId, supplier_id: supplierMap["Colombo Print House"], reference: "OBL-0133", amount: 18_750, due_date: dateStr(20),  status: "pending", paid_at: null,          paid_amount: null,   description: "Packaging inserts — June order" },
    ] : []),

    // ── Lanka Freight & Cargo (4 new) ──
    ...(supplierMap["Lanka Freight & Cargo"] ? [
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0140", amount: 67_800, due_date: dateStr(-15), status: "overdue", paid_at: null,          paid_amount: null,   description: "Interisland freight — March" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0141", amount: 45_000, due_date: dateStr(-8),  status: "overdue", paid_at: null,          paid_amount: null,   description: "Colombo port handling — April" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0142", amount: 52_300, due_date: dateStr(3),   status: "pending", paid_at: null,          paid_amount: null,   description: "Distribution run — May week 1" },
      { user_id: userId, supplier_id: supplierMap["Lanka Freight & Cargo"], reference: "OBL-0143", amount: 38_900, due_date: dateStr(12),  status: "pending", paid_at: null,          paid_amount: null,   description: "Distribution run — May week 2" },
    ] : []),

    // ── Pacific IT Solutions (4 new) ──
    ...(supplierMap["Pacific IT Solutions"] ? [
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0150", amount: 85_000, due_date: dateStr(-20), status: "paid",    paid_at: tsOffset(-22), paid_amount: 85_000, description: "Software licenses — Q1 renewal" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0151", amount: 92_000, due_date: dateStr(-5),  status: "paid",    paid_at: tsOffset(-5),  paid_amount: 92_000, description: "IT support retainer — April" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0152", amount: 78_500, due_date: dateStr(10),  status: "pending", paid_at: null,          paid_amount: null,   description: "Cloud infrastructure — May" },
      { user_id: userId, supplier_id: supplierMap["Pacific IT Solutions"], reference: "OBL-0153", amount: 105_000,due_date: dateStr(25),  status: "pending", paid_at: null,          paid_amount: null,   description: "Annual cybersecurity audit" },
    ] : []),

    // ── Metro Office Supplies (4 new) ──
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
    if (oblErr) console.warn("supplier_obligations seed warning:", oblErr.message);
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  return NextResponse.json(
    {
      seeded: true,
      startedAt,
      completedAt: nowIso(),
      clients: (insertedClients ?? []).length,
      invoices: (insertedInvoices ?? []).length,
      transactions: allTxRows.length,
      baselines: baselines.length,
      rules: AUTOMATION_RULES.length,
      briefs: 1,
      alerts: alertRows.length,
      cached: cachedCount,
      suppliers: (insertedSuppliers ?? []).length,
      supplierObligations: obligationRows.length,
    },
    { status: 201 },
  );
}
