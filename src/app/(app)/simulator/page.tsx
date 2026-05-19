import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateRunway } from "@/lib/engines/runway-model";
import type { SeylanTransaction } from "@/lib/seylan/types";
import {
  SimulatorClient,
  type SimPageData,
  type SimClient,
} from "./simulator-client";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function SimulatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const thirtyDaysAgo = addDays(new Date(), -30).toISOString();

  const [clientsResult, txnResult, invoicesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, trust_score, risk_tier")
      .eq("user_id", user.id)
      .order("trust_score", { ascending: true }),
    supabase
      .from("transactions")
      .select("type, amount, posted_at, category, counterparty_name")
      .eq("user_id", user.id)
      .gte("posted_at", thirtyDaysAgo)
      .order("posted_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("client_id, amount, status")
      .in("status", ["sent", "overdue"]),
  ]);

  const allClients = (clientsResult.data ?? []) as Array<{
    id: string; name: string; trust_score: number; risk_tier: string;
  }>;
  const txns = (txnResult.data ?? []) as Array<{
    type: string; amount: number; posted_at: string;
    category?: string; counterparty_name?: string;
  }>;
  const openInvoices = (invoicesResult.data ?? []) as Array<{
    client_id: string; amount: number; status: string;
  }>;

  // Map open invoice totals per client
  const invoiceTotalByClient = new Map<string, number>();
  for (const inv of openInvoices) {
    invoiceTotalByClient.set(
      inv.client_id,
      (invoiceTotalByClient.get(inv.client_id) ?? 0) + Number(inv.amount),
    );
  }

  const clients: SimClient[] = allClients.map((c) => ({
    id: c.id,
    name: c.name,
    trustScore: Number(c.trust_score),
    riskTier: c.risk_tier ?? "C",
    openInvoiceTotal: invoiceTotalByClient.get(c.id) ?? 0,
  }));

  // Baseline runway from engine
  const LIVE_BALANCE = 10_050_000; // from Seylan live API

  const engineTxns: SeylanTransaction[] = txns.map((t, i) => ({
    id: `DB-${i}`,
    postedAt: t.posted_at,
    type: t.type as "credit" | "debit",
    amount: Number(t.amount),
    reference: "",
    counterparty: t.counterparty_name ?? "",
    description: "",
    category: (t.category ?? "other") as SeylanTransaction["category"],
  }));

  const runway = calculateRunway({
    currentBalance: LIVE_BALANCE,
    transactions: engineTxns,
    lookbackDays: 30,
    projectionDays: 90,
  });

  // Baseline chart data (90 days)
  const baselineChartData = runway.projections.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    balance: p.balance,
  }));

  const pageData: SimPageData = {
    clients,
    baselineBalance: LIVE_BALANCE,
    baselineBurnRateDaily: runway.dailyBurnRate,
    baselineRunwayDays: runway.runwayDays,
    baselineChartData,
  };

  return <SimulatorClient data={pageData} />;
}
