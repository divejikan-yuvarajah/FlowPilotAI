/**
 * FlowPilot AI — Daily Automation Rules Evaluator
 * GET /api/cron/daily-rules  (Vercel Cron — runs at 02:00 UTC daily)
 *
 * Evaluates all active IF/THEN automation rules for every user and
 * writes triggered outcomes to alert_log.
 *
 * Protected by Vercel's CRON_SECRET — only Vercel's cron scheduler can call this.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seylan } from "@/lib/seylan/client";
import { calculateRunway } from "@/lib/engines/runway-model";
import type { SeylanTransaction } from "@/lib/seylan/types";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

// ─── Rule evaluation helpers ──────────────────────────────────────────────────

interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  priority: number;
  condition_json: Record<string, unknown>;
  action_json: Record<string, unknown>;
}

interface EvalContext {
  userId: string;
  runwayDays: number;
  overdueInvoices: Array<{
    id: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    client_id: string;
    daysOverdue: number;
  }>;
}

function evaluateCondition(
  condition: Record<string, unknown>,
  ctx: EvalContext,
): boolean {
  const metric = condition.metric as string | undefined;
  const op = condition.operator as string | undefined;
  const threshold = condition.threshold as number | undefined;

  if (!metric || !op || threshold === undefined) return false;

  let value: number | null = null;

  if (metric === "runway_days") {
    value = ctx.runwayDays;
  } else if (metric === "invoice_overdue_days") {
    const maxOverdue = ctx.overdueInvoices.reduce(
      (max, inv) => Math.max(max, inv.daysOverdue),
      0,
    );
    value = maxOverdue;
  } else if (metric === "health_score") {
    return false; // requires full health calc; skip in cron for now
  }

  if (value === null) return false;

  switch (op) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">":  return value >  threshold;
    case "<":  return value <  threshold;
    case "==": return value === threshold;
    default:   return false;
  }
}

// ─── Per-user rule evaluator ──────────────────────────────────────────────────

async function evaluateUserRules(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  rules: AutomationRule[],
): Promise<number> {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();

  // Fetch data needed for rule evaluation
  const [balanceResult, invoicesResult, txnResult] = await Promise.allSettled([
    seylan.getBalance(userId),
    db
      .from("invoices")
      .select("id, invoice_number, amount, due_date, client_id")
      .eq("user_id", userId)
      .in("status", ["overdue", "sent"]),
    db
      .from("transactions")
      .select("type, amount, posted_at, counterparty_name")
      .eq("user_id", userId)
      .gte("posted_at", thirtyDaysAgo),
  ]);

  const balance =
    balanceResult.status === "fulfilled" ? balanceResult.value.balance : 0;
  const allInvoices =
    invoicesResult.status === "fulfilled"
      ? (invoicesResult.value.data ?? [])
      : [];
  const allTxns =
    txnResult.status === "fulfilled" ? (txnResult.value.data ?? []) : [];

  // Compute runway
  const syntheticTxns: SeylanTransaction[] = allTxns.map(
    (t: { type: string; amount: number; posted_at: string; counterparty_name: string }, i: number) => ({
      id: `cron-${i}`,
      postedAt: t.posted_at,
      type: t.type as "credit" | "debit",
      amount: Number(t.amount),
      counterparty: t.counterparty_name,
    }),
  );

  const runway = calculateRunway({
    currentBalance: balance,
    transactions: syntheticTxns,
    lookbackDays: 30,
  });

  // Map overdue invoices with daysOverdue
  const overdueInvoices = allInvoices
    .map((i: { id: string; invoice_number: string; amount: number; due_date: string; client_id: string }) => ({
      ...i,
      amount: Number(i.amount),
      daysOverdue: Math.max(
        0,
        Math.floor((now - new Date(i.due_date as string).getTime()) / 86_400_000),
      ),
    }))
    .filter((i: { daysOverdue: number }) => i.daysOverdue > 0);

  const ctx: EvalContext = {
    userId,
    runwayDays: runway.runwayDays,
    overdueInvoices,
  };

  const alertRows: Record<string, unknown>[] = [];

  for (const rule of rules) {
    const triggered = evaluateCondition(rule.condition_json, ctx);
    if (!triggered) continue;

    const action = rule.action_json;
    const actionType = (action.type as string) ?? "create_alert";

    // Find the most relevant invoice for the log
    const relevantInvoice =
      rule.condition_json.metric === "invoice_overdue_days"
        ? overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue)[0]
        : null;

    alertRows.push({
      user_id: userId,
      rule_id: rule.id,
      rule_name: rule.name,
      invoice_id: relevantInvoice?.id ?? null,
      outcome: "pending",
      action_taken: `${actionType.replace(/_/g, " ")} triggered by cron`,
      channel: (action.channel as string) ?? "in_app",
      metadata: {
        runway_days: runway.runwayDays,
        overdue_count: overdueInvoices.length,
        triggered_by: "cron",
      },
      triggered_at: new Date().toISOString(),
      outcome_at: null,
    });
  }

  if (alertRows.length > 0) {
    await db.from("alert_log").insert(alertRows);

    // Increment trigger counts
    const ruleIds = rules
      .filter((r) => alertRows.some((a) => a.rule_id === r.id))
      .map((r) => r.id);

    for (const ruleId of ruleIds) {
      await db.rpc("increment_trigger_count", { rule_id: ruleId }).maybeSingle();
    }
  }

  return alertRows.length;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const db = createAdminClient();

  try {
    // Fetch all active rules grouped by user
    const { data: rules, error } = await db
      .from("automation_rules")
      .select("id, user_id, name, priority, condition_json, action_json")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (error) {
      console.error("[cron/daily-rules] fetch error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group rules by user_id
    const byUser = new Map<string, AutomationRule[]>();
    for (const rule of (rules ?? []) as AutomationRule[]) {
      const existing = byUser.get(rule.user_id) ?? [];
      existing.push(rule);
      byUser.set(rule.user_id, existing);
    }

    // Evaluate rules per user (sequential to avoid rate-limit spikes)
    let totalTriggered = 0;
    const userResults: Array<{ userId: string; triggered: number }> = [];

    for (const [userId, userRules] of byUser.entries()) {
      try {
        const triggered = await evaluateUserRules(db, userId, userRules);
        totalTriggered += triggered;
        userResults.push({ userId, triggered });
      } catch (err) {
        console.error(`[cron/daily-rules] user ${userId} error:`, err);
        userResults.push({ userId, triggered: 0 });
      }
    }

    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      usersEvaluated: byUser.size,
      totalTriggered,
      results: userResults,
    });
  } catch (err) {
    console.error("[cron/daily-rules] unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
