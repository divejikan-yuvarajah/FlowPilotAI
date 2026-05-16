import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seylan } from "@/lib/seylan/client";
import { calculateRunway } from "@/lib/engines/runway-model";
import { calculateHealthScore } from "@/lib/engines/health-score";
import type { SeylanTransaction } from "@/lib/seylan/types";
import { WarRoomClient, type WarRoomData } from "./war-room-client";
import type { ChartPoint } from "@/components/charts/runway-area-chart";
import type { OverdueInvoice } from "@/components/widgets/overdue-invoice-list";
import type { AlertEntry } from "@/components/widgets/activity-feed";

// ─── Helpers ──────────────────────────────────────────────────────────────

function dateLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildChartData(
  currentBalance: number,
  burnRateDaily: number,
  projections: Array<{ date: string; balance: number }>,
): ChartPoint[] {
  const points: ChartPoint[] = [];
  const today = new Date();

  // Historical: last 14 days (estimated by reversing burn rate)
  for (let i = 14; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    points.push({
      date: dateLabel(d.toISOString()),
      balance: Math.round(currentBalance + burnRateDaily * i),
      projected: false,
    });
  }

  // Today
  points.push({ date: "Today", balance: Math.round(currentBalance), projected: false });

  // Future: first 30 projections from runway engine
  projections.slice(0, 30).forEach((p) => {
    points.push({ date: dateLabel(p.date), balance: p.balance, projected: true });
  });

  return points;
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function WarRoomPage() {
  const supabase = createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // ── Fetch all data in parallel ───────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    balanceResult,
    invoicesResult,
    cfoBriefResult,
    alertLogResult,
    transactionsResult,
    clientsResult,
  ] = await Promise.all([
    seylan.getBalance(),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, due_date, risk_score, clients(name, trust_score, risk_tier)")
      .eq("status", "overdue")
      .order("risk_score", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: true })
      .limit(7),
    supabase
      .from("cfo_briefs")
      .select("bullets, brief_date, created_at, model_used, health_score, runway_days, burn_rate_daily")
      .eq("user_id", user.id)
      .order("brief_date", { ascending: false })
      .limit(1),
    supabase
      .from("alert_log")
      .select("id, rule_name, outcome, triggered_at, metadata, invoice_id")
      .eq("user_id", user.id)
      .order("triggered_at", { ascending: false })
      .limit(10),
    supabase
      .from("transactions")
      .select("type, amount, posted_at, category, counterparty_name")
      .eq("user_id", user.id)
      .gte("posted_at", thirtyDaysAgo)
      .order("posted_at", { ascending: false }),
    supabase
      .from("clients")
      .select("trust_score, trust_trend")
      .eq("user_id", user.id),
  ]);

  // ── Runway engine ────────────────────────────────────────────────────────
  const rawTxns = (transactionsResult.data ?? []) as Array<{
    type: string; amount: number; posted_at: string;
    category: string; counterparty_name: string;
  }>;

  const engineTxns: SeylanTransaction[] = rawTxns.map((t, i) => ({
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
    transactions: engineTxns,
    lookbackDays: 30,
    projectionDays: 30,
  });

  // ── Health score ─────────────────────────────────────────────────────────
  const allClients = (clientsResult.data ?? []) as Array<{
    trust_score: number; trust_trend: string;
  }>;

  const avgTrust =
    allClients.length > 0
      ? allClients.reduce((s, c) => s + Number(c.trust_score), 0) / allClients.length
      : 70;

  const health = calculateHealthScore({
    runwayDays: runway.runwayDays,
    trustScoreAvg: avgTrust,
    onTimePaymentRate: 0.72,
    expenseControlScore: 68,
    cashRatio: balanceResult.balance / (runway.dailyBurnRate * 30 || 1),
  });

  // ── Overdue invoices ─────────────────────────────────────────────────────
  const now = Date.now();
  const overdueInvoices: OverdueInvoice[] = (invoicesResult.data ?? []).map(
    (inv) => {
      const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
      const c = client as { name?: string; trust_score?: number; risk_tier?: string } | null;
      return {
        id: inv.id as string,
        invoiceNumber: inv.invoice_number as string,
        amount: Number(inv.amount),
        daysOverdue: Math.max(
          0,
          Math.floor((now - new Date(inv.due_date as string).getTime()) / 86_400_000),
        ),
        clientName: c?.name ?? "Unknown",
        trustScore: Number(c?.trust_score ?? 50),
        riskTier: (c?.risk_tier ?? "C") as string,
      };
    },
  ).sort((a, b) => b.daysOverdue - a.daysOverdue);

  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  // ── CFO brief ────────────────────────────────────────────────────────────
  const briefRow = cfoBriefResult.data?.[0] as {
    bullets?: string[];
    brief_date?: string;
    created_at?: string;
    model_used?: string;
  } | undefined;

  const cfoBrief = briefRow
    ? {
        bullets: (briefRow.bullets ?? []) as string[],
        // Use created_at (timestamptz) for accurate relative time; fall back to brief_date
        briefDate: briefRow.created_at ?? briefRow.brief_date ?? new Date().toISOString(),
        modelUsed: briefRow.model_used ?? "gpt-4o-mini",
      }
    : null;

  // ── Alert log ────────────────────────────────────────────────────────────
  const alertLog: AlertEntry[] = (alertLogResult.data ?? []).map((row) => ({
    id: row.id as string,
    ruleName: row.rule_name as string,
    outcome: row.outcome as string,
    triggeredAt: row.triggered_at as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));

  // ── Chart data ───────────────────────────────────────────────────────────
  const chartData = buildChartData(
    balanceResult.balance,
    runway.dailyBurnRate,
    runway.projections,
  );

  // ── Assemble page data ───────────────────────────────────────────────────
  const pageData: WarRoomData = {
    initialBalance: balanceResult.balance,
    runwayDays: runway.runwayDays,
    dailyBurnRate: runway.dailyBurnRate,
    healthScore: health.score,
    healthStatus: health.status,
    healthGrade: health.grade,
    overdueTotal,
    cfoBrief,
    overdueInvoices,
    alertLog,
    chartData,
  };

  return (
    <div className="space-y-2 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            War Room
          </h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-healthy opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-healthy" />
          </span>
          <span className="text-xs text-ink-muted">Live · Seylan simulator</span>
        </div>
      </div>

      <WarRoomClient data={pageData} />
    </div>
  );
}
