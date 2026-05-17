import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callOpenRouter } from "@/lib/ai/openrouter";
import {
  buildRecoverySystemPrompt,
  buildRecoveryUserPrompt,
  type RecoveryContext,
  type RecoveryLanguage,
} from "@/lib/ai/prompts";
import { env } from "@/lib/env";
import { DraftRecoveryRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = createServerClient();
    const { data: { user }, error: authErr } = await session.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const body: unknown = await req.json();
    const parsed = DraftRecoveryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { invoiceId, stage, language } = parsed.data;

    // ── Fetch invoice + client ───────────────────────────────────────────────
    const { data: invoice, error: invErr } = await session
      .from("invoices")
      .select(`
        id, invoice_number, amount, due_date, status, justpay_link,
        client_id, clients ( name, whatsapp_phone )
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

    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(invoice.due_date as string).getTime()) / 86_400_000,
      ),
    );

    // ── Build context ────────────────────────────────────────────────────────
    const cardPaymentLink = `${env.MPGS_RETURN_URL_BASE}/pay/${invoice.id as string}`;
    const ctx: RecoveryContext = {
      invoice: {
        invoiceNumber: invoice.invoice_number as string,
        amount: Number(invoice.amount),
        daysOverdue,
        justpayLink: (invoice.justpay_link as string | null) ?? null,
        cardPaymentLink,
      },
      client: {
        name: (client as { name: string }).name,
        whatsappPhone: (client as { whatsapp_phone: string | null }).whatsapp_phone ?? null,
      },
      stage: stage as 1 | 2 | 3,
      language: language as RecoveryLanguage,
    };

    const cacheKey = `draft-recovery:${invoiceId}:stage:${stage}:lang:${language}`;

    const result = await callOpenRouter({
      model: "gpt-4o-mini",
      systemPrompt: buildRecoverySystemPrompt(language as RecoveryLanguage),
      userPrompt: buildRecoveryUserPrompt(ctx),
      cacheKey,
      userId: user.id,
      maxTokens: 300,
      temperature: 0.4,
      cacheTtlSeconds: 60 * 60 * 12, // 12h — messages should feel fresh
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const message = result.content.trim();

    // ── Persist last_recovery_message + escalation_stage ────────────────────
    const db = createAdminClient();
    await db
      .from("invoices")
      .update({
        last_recovery_message: message,
        last_recovery_at: new Date().toISOString(),
        escalation_stage: String(stage) as "1" | "2" | "3",
      })
      .eq("id", invoiceId);

    return NextResponse.json(
      {
        invoiceId,
        stage,
        language,
        message,
        cached: result.cached,
        latencyMs: result.latencyMs,
        whatsappPhone: ctx.client.whatsappPhone,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[draft-recovery]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
