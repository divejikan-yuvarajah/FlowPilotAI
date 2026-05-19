/**
 * FlowPilot AI — Conversational Assistant
 * POST /api/ai/assistant
 *
 * Builds a rich financial context snapshot from the user's Supabase data,
 * injects it into the system prompt, and streams a response token-by-token
 * via Server-Sent Events.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { seylan } from "@/lib/seylan/client";
import { ASSISTANT_SYSTEM } from "@/lib/ai/prompts";
import { calculateRunway } from "@/lib/engines/runway-model";
import { calculateHealthScore } from "@/lib/engines/health-score";
import type { SeylanTransaction } from "@/lib/seylan/types";
import { z } from "zod";

// ─── Input schema ─────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
});

// ─── Context builder ──────────────────────────────────────────────────────────

async function buildContext(userId: string, supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const fourteenDaysFromNow = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];

  // Parallel fetches
  const [
    balanceResult,
    overdueResult,
    clientsResult,
    suppliersResult,
    txnResult,
    baselineResult,
    alertResult,
    obligationsResult,
    rulesResult,
  ] = await Promise.allSettled([
    seylan.getBalance(),
    supabase
      .from("invoices")
      .select("invoice_number, amount, due_date, risk_score, clients(name, trust_score, trust_trend, risk_tier)")
      .eq("user_id", userId)
      .in("status", ["overdue"])
      .order("risk_score", { ascending: false, nullsFirst: false })
      .limit(10),
    supabase
      .from("clients")
      .select("name, trust_score, trust_trend, risk_tier, credit_limit, ai_behavioral_notes")
      .eq("user_id", userId),
    supabase
      .from("suppliers")
      .select("name, business_type, payment_reliability_score, trend, relationship_status")
      .eq("user_id", userId),
    supabase
      .from("transactions")
      .select("posted_at, type, amount, category, counterparty_name")
      .eq("user_id", userId)
      .gte("posted_at", thirtyDaysAgo)
      .order("posted_at", { ascending: false })
      .limit(20),
    supabase
      .from("expense_baselines")
      .select("category, vendor, avg_30d")
      .eq("user_id", userId),
    supabase
      .from("alert_log")
      .select("rule_name, action_taken, triggered_at, outcome")
      .eq("user_id", userId)
      .order("triggered_at", { ascending: false })
      .limit(5),
    supabase
      .from("supplier_obligations")
      .select("amount, due_date, status, description, suppliers(name)")
      .eq("user_id", userId)
      .in("status", ["pending", "overdue"])
      .lte("due_date", fourteenDaysFromNow)
      .order("due_date", { ascending: true }),
    supabase
      .from("automation_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  // Cash + runway
  const balance = balanceResult.status === "fulfilled" ? balanceResult.value.balance : 0;
  const txns = txnResult.status === "fulfilled" ? (txnResult.value.data ?? []) : [];

  const debits = txns.filter((t: { type: string }) => t.type === "debit");
  const burnDaily =
    debits.length > 0
      ? Math.round(debits.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0) / 30)
      : 0;

  let runwayDays = 0;
  let runwayStatus = "unknown";
  try {
    // Build synthetic transactions for runway calc from fetched data
    const syntheticTxns = txns.map((t: { posted_at: string; type: string; amount: number; counterparty_name: string | null }) => ({
      id: `synthetic-${t.posted_at}`,
      postedAt: t.posted_at,
      type: t.type as "debit" | "credit",
      amount: Number(t.amount),
      counterparty: t.counterparty_name ?? undefined,
    }));
    const runwayResult = calculateRunway({
      currentBalance: balance,
      transactions: syntheticTxns,
      projectionDays: 90,
    });
    runwayDays = runwayResult.runwayDays;
    runwayStatus = runwayDays < 7 ? "critical" : runwayDays < 14 ? "danger" : runwayDays < 30 ? "watch" : "healthy";
  } catch { /* skip */ }

  // Health score
  let healthScore = 0;
  let healthGrade = "C";
  try {
    const overdueData = overdueResult.status === "fulfilled" ? (overdueResult.value.data ?? []) : [];
    const overdueTotal = overdueData.reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0);
    const hsResult = calculateHealthScore({
      runwayDays,
      trustScoreAvg: 70,
      onTimePaymentRate: 0.75,
      expenseControlScore: overdueTotal > 500_000 ? 40 : 70,
      cashRatio: burnDaily > 0 ? balance / (burnDaily * 30) : 3,
    });
    healthScore = hsResult.score;
    healthGrade = hsResult.grade;
  } catch { /* skip */ }

  // Overdue invoices
  const overdueInvoices = overdueResult.status === "fulfilled"
    ? (overdueResult.value.data ?? []).map((inv: {
        invoice_number: string; amount: number; due_date: string; risk_score: number | null;
        clients: { name: string; trust_score: number; trust_trend: string; risk_tier: string } | Array<{ name: string; trust_score: number; trust_trend: string; risk_tier: string }> | null;
      }) => {
        const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(inv.due_date as string).getTime()) / 86_400_000));
        return {
          invoiceNumber: inv.invoice_number,
          clientName: client?.name ?? "Unknown",
          amount: Number(inv.amount),
          daysOverdue,
          riskScore: inv.risk_score,
          trustScore: client?.trust_score ?? 50,
          trustTrend: client?.trust_trend ?? "stable",
        };
      })
    : [];

  // Clients
  const clients = clientsResult.status === "fulfilled"
    ? (clientsResult.value.data ?? []).map((c: {
        name: string; trust_score: number; trust_trend: string; risk_tier: string;
        credit_limit: number; ai_behavioral_notes: string | null;
      }) => ({
        name: c.name,
        trustScore: Number(c.trust_score),
        trustTrend: c.trust_trend,
        tier: c.risk_tier,
        creditLimit: Number(c.credit_limit),
        notes: c.ai_behavioral_notes,
      }))
    : [];

  // Suppliers
  const suppliers = suppliersResult.status === "fulfilled"
    ? (suppliersResult.value.data ?? []).map((s: {
        name: string; business_type: string; payment_reliability_score: number;
        trend: string; relationship_status: string;
      }) => ({
        name: s.name,
        businessType: s.business_type,
        reliabilityScore: Number(s.payment_reliability_score),
        trend: s.trend,
        status: s.relationship_status,
      }))
    : [];

  // Recent transactions (summarized)
  const recentTransactions = txns.slice(0, 20).map((t: {
    posted_at: string; type: string; amount: number; category: string | null; counterparty_name: string | null;
  }) => ({
    date: t.posted_at.split("T")[0],
    type: t.type,
    amount: Number(t.amount),
    category: t.category ?? "other",
    counterparty: t.counterparty_name ?? "Unknown",
  }));

  // Expense anomalies
  const baselines = baselineResult.status === "fulfilled" ? (baselineResult.value.data ?? []) : [];
  const baselineMap = new Map<string, number>();
  for (const b of baselines) {
    baselineMap.set(`${b.category}::${(b.vendor ?? "").toLowerCase()}`, Number(b.avg_30d));
  }
  const expenseAnomalies: Array<{ category: string; vendor: string; baseline: number; actual: number; deltaPct: number }> = [];
  for (const t of debits) {
    const key = `${t.category ?? "other"}::${(t.counterparty_name ?? "").toLowerCase()}`;
    const baseline = baselineMap.get(key) ?? 0;
    if (baseline > 0) {
      const deltaPct = Math.round(((Number(t.amount) - baseline) / baseline) * 100);
      if (deltaPct > 40) {
        expenseAnomalies.push({
          category: t.category ?? "other",
          vendor: t.counterparty_name ?? "Unknown",
          baseline,
          actual: Number(t.amount),
          deltaPct,
        });
      }
    }
  }

  // Upcoming obligations
  const upcomingObligations = obligationsResult.status === "fulfilled"
    ? (obligationsResult.value.data ?? []).map((o: {
        amount: number; due_date: string; status: string; description: string | null;
        suppliers: { name: string } | Array<{ name: string }> | null;
      }) => {
        const sup = Array.isArray(o.suppliers) ? o.suppliers[0] : o.suppliers;
        return {
          date: o.due_date,
          type: "supplier_obligation",
          amount: Number(o.amount),
          recipient: sup?.name ?? "Unknown",
          description: o.description,
          status: o.status,
        };
      })
    : [];

  const activeRules = rulesResult.status === "fulfilled" ? (rulesResult.value.data ?? []).length : 0;
  const recentAlerts = alertResult.status === "fulfilled"
    ? (alertResult.value.data ?? []).map((a: { rule_name: string; action_taken: string; triggered_at: string; outcome: string }) => ({
        rule: a.rule_name,
        action: a.action_taken,
        triggeredAt: a.triggered_at,
        outcome: a.outcome,
      }))
    : [];

  return {
    today,
    cashPosition: { balance, currency: "LKR" },
    runway: { days: runwayDays, status: runwayStatus },
    healthScore: { score: healthScore, grade: healthGrade },
    burnRate: { daily: burnDaily, monthly: burnDaily * 30 },
    overdueInvoices,
    clients,
    suppliers,
    recentTransactions,
    expenseAnomalies: expenseAnomalies.slice(0, 5),
    upcomingObligations,
    activeRules,
    recentAlerts,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate input
    const body: unknown = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad request", issues: parsed.error.flatten() }, { status: 400 });
    }
    const { message, conversationHistory } = parsed.data;

    // Build context
    const context = await buildContext(user.id, supabase);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured — set OPENAI_API_KEY" }, { status: 503 });
    }

    // Build messages array for the model
    const systemPrompt = ASSISTANT_SYSTEM + JSON.stringify(context, null, 2);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Streaming request to OpenAI-compatible API
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 600,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => aiRes.statusText);
      return NextResponse.json({ error: `AI error ${aiRes.status}: ${errText}` }, { status: 502 });
    }

    // Pipe the stream through as SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (!trimmed.startsWith("data: ")) continue;

              try {
                const json = JSON.parse(trimmed.slice(6)) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const token = json.choices?.[0]?.delta?.content;
                if (token) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                }
              } catch {
                // Skip malformed chunk
              }
            }
          }
        } catch {
          // Stream ended
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[assistant]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
