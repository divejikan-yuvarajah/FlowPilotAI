import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { callOpenRouter, parseAiJson } from "@/lib/ai/openrouter";
import {
  SURVIVAL_PLAN_SYSTEM,
  buildSurvivalPlanUserPrompt,
  type SurvivalPlanContext,
} from "@/lib/ai/prompts";
import { SurvivalPlanRequestSchema, SurvivalPlanSchema, type SurvivalPlanOutput } from "@/lib/ai/schemas";
import { seylan } from "@/lib/seylan/client";
import { calculateRunway } from "@/lib/engines/runway-model";
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
    const body: unknown = await req.json();
    const parsed = SurvivalPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { defaultedClientIds, expenseShockPct, revenueShockPct } = parsed.data;

    // ── Fetch data in parallel ───────────────────────────────────────────────
    const [balanceResult, txnsResult, defaultedClientsResult] = await Promise.all([
      seylan.getBalance(),
      session
        .from("transactions")
        .select("type, amount, posted_at, counterparty_name")
        .order("posted_at", { ascending: false })
        .limit(200),
      session
        .from("clients")
        .select("id, name, trust_score")
        .in("id", defaultedClientIds),
    ]);

    const allTxns = (txnsResult.data ?? []) as Array<{
      type: string; amount: number; posted_at: string; counterparty_name: string
    }>;

    const defaultedClients = (defaultedClientsResult.data ?? []) as Array<{
      id: string; name: string; trust_score: number
    }>;

    // ── Compute outstanding exposure for each defaulted client ───────────────
    const exposureResults = await Promise.all(
      defaultedClientIds.map((clientId) =>
        session
          .from("invoices")
          .select("amount")
          .eq("client_id", clientId)
          .in("status", ["sent", "overdue"]),
      ),
    );

    const defaultedWithExposure = defaultedClients.map((client, i) => ({
      name: client.name,
      outstandingAmount: (exposureResults[i].data ?? []).reduce(
        (s, inv) => s + Number((inv as { amount: number }).amount),
        0,
      ),
    }));

    const totalDefaultExposure = defaultedWithExposure.reduce(
      (s, c) => s + c.outstandingAmount,
      0,
    );

    // ── Base runway (no shock) ───────────────────────────────────────────────
    const seylanTxns: SeylanTransaction[] = allTxns.map((t, i) => ({
      id: `DB-${i}`,
      postedAt: t.posted_at,
      type: t.type as "credit" | "debit",
      amount: Number(t.amount),
      reference: "",
      counterparty: t.counterparty_name,
      description: "",
    }));

    const baseRunway = calculateRunway({
      currentBalance: balanceResult.balance,
      transactions: seylanTxns,
      lookbackDays: 30,
    });

    // ── Apply shocks to burn rate ────────────────────────────────────────────
    const shockedBurnRate =
      baseRunway.dailyBurnRate * (1 + expenseShockPct / 100);
    const shockedCreditRate =
      (baseRunway.dailyBurnRate - (baseRunway.weeklyNetFlow / 7 < 0 ? baseRunway.dailyBurnRate : 0)) *
      (1 - revenueShockPct / 100);
    const shockedNetBurn = Math.max(0, shockedBurnRate - shockedCreditRate);

    const shockedBalance = Math.max(0, balanceResult.balance - totalDefaultExposure);
    const runwayWithShock =
      shockedNetBurn > 0 ? Math.floor(shockedBalance / shockedNetBurn) : 999;

    // ── Build prompt context ─────────────────────────────────────────────────
    const ctx: SurvivalPlanContext = {
      currentBalance: balanceResult.balance,
      currentRunway: baseRunway.runwayDays,
      runwayAfterShock: runwayWithShock,
      defaultedClients: defaultedWithExposure,
      expenseShockPct,
      revenueShockPct,
      totalDefaultExposure,
      newBurnRateDaily: Math.round(shockedBurnRate),
    };

    const cacheKey = `survival-plan:${defaultedClientIds.sort().join(",")}:exp${expenseShockPct}:rev${revenueShockPct}`;

    const result = await callOpenRouter({
      model: "gpt-4o-mini",
      systemPrompt: SURVIVAL_PLAN_SYSTEM,
      userPrompt: buildSurvivalPlanUserPrompt(ctx),
      cacheKey,
      userId: user.id,
      maxTokens: 600,
      temperature: 0.3,
      jsonMode: true,
      cacheTtlSeconds: 60 * 30, // 30 min — scenario-specific, expires quickly
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // ── Validate response ────────────────────────────────────────────────────
    const raw = parseAiJson<unknown>(result.content);
    const validated = SurvivalPlanSchema.safeParse(raw);

    const plan = validated.success
      ? validated.data
      : {
          severity: runwayWithShock < 7 ? "critical" : runwayWithShock < 30 ? "danger" : "watch",
          runwayWithShock,
          actions: [
            { priority: 1, category: "Collections", action: "Chase all overdue invoices today", impact: `LKR ${totalDefaultExposure.toLocaleString()} at risk`, timeframe: "Today" },
            { priority: 2, category: "Cost Cut", action: "Defer non-essential purchases", impact: "Reduce burn by 15-20%", timeframe: "This week" },
            { priority: 3, category: "Cash", action: "Contact bank about short-term credit line", impact: "Buffer 30+ days", timeframe: "This week" },
            { priority: 4, category: "Collections", action: "Issue JustPay links to all overdue clients", impact: "Accelerate recovery", timeframe: "Today" },
            { priority: 5, category: "Financing", action: "Review receivables for factoring eligibility", impact: "Immediate liquidity", timeframe: "30 days" },
          ] as SurvivalPlanOutput["actions"],
        };

    return NextResponse.json(
      {
        scenario: { defaultedClientIds, expenseShockPct, revenueShockPct },
        baselineRunway: baseRunway.runwayDays,
        runwayWithShock,
        totalDefaultExposure,
        newBurnRateDaily: Math.round(shockedBurnRate),
        cached: result.cached,
        latencyMs: result.latencyMs,
        plan,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[survival-plan]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
