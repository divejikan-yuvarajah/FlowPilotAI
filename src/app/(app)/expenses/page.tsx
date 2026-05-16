import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpensesClient } from "./expenses-client";

export const metadata = {
  title: "Expense Intelligence — FlowPilot AI",
};

interface BaselineRow {
  category: string;
  vendor: string;
  avg_30d: number;
  avg_60d: number;
  avg_90d: number;
  std_dev_30d: number;
}

interface TransactionRow {
  id: string;
  posted_at: string;
  type: string;
  amount: number;
  counterparty_name: string | null;
  category: string | null;
  description: string | null;
  reference: string | null;
}

export interface VendorSummary {
  vendor: string;
  category: string;
  totalSpend: number;
  txnCount: number;
  avg30d: number;
  deltaVsBaseline: number | null;
  isAnomaly: boolean;
  supplierId: string | null;
  supplierScore: number | null;
  supplierTrend: string | null;
  lastTransaction: string;
}

export default async function ExpensesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // ── Parallel fetches ────────────────────────────────────────────────────────
  const [txnResult, baselineResult, supplierResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, posted_at, type, amount, counterparty_name, category, description, reference")
      .eq("user_id", user.id)
      .eq("type", "debit")
      .gte("posted_at", thirtyDaysAgo)
      .order("posted_at", { ascending: false }),
    supabase
      .from("expense_baselines")
      .select("category, vendor, avg_30d, avg_60d, avg_90d, std_dev_30d")
      .eq("user_id", user.id),
    supabase
      .from("suppliers")
      .select("id, name, business_type, payment_reliability_score, trend")
      .eq("user_id", user.id),
  ]);

  const transactions = (txnResult.data ?? []) as TransactionRow[];
  const baselines = (baselineResult.data ?? []) as BaselineRow[];
  const suppliers = supplierResult.data ?? [];

  // ── Build supplier name → supplier lookup ───────────────────────────────────
  const supplierByName = new Map<
    string,
    { id: string; score: number; trend: string }
  >();
  for (const s of suppliers) {
    supplierByName.set(
      (s.name as string).toLowerCase().trim(),
      {
        id: s.id as string,
        score: Number(s.payment_reliability_score),
        trend: s.business_type as string,
      },
    );
    // Also index by business type for fuzzy matching
    supplierByName.set(
      (s.business_type as string).toLowerCase().trim(),
      {
        id: s.id as string,
        score: Number(s.payment_reliability_score),
        trend: s.trend as string,
      },
    );
  }

  // ── Aggregate transactions by vendor ──────────────────────────────────────
  const vendorMap = new Map<
    string,
    {
      category: string;
      totalSpend: number;
      txnCount: number;
      lastTransaction: string;
    }
  >();

  for (const t of transactions) {
    const vendor = (t.counterparty_name ?? "Unknown").trim();
    const category = (t.category ?? "other").trim();
    const existing = vendorMap.get(vendor);
    if (existing) {
      existing.totalSpend += Number(t.amount);
      existing.txnCount += 1;
      if (t.posted_at > existing.lastTransaction) {
        existing.lastTransaction = t.posted_at;
      }
    } else {
      vendorMap.set(vendor, {
        category,
        totalSpend: Number(t.amount),
        txnCount: 1,
        lastTransaction: t.posted_at,
      });
    }
  }

  // ── Build baseline lookup ─────────────────────────────────────────────────
  const baselineMap = new Map<string, BaselineRow>();
  for (const b of baselines) {
    baselineMap.set(`${b.category}::${(b.vendor ?? "").toLowerCase()}`, b);
  }

  // ── Build vendor summary rows ─────────────────────────────────────────────
  const vendors: VendorSummary[] = Array.from(vendorMap.entries())
    .map(([vendor, data]) => {
      // Find baseline
      const blKey = `${data.category}::${vendor.toLowerCase()}`;
      const bl = baselineMap.get(blKey);
      const avg30d = bl?.avg_30d ?? 0;
      const deltaVsBaseline =
        avg30d > 0
          ? Math.round(((data.totalSpend - avg30d) / avg30d) * 100)
          : null;
      const isAnomaly = deltaVsBaseline !== null && deltaVsBaseline > 40;

      // Match to supplier
      const supplierMatch =
        supplierByName.get(vendor.toLowerCase().trim()) ??
        supplierByName.get(data.category.toLowerCase().trim()) ??
        null;

      return {
        vendor,
        category: data.category,
        totalSpend: Math.round(data.totalSpend),
        txnCount: data.txnCount,
        avg30d,
        deltaVsBaseline,
        isAnomaly,
        supplierId: supplierMatch?.id ?? null,
        supplierScore: supplierMatch?.score ?? null,
        supplierTrend: supplierMatch?.trend ?? null,
        lastTransaction: data.lastTransaction,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const totalSpend = vendors.reduce((s, v) => s + v.totalSpend, 0);
  const anomalyCount = vendors.filter((v) => v.isAnomaly).length;
  const suppliersLinked = vendors.filter((v) => v.supplierId !== null).length;

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  for (const v of vendors) {
    categoryTotals.set(
      v.category,
      (categoryTotals.get(v.category) ?? 0) + v.totalSpend,
    );
  }
  const topCategory = Array.from(categoryTotals.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return (
    <ExpensesClient
      vendors={vendors}
      totalSpend={totalSpend}
      anomalyCount={anomalyCount}
      suppliersLinked={suppliersLinked}
      topCategory={topCategory?.[0] ?? "—"}
      topCategoryAmount={topCategory?.[1] ?? 0}
    />
  );
}
