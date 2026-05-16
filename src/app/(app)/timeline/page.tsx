/**
 * FlowPilot AI — Cash Flow Timeline
 * CTO Blueprint §4.8
 *
 * Projects 90 days of cash flow combining:
 *   - Confirmed inflows: overdue + sent invoices (expected payment dates)
 *   - Confirmed outflows: pending supplier obligations
 *   - Estimated burn: daily burn rate from last 30 days of transactions
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seylan } from "@/lib/seylan/client";
import { calculateRunway } from "@/lib/engines/runway-model";
import type { SeylanTransaction } from "@/lib/seylan/types";
import { TimelineClient, type TimelineEvent, type TimelineChartPoint } from "./timeline-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function label(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: "Cash Flow Timeline — FlowPilot AI" };

export default async function TimelinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const thirtyDaysAgo = addDays(new Date(), -30).toISOString();
  const ninetyDaysOut = isoDate(addDays(new Date(), 90));

  const [balanceResult, invoicesResult, obligationsResult, txnResult] =
    await Promise.all([
      seylan.getBalance(),
      supabase
        .from("invoices")
        .select("invoice_number, amount, due_date, status, clients(name)")
        .in("status", ["overdue", "sent"])
        .lte("due_date", ninetyDaysOut)
        .order("due_date", { ascending: true }),
      supabase
        .from("supplier_obligations")
        .select("reference, amount, due_date, status, suppliers(name)")
        .eq("user_id", user.id)
        .in("status", ["pending", "overdue"])
        .lte("due_date", ninetyDaysOut)
        .order("due_date", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, posted_at, type, amount, counterparty_name, category")
        .eq("user_id", user.id)
        .gte("posted_at", thirtyDaysAgo)
        .order("posted_at", { ascending: false }),
    ]);

  const balance = balanceResult.balance ?? 0;
  const rawTxns = (txnResult.data ?? []) as Array<{
    id: string; posted_at: string; type: string;
    amount: number; counterparty_name: string | null; category: string | null;
  }>;

  // Compute runway using the engine
  const syntheticTxns: SeylanTransaction[] = rawTxns.map((t) => ({
    id: t.id,
    postedAt: t.posted_at,
    type: t.type as "debit" | "credit",
    amount: Number(t.amount),
    counterparty: t.counterparty_name ?? undefined,
    category: t.category ?? undefined,
  }));

  const runwayResult = calculateRunway({
    currentBalance: balance,
    transactions: syntheticTxns,
    projectionDays: 90,
  });

  const dailyBurn = runwayResult.dailyBurnRate;

  // ── Build timeline events ──────────────────────────────────────────────────

  const events: TimelineEvent[] = [];

  // Inflows from invoices
  for (const inv of invoicesResult.data ?? []) {
    const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
    const dueDate = inv.due_date as string;
    const isOverdue = inv.status === "overdue";
    // Expected payment: overdue = ASAP (today), sent = on due date
    const expectedDate = isOverdue
      ? isoDate(new Date())
      : dueDate;

    events.push({
      id: `inv-${inv.invoice_number}`,
      date: expectedDate,
      type: "inflow",
      category: isOverdue ? "overdue_collection" : "invoice_payment",
      amount: Number(inv.amount),
      label: `${client?.name ?? "Client"} — ${inv.invoice_number as string}`,
      confidence: isOverdue ? "low" : "medium",
      status: inv.status as string,
    });
  }

  // Outflows from supplier obligations
  for (const obl of obligationsResult.data ?? []) {
    const supplier = Array.isArray(obl.suppliers) ? obl.suppliers[0] : obl.suppliers;
    events.push({
      id: `obl-${obl.reference}`,
      date: obl.due_date as string,
      type: "outflow",
      category: "supplier_payment",
      amount: Number(obl.amount),
      label: `${supplier?.name ?? "Supplier"} — ${obl.reference as string}`,
      confidence: "high",
      status: obl.status as string,
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // ── Build chart data (90-day projection) ──────────────────────────────────

  const today = new Date();
  let runningBalance = balance;

  // Pre-index events by date
  const eventsByDate = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  const chartPoints: TimelineChartPoint[] = [];

  for (let i = 0; i <= 90; i++) {
    const d = addDays(today, i);
    const dateStr = isoDate(d);
    const dayEvents = eventsByDate.get(dateStr) ?? [];

    // Apply events
    for (const ev of dayEvents) {
      if (ev.type === "inflow") runningBalance += ev.amount;
      else runningBalance -= ev.amount;
    }

    // Apply daily burn (minus any inflows already counted above)
    if (i > 0) {
      runningBalance -= dailyBurn;
    }

    const hasInflow = dayEvents.some((e) => e.type === "inflow");
    const hasOutflow = dayEvents.some((e) => e.type === "outflow");

    chartPoints.push({
      date: label(d),
      dateStr,
      balance: Math.max(0, Math.round(runningBalance)),
      projected: i > 0,
      hasInflow,
      hasOutflow,
    });
  }

  // Summary stats
  const totalExpectedInflows = events
    .filter((e) => e.type === "inflow")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpectedOutflows = events
    .filter((e) => e.type === "outflow")
    .reduce((s, e) => s + e.amount, 0);
  const overdueCount = events.filter(
    (e) => e.category === "overdue_collection",
  ).length;

  return (
    <TimelineClient
      chartPoints={chartPoints}
      events={events}
      balance={balance}
      dailyBurn={dailyBurn}
      runwayDays={runwayResult.runwayDays}
      totalExpectedInflows={totalExpectedInflows}
      totalExpectedOutflows={totalExpectedOutflows}
      overdueCount={overdueCount}
    />
  );
}
