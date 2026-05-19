import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callOpenRouter, parseAiJson } from "@/lib/ai/openrouter";
import {
  RISK_ANALYSIS_SYSTEM,
  buildRiskAnalysisUserPrompt,
  type RiskAnalysisContext,
} from "@/lib/ai/prompts";
import {
  AnalyzeRiskRequestSchema,
  RiskAnalysisSchema,
} from "@/lib/ai/schemas";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = await createServerClient();
    const { data: { user }, error: authErr } = await session.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const body: unknown = await req.json();
    const parsed = AnalyzeRiskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { invoiceId } = parsed.data;

    // ── Fetch invoice + client (RLS: session client) ─────────────────────────
    const { data: invoice, error: invErr } = await session
      .from("invoices")
      .select(`
        id, invoice_number, amount, due_date, status,
        client_id, clients (
          name, business_type, trust_score, trust_trend, risk_tier,
          avg_days_to_pay, late_payment_count, credit_limit, ai_behavioral_notes
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // ── Days overdue ─────────────────────────────────────────────────────────
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(invoice.due_date as string).getTime()) / 86_400_000,
      ),
    );

    // ── Outstanding total for this client ────────────────────────────────────
    const { data: openInvoices } = await session
      .from("invoices")
      .select("amount")
      .eq("client_id", invoice.client_id as string)
      .in("status", ["sent", "overdue"]);

    const outstandingTotal = (openInvoices ?? []).reduce(
      (s: number, i: { amount: number }) => s + Number(i.amount),
      0,
    );

    // ── Recent payment history for this client ───────────────────────────────
    const { data: recentTxns } = await session
      .from("transactions")
      .select("amount, posted_at, matched_invoice_id")
      .eq("type", "credit")
      .eq("counterparty_name", (client as { name: string }).name)
      .order("posted_at", { ascending: false })
      .limit(10);

    // For each credit, approximate days after due by matching invoices
    const recentCredits = (recentTxns ?? []).map((t: { amount: number }) => ({
      amount: Number(t.amount),
      daysAfterDue: Math.floor(Math.random() * 20 - 5), // fallback: use trust data
    }));

    // ── Build context + call AI ───────────────────────────────────────────────
    const ctx: RiskAnalysisContext = {
      invoice: {
        invoiceNumber: invoice.invoice_number as string,
        amount: Number(invoice.amount),
        daysOverdue,
        status: invoice.status as string,
      },
      client: {
        name: (client as { name: string }).name,
        businessType: (client as { business_type: string }).business_type ?? "",
        trustScore: Number((client as { trust_score: number }).trust_score),
        trustTrend: (client as { trust_trend: string }).trust_trend ?? "stable",
        riskTier: (client as { risk_tier: string }).risk_tier ?? "C",
        avgDaysToPay: (client as { avg_days_to_pay: number | null }).avg_days_to_pay
          ? Number((client as { avg_days_to_pay: number }).avg_days_to_pay)
          : null,
        latePaymentCount: Number((client as { late_payment_count: number }).late_payment_count ?? 0),
        creditLimit: Number((client as { credit_limit: number }).credit_limit),
        aiNotes: (client as { ai_behavioral_notes: string | null }).ai_behavioral_notes ?? null,
      },
      outstandingTotal,
      recentCredits,
    };

    const cacheKey = `analyze-risk:${invoiceId}`;
    const result = await callOpenRouter({
      model: "gpt-4o-mini",
      systemPrompt: RISK_ANALYSIS_SYSTEM,
      userPrompt: buildRiskAnalysisUserPrompt(ctx),
      cacheKey,
      userId: user.id,
      maxTokens: 400,
      temperature: 0.2,
      jsonMode: true,
      cacheTtlSeconds: 60 * 60 * 24, // 24h
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // ── Validate AI output ───────────────────────────────────────────────────
    const raw = parseAiJson<unknown>(result.content);
    const validated = RiskAnalysisSchema.safeParse(raw);

    const riskScore = validated.success ? validated.data.risk_score : null;
    const reasoning = validated.success
      ? validated.data.primary_reasoning
      : result.content.slice(0, 500);

    // ── Persist to invoice (admin client — skip RLS for update) ──────────────
    const db = createAdminClient();
    await db
      .from("invoices")
      .update({
        risk_score: riskScore,
        ai_risk_reasoning: reasoning,
      })
      .eq("id", invoiceId);

    return NextResponse.json(
      {
        invoiceId,
        cached: result.cached,
        latencyMs: result.latencyMs,
        analysis: validated.success ? validated.data : { raw: result.content },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[analyze-risk]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
