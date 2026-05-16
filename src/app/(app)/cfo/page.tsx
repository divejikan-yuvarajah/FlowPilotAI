import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateRunway } from "@/lib/engines/runway-model";
import type { SeylanTransaction } from "@/lib/seylan/types";
import {
  CfoDashboardClient,
  type CfoDashboardData,
  type Recommendation,
  type CfoBriefRow,
} from "./cfo-client";
import type { BurnDataPoint } from "@/components/charts/burn-rate-chart";
import type { CategorySlice } from "@/components/charts/expense-donut";

// ─── Category palette ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  inventory:      "hsl(38 92% 50%)",
  logistics:      "hsl(199 89% 48%)",
  salaries:       "hsl(243 75% 65%)",
  utilities:      "hsl(142 71% 45%)",
  rent:           "hsl(270 70% 65%)",
  marketing:      "hsl(0 84% 60%)",
  software:       "hsl(38 60% 60%)",
  taxes:          "hsl(0 72% 45%)",
  client_payment: "hsl(142 60% 55%)",
  other:          "hsl(215 16% 47%)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildBurnTrend(
  txns: Array<{ type: string; amount: number; posted_at: string; category?: string }>,
  baselines: Array<{ category: string; vendor: string; avg_30d: number }>,
): BurnDataPoint[] {
  // Build daily debit map for last 90 days
  const dayMap = new Map<string, number>();
  const anomalyMap = new Map<string, string>();
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = addDays(today, -i);
    dayMap.set(d.toISOString().split("T")[0], 0);
  }

  // Build baseline lookup for anomaly detection
  const baselineMap = new Map<string, number>();
  for (const b of baselines) {
    baselineMap.set(`${b.category}::${b.vendor?.toLowerCase() ?? ""}`, b.avg_30d);
  }

  for (const t of txns) {
    if (t.type !== "debit") continue;
    const day = t.posted_at.split("T")[0];
    if (!dayMap.has(day)) continue;
    dayMap.set(day, (dayMap.get(day) ?? 0) + t.amount);

    // Anomaly detection
    const cat = t.category ?? "other";
    const baseKey = `${cat}::`;
    for (const [k, v] of Array.from(baselineMap.entries())) {
      if (k.startsWith(baseKey) && t.amount > v * 1.5) {
        anomalyMap.set(day, `${cat} spend +${Math.round((t.amount / v - 1) * 100)}% above avg`);
        break;
      }
    }
  }

  return Array.from(dayMap.entries()).map(([isoDay, amount]) => ({
    date: dateLabel(isoDay + "T00:00:00"),
    amount,
    isAnomaly: anomalyMap.has(isoDay),
    anomalyLabel: anomalyMap.get(isoDay),
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CfoDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const ninetyDaysAgo = addDays(new Date(), -90).toISOString();
  const thirtyDaysAgo = addDays(new Date(), -30).toISOString();
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [txnResult, briefResult, baselineResult, overdueResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, posted_at, category, counterparty_name")
      .eq("user_id", user.id)
      .gte("posted_at", ninetyDaysAgo)
      .order("posted_at", { ascending: false }),
    supabase
      .from("cfo_briefs")
      .select("id, brief_date, created_at, bullets, health_score, runway_days, recommendations_json")
      .eq("user_id", user.id)
      .order("brief_date", { ascending: false })
      .limit(10),
    supabase
      .from("expense_baselines")
      .select("category, vendor, avg_30d")
      .eq("user_id", user.id),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, risk_score, clients(name)")
      .eq("status", "overdue")
      .order("risk_score", { ascending: false, nullsFirst: false })
      .limit(3),
  ]);

  const txns = (txnResult.data ?? []) as Array<{
    type: string; amount: number; posted_at: string;
    category?: string; counterparty_name?: string;
  }>;
  const baselines = (baselineResult.data ?? []) as Array<{
    category: string; vendor: string; avg_30d: number;
  }>;

  // ── Metrics ────────────────────────────────────────────────────────────────

  const debits30 = txns.filter(
    (t) => t.type === "debit" && t.posted_at >= thirtyDaysAgo,
  );
  const credits30 = txns.filter(
    (t) => t.type === "credit" && t.posted_at >= thirtyDaysAgo,
  );
  const totalDebits30 = debits30.reduce((s, t) => s + t.amount, 0);
  const totalCredits30 = credits30.reduce((s, t) => s + t.amount, 0);
  const burnRateDaily = Math.round(totalDebits30 / 30);

  // Runway engine
  const engineTxns: SeylanTransaction[] = txns.map((t, i) => ({
    id: `DB-${i}`,
    postedAt: t.posted_at,
    type: t.type as "credit" | "debit",
    amount: t.amount,
    reference: "",
    counterparty: t.counterparty_name ?? "",
    description: "",
    category: (t.category ?? "other") as SeylanTransaction["category"],
  }));

  const runway = calculateRunway({
    currentBalance: 10_050_000, // from Seylan live API (seeded context)
    transactions: engineTxns,
    lookbackDays: 30,
  });

  const efficiencyScore = totalDebits30 > 0
    ? Math.min(100, Math.round((totalCredits30 / totalDebits30) * 100))
    : 100;

  // Anomaly count this month
  const baselineMap = new Map<string, number>();
  for (const b of baselines) {
    baselineMap.set(`${b.category}::${(b.vendor ?? "").toLowerCase()}`, b.avg_30d);
  }
  const baselineEntries = Array.from(baselineMap.entries());
  const debitsThisMonth = txns.filter(
    (t) => t.type === "debit" && t.posted_at >= thisMonthStart,
  );
  let anomalyCount = 0;
  for (const t of debitsThisMonth) {
    const cat = t.category ?? "other";
    const key = `${cat}::`;
    for (const [k, v] of baselineEntries) {
      if (k.startsWith(key) && t.amount > v * 1.5) {
        anomalyCount++;
        break;
      }
    }
  }

  // ── Burn rate trend (90 days) ──────────────────────────────────────────────

  const burnTrend = buildBurnTrend(txns, baselines);

  // ── Expense breakdown (this month) ────────────────────────────────────────

  const catTotals = new Map<string, number>();
  for (const t of debitsThisMonth) {
    const cat = (t.category ?? "other") as string;
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + t.amount);
  }
  const totalMonthlyExpense = Array.from(catTotals.values()).reduce((s, v) => s + v, 0);
  const expenseByCategory: CategorySlice[] = Array.from(catTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1).replace("_", " "),
      amount,
      color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
    }));

  // ── CFO Briefings history ─────────────────────────────────────────────────

  const briefings: CfoBriefRow[] = (briefResult.data ?? []).map((b) => ({
    id: b.id as string,
    briefDate: b.brief_date as string,
    createdAt: (b.created_at as string) ?? b.brief_date,
    bullets: (b.bullets ?? []) as string[],
    healthScore: Number(b.health_score ?? 0),
    runwayDays: Number(b.runway_days ?? 0),
    recommendations: (
      (b.recommendations_json ?? []) as Array<{ priority: number; action: string }>
    ),
  }));

  // ── Recommendations ────────────────────────────────────────────────────────

  const overdueInvoices = (overdueResult.data ?? []).map((r) => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return {
      id: r.id as string,
      number: r.invoice_number as string,
      amount: Number(r.amount),
      riskScore: Number(r.risk_score ?? 50),
      clientName: (client as { name?: string } | null)?.name ?? "Unknown",
    };
  });

  const urgentRecs: Recommendation[] = [
    {
      title: "Pay EPF/ETF via CEFTS — due this month",
      reasoning: "EPF + ETF contribution of LKR 45,600 is overdue. Penalty accrues daily after deadline.",
      href: "/payments",
    },
    ...(overdueInvoices[0]
      ? [{
          title: `Recover ${overdueInvoices[0].number} from ${overdueInvoices[0].clientName}`,
          reasoning: `${Math.round(overdueInvoices[0].riskScore * 0.9)}% default probability. LKR ${overdueInvoices[0].amount.toLocaleString()} at risk. Send Stage 2 message today.`,
          href: `/recovery/${overdueInvoices[0].id}`,
        }]
      : []),
  ];

  const importantRecs: Recommendation[] = [
    {
      title: "Renegotiate Lanka Logistics contract",
      reasoning: "Logistics spend is 35% above the 30-day category average. Negotiate quarterly fixed-rate.",
      href: "/expenses",
    },
    {
      title: "Increase client trust threshold to 65",
      reasoning: "Current exposure to D-tier clients (trust < 65) adds LKR 250,000 credit risk. Tighten the threshold.",
      href: "/settings",
    },
  ];

  const suggestedRecs: Recommendation[] = [
    {
      title: "Switch software subscriptions to annual billing",
      reasoning: "Dialog + Microsoft monthly plans cost LKR 170,400/year. Annual saves ~LKR 28,000 (16%).",
      href: "/expenses",
    },
    {
      title: "Schedule weekly cash flow review",
      reasoning: "A recurring Monday 9 AM review would have caught the Nexus Traders deterioration 3 weeks earlier.",
      href: "/settings",
    },
  ];

  const pageData: CfoDashboardData = {
    burnRateDaily,
    runwayDays: runway.runwayDays,
    efficiencyScore,
    anomalyCount,
    burnTrend,
    expenseByCategory,
    totalMonthlyExpense,
    briefings,
    urgentRecs,
    importantRecs,
    suggestedRecs,
  };

  return <CfoDashboardClient data={pageData} />;
}
