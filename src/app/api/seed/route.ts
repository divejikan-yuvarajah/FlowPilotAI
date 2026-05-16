/**
 * FlowPilot AI — Demo Data Seeder
 * POST /api/seed
 *
 * Seeds a full demo dataset for the authenticated user.
 * Protected: requires valid session + DEV/PREVIEW env only.
 * Idempotent: safe to call multiple times.
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
function tsOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
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

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST() {
  if (isProductionEnv()) {
    return NextResponse.json({ error: "Seeder is disabled in production" }, { status: 403 });
  }

  // Auth check
  const sessionClient = createServerClient();
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

  // ── STEP 1: Clients ──────────────────────────────────────────────────────

  const { data: insertedClients, error: clientErr } = await db
    .from("clients")
    .insert([
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
    ])
    .select("id, name");

  if (clientErr) {
    return NextResponse.json({ error: `Client seed failed: ${clientErr.message}` }, { status: 500 });
  }

  const clientMap = Object.fromEntries(
    (insertedClients ?? []).map((c) => [c.name as string, c.id as string]),
  );

  // ── STEP 2: JustPay links + AI risk reasoning ────────────────────────────

  const [link2047, link2048, link2051] = await Promise.all([
    seylan.createJustPayLink({ amount: 185_000, description: "INV-2047 — Nexus Traders", expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 142_000, description: "INV-2048 — Nexus Traders", expiresIn: 86_400 * 7 }),
    seylan.createJustPayLink({ amount: 215_000, description: "INV-2051 — Summit Retail",  expiresIn: 86_400 * 7 }),
  ]);

  const [risk2047, risk2048, risk2051] = await Promise.all([
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Nexus Traders | Score: 52 (worsening) | Tier: D\nINV-2047 | LKR 185,000 | 11 days overdue. Pattern: 14, 19, 23 days late.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Nexus Traders | Score: 52 (worsening) | Tier: D\nINV-2048 | LKR 142,000 | 4 days overdue. Pattern: 14, 19, 23 days late.`, 200),
    callOpenRouter("gpt-4o-mini",
      `Credit risk analyst, Sri Lankan SME. 3 sentences max.\nClient: Summit Retail | Score: 71 (stable) | Tier: B\nINV-2051 | LKR 215,000 | 6 days overdue. Communicates proactively.`, 200),
  ]);
  cachedCount += 3;

  // ── STEP 3: Invoices ─────────────────────────────────────────────────────
  // Schema uses due_date (date) + issued_date (date) + paid_at (timestamptz)

  const { data: insertedInvoices, error: invErr } = await db
    .from("invoices")
    .insert([
      // Nexus Traders
      { user_id: userId, client_id: clientMap["Nexus Traders"], invoice_number: "INV-2047", amount: 185_000, issued_date: dateStr(-41), due_date: dateStr(-11), status: "overdue", risk_score: 78, ai_risk_reasoning: risk2047, justpay_link: link2047.url },
      { user_id: userId, client_id: clientMap["Nexus Traders"], invoice_number: "INV-2048", amount: 142_000, issued_date: dateStr(-34), due_date: dateStr(-4),  status: "overdue", risk_score: 62, ai_risk_reasoning: risk2048, justpay_link: link2048.url },
      { user_id: userId, client_id: clientMap["Nexus Traders"], invoice_number: "INV-2049", amount: 95_000,  issued_date: dateStr(-29), due_date: dateStr(1),   status: "sent",    risk_score: 45 },
      // Summit Retail
      { user_id: userId, client_id: clientMap["Summit Retail"],  invoice_number: "INV-2051", amount: 215_000, issued_date: dateStr(-36), due_date: dateStr(-6),  status: "overdue", risk_score: 55, ai_risk_reasoning: risk2051, justpay_link: link2051.url },
      { user_id: userId, client_id: clientMap["Summit Retail"],  invoice_number: "INV-2052", amount: 88_000,  issued_date: dateStr(-22), due_date: dateStr(8),   status: "sent" },
      // Blue Wave Exports
      { user_id: userId, client_id: clientMap["Blue Wave Exports"], invoice_number: "INV-2053", amount: 425_000, issued_date: dateStr(-33), due_date: dateStr(-3),  status: "paid", paid_at: tsOffset(-5), paid_amount: 425_000 },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"], invoice_number: "INV-2054", amount: 380_000, issued_date: dateStr(-15), due_date: dateStr(15),  status: "sent" },
      { user_id: userId, client_id: clientMap["Blue Wave Exports"], invoice_number: "INV-2055", amount: 295_000, issued_date: dateStr(-2),  due_date: dateStr(28),  status: "sent" },
    ])
    .select("id, invoice_number");

  if (invErr) {
    return NextResponse.json({ error: `Invoice seed failed: ${invErr.message}` }, { status: 500 });
  }

  const invoiceMap = Object.fromEntries(
    (insertedInvoices ?? []).map((i) => [i.invoice_number as string, i.id as string]),
  );

  // ── STEP 4: Transactions ─────────────────────────────────────────────────
  // Schema: external_id (text), counterparty_name, matched_invoice_id

  const fixtures = getFixtureTransactions();
  const inv2053Id = invoiceMap["INV-2053"];
  let taggedInv2053 = false;

  const txRows = fixtures.map((t) => {
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
      external_id: t.id,           // simulator's string ID → external_id
      posted_at: t.postedAt,
      type: t.type,
      amount: t.amount,
      reference: t.reference,
      counterparty_name: t.counterparty,  // column is counterparty_name
      description: t.description,
      category: t.category ?? "other",
      matched_invoice_id: matchedInvoiceId, // column is matched_invoice_id
    };
  });

  const { error: txErr } = await db.from("transactions").insert(txRows);
  if (txErr) {
    return NextResponse.json({ error: `Transaction seed failed: ${txErr.message}` }, { status: 500 });
  }

  // ── STEP 5: Expense baselines ────────────────────────────────────────────
  // Schema: no sample_size, uses last_updated not last_computed_at

  const baselines = computeBaselines(fixtures).map((b) => ({
    ...b,
    user_id: userId,
    last_updated: nowIso(),   // column is last_updated
  }));

  const { error: baselineErr } = await db.from("expense_baselines").insert(baselines);
  if (baselineErr) console.warn("expense_baselines warning:", baselineErr.message);

  // ── STEP 6: Automation rules ─────────────────────────────────────────────
  // Schema has priority column

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

  // ── STEP 7: CFO brief ────────────────────────────────────────────────────
  // Schema: bullets (jsonb), anomalies_json, recommendations_json,
  //         health_score, runway_days, burn_rate_daily, efficiency_score, model_used

  const overdueTotal = 185_000 + 142_000 + 215_000;
  const BALANCE = 1_247_500;
  const RUNWAY = 14;
  const BURN_DAILY = 18_500;

  const cfoBriefRaw = await callOpenRouter(
    "gpt-4o-mini",
    `AI CFO for Sri Lankan SME. Daily brief — 5 bullet points max (JSON array of strings).
Cash: LKR ${BALANCE.toLocaleString()} | Runway: ${RUNWAY} days | Overdue receivables: LKR ${overdueTotal.toLocaleString()}
Risk client: Nexus Traders (score 52, worsening). Star client: Blue Wave Exports (score 89, paid early).
Burn: LKR ${BURN_DAILY.toLocaleString()}/day. Reply ONLY with a JSON array like ["bullet1","bullet2"].`,
    300,
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
    health_score: 58.5,
    runway_days: RUNWAY,
    burn_rate_daily: BURN_DAILY,
    efficiency_score: 71.2,
    bullets,
    anomalies_json: [{ vendor: "Janashakthi Distributors", delta_pct: 36.3, category: "inventory" }],
    recommendations_json: [
      { priority: 1, action: "Chase INV-2047 immediately — 11 days overdue, LKR 185k" },
      { priority: 2, action: "Collect outstanding from Summit Retail before end of week" },
      { priority: 3, action: "Review inventory spend — 36% above baseline" },
    ],
    model_used: "gpt-4o-mini",
    generation_time_ms: 0,
  });
  if (briefErr) console.warn("cfo_briefs warning:", briefErr.message);

  // ── STEP 8: Alert log ────────────────────────────────────────────────────
  // Schema: outcome (enum), outcome_at (timestamptz), metadata (jsonb)
  // action_taken + channel are also columns

  const alertRows = [
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
  ];

  const { error: alertErr } = await db.from("alert_log").insert(alertRows);
  if (alertErr) console.warn("alert_log warning:", alertErr.message);

  // ── STEP 9: Pre-warm AI cache ─────────────────────────────────────────────
  // 3 invoices × 4 calls = 12. Results written to ai_cache for instant demo.

  const overdueInvoices = [
    { number: "INV-2047", client: "Nexus Traders", amount: 185_000, overdue: 11, trust: 52 },
    { number: "INV-2048", client: "Nexus Traders", amount: 142_000, overdue: 4,  trust: 52 },
    { number: "INV-2051", client: "Summit Retail",  amount: 215_000, overdue: 6,  trust: 71 },
  ];

  const cacheExpiry = new Date(Date.now() + 7 * 86_400_000).toISOString(); // 7 days

  type CacheJob = { cacheKey: string; model: string; promptPreview: string; prompt: string; maxTokens: number };

  const cacheJobs: CacheJob[] = overdueInvoices.flatMap((inv) => [
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

  // Run all calls in parallel, capturing responses
  const warmingResults = await Promise.all(
    cacheJobs.map((job) => callOpenRouter(job.model, job.prompt, job.maxTokens)),
  );

  // Write to ai_cache
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

  // ── STEP 10: Suppliers ────────────────────────────────────────────────────

  const { data: insertedSuppliers, error: supplierErr } = await db
    .from("suppliers")
    .insert([
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
    ])
    .select("id, name");

  if (supplierErr) {
    console.warn("suppliers seed warning:", supplierErr.message);
  }

  const supplierMap = Object.fromEntries(
    (insertedSuppliers ?? []).map((s) => [s.name as string, s.id as string]),
  );

  // ── STEP 11: Supplier obligations ─────────────────────────────────────────

  const obligationRows = supplierMap["Lanka Logistics"] ? [
    // Lanka Logistics — logistics — 4 obligations, mix of paid-late + overdue
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0095",
      amount: 48_500,
      due_date: dateStr(-30),
      status: "paid",
      paid_at: tsOffset(-25),  // 5 days late
      paid_amount: 48_500,
      description: "Freight charges — March batch",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0096",
      amount: 63_200,
      due_date: dateStr(-20),
      status: "paid",
      paid_at: tsOffset(-16),  // 4 days late
      paid_amount: 63_200,
      description: "Warehousing — March",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0097",
      amount: 51_800,
      due_date: dateStr(-10),
      status: "paid",
      paid_at: tsOffset(-7),   // 3 days late
      paid_amount: 51_800,
      description: "Last-mile delivery — April batch",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0098",
      amount: 72_400,
      due_date: dateStr(-5),
      status: "overdue",
      paid_at: null,
      paid_amount: null,
      description: "April freight — URGENT",
    },
    // Ceylon Inventory Co — inventory — 3 obligations, all on time
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0101",
      amount: 185_000,
      due_date: dateStr(-15),
      status: "paid",
      paid_at: tsOffset(-15),  // on time
      paid_amount: 185_000,
      description: "Inventory restock — April",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0102",
      amount: 142_500,
      due_date: dateStr(7),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "May inventory order",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0103",
      amount: 96_800,
      due_date: dateStr(15),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "Packaging materials — May",
    },
    // Dialog Axiata — utilities — always paid via auto-debit
    {
      user_id: userId,
      supplier_id: supplierMap["Dialog Axiata"],
      reference: "OBL-0110",
      amount: 12_450,
      due_date: dateStr(-25),
      status: "paid",
      paid_at: tsOffset(-26),  // 1 day early
      paid_amount: 12_450,
      description: "Monthly broadband — March",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Dialog Axiata"],
      reference: "OBL-0111",
      amount: 12_450,
      due_date: dateStr(5),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "Monthly broadband — May",
    },
    // Office Pro Stationery — occasional 1-2 day delays
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0120",
      amount: 18_700,
      due_date: dateStr(-18),
      status: "paid",
      paid_at: tsOffset(-16),  // 2 days late
      paid_amount: 18_700,
      description: "Office supplies — Q1",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0121",
      amount: 22_300,
      due_date: dateStr(-8),
      status: "paid",
      paid_at: tsOffset(-7),   // 1 day late
      paid_amount: 22_300,
      description: "Printer cartridges + stationery",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0122",
      amount: 15_600,
      due_date: dateStr(3),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "May office supplies order",
    },
  ] : [];

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
      transactions: txRows.length,
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
