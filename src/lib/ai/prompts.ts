/**
 * FlowPilot AI — Prompt Library
 * CTO Blueprint §7.2
 *
 * All system prompts and user-prompt builders are colocated here so
 * token counts and phrasing can be tuned without touching route files.
 */

// ─── Shared context ───────────────────────────────────────────────────────────

const SRI_LANKA_CONTEXT = `
You are an AI assistant embedded in FlowPilot AI, a financial operations platform
built for Sri Lankan SMEs. All amounts are in LKR (Sri Lankan Rupees). Businesses
operate under local norms: 30-day payment terms are standard, CEFTS and JustPay
are the primary payment rails, and relationships matter in collections.
`.trim();

// ─── Risk Analysis ────────────────────────────────────────────────────────────

export const RISK_ANALYSIS_SYSTEM = `
${SRI_LANKA_CONTEXT}

You are a credit risk analyst. When given an invoice and client profile, you output
a structured JSON risk assessment. Be concise and data-driven. Base your score on
payment history, days overdue, trust trend, and outstanding exposure.

Always respond with valid JSON matching this exact structure — no prose, no markdown:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": <integer 0-100, higher = riskier>,
  "default_probability": <float 0.0-1.0>,
  "primary_reasoning": "<2-3 sentence explanation citing specific data points>",
  "recommended_stage": <1 | 2 | 3>,
  "recommended_action": "<one concrete action the business owner should take today>"
}
`.trim();

export interface RiskAnalysisContext {
  invoice: {
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    status: string;
  };
  client: {
    name: string;
    businessType: string;
    trustScore: number;
    trustTrend: string;
    riskTier: string;
    avgDaysToPay: number | null;
    latePaymentCount: number;
    creditLimit: number;
    aiNotes: string | null;
  };
  outstandingTotal: number; // all unpaid invoices for this client
  recentCredits: Array<{ amount: number; daysAfterDue: number }>;
}

export function buildRiskAnalysisUserPrompt(ctx: RiskAnalysisContext): string {
  const { invoice, client, outstandingTotal, recentCredits } = ctx;

  const paymentHistory =
    recentCredits.length > 0
      ? recentCredits
          .slice(0, 5)
          .map((p) =>
            p.daysAfterDue <= 0
              ? `Paid ${Math.abs(p.daysAfterDue)} days early`
              : p.daysAfterDue === 0
                ? "Paid on time"
                : `Paid ${p.daysAfterDue} days late`,
          )
          .join(", ")
      : "No prior payment history";

  return `
INVOICE
  Number:       ${invoice.invoiceNumber}
  Amount:       LKR ${invoice.amount.toLocaleString()}
  Days overdue: ${invoice.daysOverdue}
  Status:       ${invoice.status}

CLIENT
  Name:               ${client.name}
  Business type:      ${client.businessType}
  Trust score:        ${client.trustScore}/100 (${client.trustTrend})
  Risk tier:          ${client.riskTier}
  Avg days to pay:    ${client.avgDaysToPay ?? "unknown"}
  Late payment count: ${client.latePaymentCount}
  Credit limit:       LKR ${client.creditLimit.toLocaleString()}
  AI notes:           ${client.aiNotes ?? "none"}

EXPOSURE
  This invoice:       LKR ${invoice.amount.toLocaleString()}
  Total outstanding:  LKR ${outstandingTotal.toLocaleString()}

RECENT PAYMENT HISTORY (newest first)
  ${paymentHistory}

Assess the risk and respond with the JSON structure specified.
  `.trim();
}

// ─── Recovery Message ─────────────────────────────────────────────────────────

export const RECOVERY_SYSTEM = `
${SRI_LANKA_CONTEXT}

You draft payment recovery messages for overdue invoices. Your tone must match the
escalation stage:
  Stage 1 — Friendly reminder. Assume it slipped through. Offer easy payment via JustPay.
  Stage 2 — Firm and professional. Note credit facility may be impacted. Be direct.
  Stage 3 — Final notice. Legal language. Credit suspended immediately if not settled in 48h.

Keep messages short (3-4 sentences max). Always include: invoice number, amount in LKR,
and a call-to-action. Never threaten legal action at stage 1 or 2.
`.trim();

export type RecoveryLanguage = "en" | "si" | "ta";

const LANGUAGE_INSTRUCTION: Record<RecoveryLanguage, string> = {
  en: "",
  si: "Draft the message in Sinhala. Keep technical terms (LKR, JustPay, invoice number, owner name, business name) in English. Use a natural business tone appropriate for a Sri Lankan SME.",
  ta: "Draft the message in Tamil. Keep technical terms (LKR, JustPay, invoice number, owner name, business name) in English. Use a natural business tone appropriate for a Sri Lankan SME.",
};

export interface RecoveryContext {
  invoice: {
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    justpayLink: string | null;
  };
  client: {
    name: string;
    whatsappPhone: string | null;
  };
  stage: 1 | 2 | 3;
  language: RecoveryLanguage;
  businessName?: string;
}

export function buildRecoveryUserPrompt(ctx: RecoveryContext): string {
  const { invoice, client, stage, language, businessName } = ctx;
  const langInstruction = LANGUAGE_INSTRUCTION[language];
  const paymentLine = invoice.justpayLink
    ? `Payment link: ${invoice.justpayLink}`
    : "Ask them to make payment via CEFTS or bank transfer.";

  return `
${langInstruction ? langInstruction + "\n\n" : ""}Stage ${stage} recovery message.

Invoice:    ${invoice.invoiceNumber}
Amount:     LKR ${invoice.amount.toLocaleString()}
Overdue:    ${invoice.daysOverdue} days
Client:     ${client.name}
${businessName ? `Our business: ${businessName}` : ""}
${paymentLine}

Write the message now.
  `.trim();
}

// ─── CFO Brief ────────────────────────────────────────────────────────────────

export const CFO_BRIEF_SYSTEM = `
${SRI_LANKA_CONTEXT}

You are an AI CFO assistant. Each day you produce a concise financial brief for
the business owner. The brief must be practical and action-oriented — not generic.
Reference specific numbers, client names, and time-sensitive items.

Respond with valid JSON only:
{
  "bullets": ["<key insight 1>", "<key insight 2>", ...],    // 4-6 bullets
  "anomalies": [
    { "vendor": "<name>", "category": "<category>", "delta_pct": <number> }
  ],
  "recommendations": [
    { "priority": 1, "action": "<specific action>" },
    ...
  ]
}
`.trim();

export interface CfoBriefContext {
  date: string;
  cashBalance: number;
  runwayDays: number;
  burnRateDaily: number;
  healthScore: number;
  overdueInvoices: Array<{ invoiceNumber: string; clientName: string; amount: number; daysOverdue: number }>;
  sentInvoices: Array<{ invoiceNumber: string; clientName: string; amount: number; dueInDays: number }>;
  topAnomalies: Array<{ vendor: string; category: string; deltaPct: number }>;
  clientTrustSummary: Array<{ name: string; score: number; trend: string }>;
  weeklyNetFlow: number;
}

export function buildCfoBriefUserPrompt(ctx: CfoBriefContext): string {
  const overdueStr = ctx.overdueInvoices
    .map((i) => `  • ${i.invoiceNumber} — ${i.clientName} — LKR ${i.amount.toLocaleString()} (${i.daysOverdue}d overdue)`)
    .join("\n") || "  None";

  const sentStr = ctx.sentInvoices
    .slice(0, 5)
    .map((i) => `  • ${i.invoiceNumber} — ${i.clientName} — LKR ${i.amount.toLocaleString()} (due in ${i.dueInDays}d)`)
    .join("\n") || "  None";

  const anomalyStr = ctx.topAnomalies
    .slice(0, 3)
    .map((a) => `  • ${a.vendor} (${a.category}): +${a.deltaPct.toFixed(1)}% above baseline`)
    .join("\n") || "  None detected";

  const trustStr = ctx.clientTrustSummary
    .map((c) => `  • ${c.name}: ${c.score}/100 (${c.trend})`)
    .join("\n");

  return `
Date:             ${ctx.date}
Cash balance:     LKR ${ctx.cashBalance.toLocaleString()}
Runway:           ${ctx.runwayDays} days
Daily burn rate:  LKR ${ctx.burnRateDaily.toLocaleString()}
Weekly net flow:  LKR ${ctx.weeklyNetFlow.toLocaleString()}
Health score:     ${ctx.healthScore.toFixed(1)}/100

OVERDUE INVOICES
${overdueStr}

UPCOMING RECEIVABLES
${sentStr}

EXPENSE ANOMALIES (vs 30-day baseline)
${anomalyStr}

CLIENT TRUST
${trustStr}

Generate the daily CFO brief JSON now.
  `.trim();
}

// ─── Survival Plan ────────────────────────────────────────────────────────────

export const SURVIVAL_PLAN_SYSTEM = `
${SRI_LANKA_CONTEXT}

You are a crisis CFO. Given a stress scenario with client defaults and
revenue/expense shocks, you output a prioritised 5-action survival plan.

Respond with valid JSON only:
{
  "severity": "watch" | "danger" | "critical",
  "runwayWithShock": <integer days>,
  "actions": [
    {
      "priority": 1,
      "category": "<e.g. Collections | Cost Cut | Financing | Cash>",
      "action": "<specific action>",
      "impact": "<expected LKR or days impact>",
      "timeframe": "<e.g. Today | This week | 30 days>"
    }
  ]
}
`.trim();

export interface SurvivalPlanContext {
  currentBalance: number;
  currentRunway: number;
  runwayAfterShock: number;
  defaultedClients: Array<{ name: string; outstandingAmount: number }>;
  expenseShockPct: number;
  revenueShockPct: number;
  totalDefaultExposure: number;
  newBurnRateDaily: number;
}

export function buildSurvivalPlanUserPrompt(ctx: SurvivalPlanContext): string {
  const clientStr = ctx.defaultedClients
    .map((c) => `  • ${c.name} — LKR ${c.outstandingAmount.toLocaleString()} at risk`)
    .join("\n") || "  None specified";

  return `
STRESS SCENARIO

Current cash:         LKR ${ctx.currentBalance.toLocaleString()}
Current runway:       ${ctx.currentRunway} days
Runway after shock:   ${ctx.runwayAfterShock} days

Revenue shock:        -${ctx.revenueShockPct}% of expected inflows
Expense shock:        +${ctx.expenseShockPct}% of current burn
New burn rate:        LKR ${ctx.newBurnRateDaily.toLocaleString()}/day

DEFAULTED / AT-RISK CLIENTS
${clientStr}

Total exposure lost:  LKR ${ctx.totalDefaultExposure.toLocaleString()}

Provide the 5-action survival plan JSON. Prioritise by immediacy and LKR impact.
  `.trim();
}
