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

When BOTH a JustPay link AND a card payment link are provided, offer BOTH options clearly:
  - JustPay link for Seylan Bank customers (instant, free)
  - Card payment link for Visa/Mastercard (any bank, worldwide)
Present them as a simple numbered choice, not as separate paragraphs.
`.trim();

export type RecoveryLanguage = "en" | "si" | "ta";

/**
 * Builds the system prompt with language-specific instructions injected at
 * runtime. Used by the draft-recovery API route.
 *
 * DEMO MOMENT: After generating the English message, the presenter clicks
 * 'සිංහල'. The textarea regenerates with the same content in Sinhala —
 * same tone, localized. This single click demonstrates deep local-market
 * product thinking and is the "wow" moment for the language feature.
 */
export function buildRecoverySystemPrompt(language: RecoveryLanguage): string {
  if (language === "en") return RECOVERY_SYSTEM;

  const langName = language === "si" ? "Sinhala" : "Tamil";
  const register =
    language === "si"
      ? "For Sinhala, use the respectful 'oba' (ඔබ) register, NOT 'thama' (තමා). Write naturally as a business owner would; never translate word-for-word."
      : "Use respectful formal Tamil business register (நீங்கள் form). Write naturally as a Sri Lankan business owner would; never translate word-for-word.";

  return (
    RECOVERY_SYSTEM +
    `

IMPORTANT: Draft the entire message in ${langName}.
Keep ONLY these in English exactly as-is (do not translate):
  - Currency amounts (e.g. LKR 185,000)
  - JustPay and the payment link URL
  - Invoice numbers (e.g. INV-2047)
  - Business names and personal names
${register}`
  );
}

const LANGUAGE_INSTRUCTION: Record<RecoveryLanguage, string> = {
  en: "",
  si: "Language: Sinhala. Draft in Sinhala using 'oba' register. Keep LKR, JustPay, invoice number, names in English.",
  ta: "Language: Tamil. Draft in Tamil using formal நீங்கள் register. Keep LKR, JustPay, invoice number, names in English.",
};

export interface RecoveryContext {
  invoice: {
    invoiceNumber: string;
    amount: number;
    daysOverdue: number;
    justpayLink: string | null;
    cardPaymentLink?: string | null;
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

  let paymentLine: string;
  if (invoice.justpayLink && invoice.cardPaymentLink) {
    paymentLine = `Payment options (include BOTH in the message):
  1. JustPay (Seylan customers, instant): ${invoice.justpayLink}
  2. Card payment — Visa/Mastercard (any bank): ${invoice.cardPaymentLink}`;
  } else if (invoice.justpayLink) {
    paymentLine = `Payment link: ${invoice.justpayLink}`;
  } else if (invoice.cardPaymentLink) {
    paymentLine = `Card payment link: ${invoice.cardPaymentLink}`;
  } else {
    paymentLine = "Ask them to make payment via CEFTS or bank transfer.";
  }

  return `
${langInstruction ? langInstruction + "\n\n" : ""}Language: ${language === "si" ? "Sinhala" : language === "ta" ? "Tamil" : "English"}
Stage ${stage} recovery message.

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

// ─── Conversational Assistant ─────────────────────────────────────────────────

export const ASSISTANT_SYSTEM = `You are FlowPilot AI's conversational assistant, helping a Sri Lankan SME
business owner understand their finances. You have access to their REAL,
LIVE financial data, provided below as JSON context.

RULES:
1. Always ground your answer in the provided data. Cite specific numbers, names, and dates.
2. Be concise. 2-4 sentences for simple questions. Maximum 1 short paragraph plus a list (3-5 items) for complex questions.
3. Use LKR currency formatting: "LKR 185,000" not "Rs 185000" or "$185000".
4. When discussing a client/supplier, lead with their name.
5. If asked about something not in the data, say "I don't have visibility into X" — never invent data.
6. When suggesting actions, be specific: "Send Stage 2 to Nexus today" not "follow up with overdue clients".
7. End complex answers with one concrete next-action recommendation.
8. NEVER provide investment advice, tax filing advice (only deadlines/amounts), or legal advice.
9. Format: use **bold** for client/supplier names and key numbers. Use bullet lists for 3+ parallel items. Never use headers (##) inside chat responses. Keep paragraphs short (2-3 sentences max).

CONTEXT:
`;

// ─── Supplier Analysis ────────────────────────────────────────────────────────

export const SUPPLIER_ANALYSIS_SYSTEM = `You are FlowPilot AI's supplier relationship analyst.
The SME owes money to suppliers. Your job: analyze whether the SME's payment
behavior is damaging key supplier relationships.

Return ONLY valid JSON:
{
  "relationship_health": "excellent"|"good"|"strained"|"critical",
  "primary_concern": "<one sentence>",
  "recommended_action": "<specific action — usually a CEFTS payment with amount and timing>",
  "estimated_impact": "low"|"medium"|"high"
}

Rules:
- Reliability < 50 + worsening = critical
- Late payments >= 3 in last 6 months = strained at minimum
- Always recommend a specific CEFTS amount and date if action needed`;

export interface SupplierAnalysisContext {
  supplier: {
    name: string;
    businessType: string;
    reliabilityScore: number;
    trend: string;
    notes: string | null;
  };
  obligations: Array<{
    reference: string;
    amount: number;
    dueDate: string;
    status: string;
    daysLate: number;
  }>;
  totalOutstanding: number;
  overdueCount: number;
  latePaymentCount: number;
}

export function buildSupplierAnalysisUserPrompt(
  ctx: SupplierAnalysisContext,
): string {
  const oblStr = ctx.obligations
    .slice(0, 6)
    .map(
      (o) =>
        `  • ${o.reference} — LKR ${o.amount.toLocaleString()} | Due: ${o.dueDate} | Status: ${o.status}${o.daysLate > 0 ? ` (${o.daysLate}d late)` : ""}`,
    )
    .join("\n") || "  None";

  return `
SUPPLIER
  Name:              ${ctx.supplier.name}
  Business type:     ${ctx.supplier.businessType}
  Reliability score: ${ctx.supplier.reliabilityScore}/100 (${ctx.supplier.trend})
  Notes:             ${ctx.supplier.notes ?? "none"}

OUR PAYMENT OBLIGATIONS
${oblStr}

EXPOSURE SUMMARY
  Total outstanding: LKR ${ctx.totalOutstanding.toLocaleString()}
  Overdue count:     ${ctx.overdueCount}
  Late in 6 months:  ${ctx.latePaymentCount}

Analyze our payment reliability as a payer and return the JSON assessment.
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
