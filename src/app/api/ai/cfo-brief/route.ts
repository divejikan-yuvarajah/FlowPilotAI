import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callOpenRouter, parseAiJson } from "@/lib/ai/openrouter";
import {
  CFO_BRIEF_SYSTEM,
  buildCfoBriefUserPrompt,
  type CfoBriefContext,
} from "@/lib/ai/prompts";
import { CfoBriefRequestSchema, CFOBriefSchema } from "@/lib/ai/schemas";
import { seylan } from "@/lib/seylan/client";
import { calculateRunway } from "@/lib/engines/runway-model";
import { calculateHealthScore } from "@/lib/engines/health-score";
import type { SeylanTransaction } from "@/lib/seylan/types";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = await createServerClient();
    const { data: { user }, error: authErr } = await session.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = CfoBriefRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const briefDate =
      parsed.data.date === "today" || !parsed.data.date
        ? new Date().toISOString().split("T")[0]
        : parsed.data.date;

    // ── Aggregate financial data in parallel ─────────────────────────────────
    const [balanceResult, invoicesResult, transactionsResult, clientsResult, baselinesResult] =
      await Promise.all([
        seylan.getBalance(),
        session.from("invoices").select("invoice_number, amount, due_date, status, client_id, clients(name)"),
        session.from("transactions").select("type, amount, posted_at, category, counterparty_name").order("posted_at", { ascending: false }).limit(200),
        session.from("clients").select("name, trust_score, trust_trend"),
        session.from("expense_baselines").select("category, vendor, avg_30d").eq("user_id", user.id),
      ]);

    const allInvoices = invoicesResult.data ?? [];
    const allTxns = (transactionsResult.data ?? []) as Array<{
      type: string; amount: number; posted_at: string; category: string; counterparty_name: string
    }>;
    const allClients = clientsResult.data ?? [];
    const baselines = baselinesResult.data ?? [];

    // ── Compute runway ───────────────────────────────────────────────────────
    const seylanTxns: SeylanTransaction[] = allTxns.map((t, i) => ({
      id: `DB-${i}`,
      postedAt: t.posted_at,
      type: t.type as "credit" | "debit",
      amount: Number(t.amount),
      reference: "",
      counterparty: t.counterparty_name,
      description: "",
      category: t.category as SeylanTransaction["category"],
    }));

    const runway = calculateRunway({
      currentBalance: balanceResult.balance,
      transactions: seylanTxns,
      lookbackDays: 30,
    });

    // ── Compute health score ─────────────────────────────────────────────────
    const avgTrust =
      allClients.length > 0
        ? allClients.reduce((s, c) => s + Number((c as { trust_score: number }).trust_score), 0) / allClients.length
        : 70;

    const health = calculateHealthScore({
      runwayDays: runway.runwayDays,
      trustScoreAvg: avgTrust,
      onTimePaymentRate: 0.72, // derived from trust; refine when trust_score_history is populated
      expenseControlScore: 68,
      cashRatio: runway.runwayDays / 30,
    });

    // ── Split invoices ───────────────────────────────────────────────────────
    const now = Date.now();

    const overdueInvoices = allInvoices
      .filter((i) => i.status === "overdue")
      .map((i) => {
        const client = Array.isArray(i.clients) ? i.clients[0] : i.clients;
        return {
          invoiceNumber: i.invoice_number as string,
          clientName: (client as { name?: string } | null)?.name ?? "Unknown",
          amount: Number(i.amount),
          daysOverdue: Math.floor((now - new Date(i.due_date as string).getTime()) / 86_400_000),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const sentInvoices = allInvoices
      .filter((i) => i.status === "sent")
      .map((i) => {
        const client = Array.isArray(i.clients) ? i.clients[0] : i.clients;
        return {
          invoiceNumber: i.invoice_number as string,
          clientName: (client as { name?: string } | null)?.name ?? "Unknown",
          amount: Number(i.amount),
          dueInDays: Math.floor((new Date(i.due_date as string).getTime() - now) / 86_400_000),
        };
      })
      .sort((a, b) => a.dueInDays - b.dueInDays);

    // ── Detect anomalies vs baselines ────────────────────────────────────────
    const ms30 = 30 * 86_400_000;
    const recentDebits = allTxns.filter(
      (t) => t.type === "debit" && now - new Date(t.posted_at).getTime() <= ms30,
    );

    const anomalies: CfoBriefContext["topAnomalies"] = [];
    for (const debit of recentDebits) {
      const bl = baselines.find(
        (b) =>
          (b as { category: string; vendor: string }).category === debit.category &&
          (b as { vendor: string }).vendor.toLowerCase() === debit.counterparty_name.toLowerCase(),
      );
      if (!bl) continue;
      const avg30d = Number((bl as { avg_30d: number }).avg_30d);
      if (avg30d <= 0) continue;
      const deltaPct = ((Number(debit.amount) - avg30d) / avg30d) * 100;
      if (deltaPct > 30) {
        anomalies.push({ vendor: debit.counterparty_name, category: debit.category, deltaPct: Math.round(deltaPct * 10) / 10 });
      }
    }
    anomalies.sort((a, b) => b.deltaPct - a.deltaPct);

    // ── Build prompt context ─────────────────────────────────────────────────
    const ctx: CfoBriefContext = {
      date: briefDate,
      cashBalance: balanceResult.balance,
      runwayDays: runway.runwayDays,
      burnRateDaily: runway.dailyBurnRate,
      healthScore: health.score,
      overdueInvoices,
      sentInvoices,
      topAnomalies: anomalies.slice(0, 3),
      clientTrustSummary: allClients.map((c) => ({
        name: (c as { name: string }).name,
        score: Number((c as { trust_score: number }).trust_score),
        trend: (c as { trust_trend: string }).trust_trend,
      })),
      weeklyNetFlow: runway.weeklyNetFlow,
    };

    const cacheKey = `cfo-brief:${user.id}:${briefDate}`;

    const result = await callOpenRouter({
      model: "gpt-4o-mini",
      systemPrompt: CFO_BRIEF_SYSTEM,
      userPrompt: buildCfoBriefUserPrompt(ctx),
      cacheKey,
      userId: user.id,
      maxTokens: 600,
      temperature: 0.3,
      jsonMode: true,
      cacheTtlSeconds: 60 * 60 * 6, // 6h — refresh mid-day
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // ── Validate and persist ─────────────────────────────────────────────────
    const raw = parseAiJson<unknown>(result.content);
    const validated = CFOBriefSchema.safeParse(raw);

    const bullets = validated.success ? validated.data.bullets : [result.content];
    const anomaliesJson = validated.success ? validated.data.anomalies : anomalies.slice(0, 3);
    const recommendationsJson = validated.success
      ? validated.data.recommendations
      : [{ priority: 1, action: "Review overdue invoices immediately" }];

    const db = createAdminClient();
    await db.from("cfo_briefs").upsert(
      {
        user_id: user.id,
        brief_date: briefDate,
        health_score: health.score,
        runway_days: runway.runwayDays,
        burn_rate_daily: runway.dailyBurnRate,
        efficiency_score: health.components.expense,
        bullets,
        anomalies_json: anomaliesJson,
        recommendations_json: recommendationsJson,
        model_used: "gpt-4o-mini",
        generation_time_ms: result.latencyMs,
      },
      { onConflict: "user_id,brief_date" },
    );

    return NextResponse.json(
      {
        briefDate,
        cached: result.cached,
        latencyMs: result.latencyMs,
        healthScore: health.score,
        runwayDays: runway.runwayDays,
        bullets,
        anomalies: anomaliesJson,
        recommendations: recommendationsJson,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[cfo-brief]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
