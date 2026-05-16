"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Receipt,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorSummary } from "./page";

interface ExpensesClientProps {
  vendors: VendorSummary[];
  totalSpend: number;
  anomalyCount: number;
  suppliersLinked: number;
  topCategory: string;
  topCategoryAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLkr(n: number): string {
  if (n >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `LKR ${(n / 1_000).toFixed(0)}k`;
  return `LKR ${n.toLocaleString()}`;
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-signal-healthy";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-signal-watch";
  if (score >= 45) return "text-orange-400";
  return "text-signal-danger";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-signal-healthy/10 border-signal-healthy/20";
  if (score >= 75) return "bg-emerald-400/10 border-emerald-400/20";
  if (score >= 60) return "bg-signal-watch/10 border-signal-watch/20";
  if (score >= 45) return "bg-orange-400/10 border-orange-400/20";
  return "bg-signal-danger/10 border-signal-danger/20";
}

const CATEGORY_COLORS: Record<string, string> = {
  inventory: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  logistics: "bg-sky-400/10 text-sky-400 border-sky-400/20",
  salaries: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  utilities: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rent: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  marketing: "bg-rose-400/10 text-rose-400 border-rose-400/20",
  software: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  taxes: "bg-red-500/10 text-red-400 border-red-400/20",
  other: "bg-slate-400/10 text-slate-400 border-slate-400/20",
};

function categoryClass(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  status = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  status?: "healthy" | "watch" | "danger" | "neutral";
}) {
  const valueClass = {
    healthy: "text-signal-healthy",
    watch: "text-signal-watch",
    danger: "text-signal-danger",
    neutral: "text-ink-primary",
  }[status];

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">
        {label}
      </p>
      <p className={cn("font-display text-2xl font-semibold leading-none tabular-nums", valueClass)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

// ─── Supplier Trust Badge ─────────────────────────────────────────────────────

function SupplierTrustBadge({
  score,
  supplierId,
  trend,
  onClick,
}: {
  score: number;
  supplierId: string;
  trend: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`Navigate to supplier in Trust Mirror`}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-all hover:scale-105 hover:shadow-sm",
        scoreBg(score),
        scoreColor(score),
      )}
    >
      <Building2 className="h-2.5 w-2.5" />
      <span>Supplier Trust: {score}</span>
      {trend === "worsening" && <TrendingDown className="h-2.5 w-2.5" />}
      {trend === "improving" && <TrendingUp className="h-2.5 w-2.5" />}
      {trend === "stable" && <Minus className="h-2.5 w-2.5" />}
      <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExpensesClient({
  vendors,
  totalSpend,
  anomalyCount,
  suppliersLinked,
  topCategory,
  topCategoryAmount,
}: ExpensesClientProps) {
  const router = useRouter();

  const handleSupplierBadgeClick = (supplierId: string) => {
    router.push(`/suppliers#supplier-${supplierId}`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">
          Expense Intelligence
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          30-day vendor spend analysis with supplier relationship context
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total spend (30d)"
          value={formatLkr(totalSpend)}
          sub="All debit transactions"
          status="neutral"
        />
        <StatTile
          label="Anomalies detected"
          value={String(anomalyCount)}
          sub="> 40% above baseline"
          status={anomalyCount > 0 ? "watch" : "healthy"}
        />
        <StatTile
          label="Suppliers linked"
          value={String(suppliersLinked)}
          sub="Vendors with trust scores"
          status="neutral"
        />
        <StatTile
          label="Top category"
          value={topCategory.charAt(0).toUpperCase() + topCategory.slice(1)}
          sub={formatLkr(topCategoryAmount)}
          status="neutral"
        />
      </div>

      {/* Vendor table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Receipt className="h-4 w-4 text-ink-tertiary" />
          <h2 className="text-sm font-semibold text-ink-primary">
            Vendor Breakdown
          </h2>
          <span className="ml-auto text-xs text-ink-muted">
            {vendors.length} vendors · last 30 days
          </span>
        </div>

        {vendors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Receipt className="h-8 w-8 text-ink-muted mx-auto mb-3" />
            <p className="text-sm text-ink-secondary">No expense data found</p>
            <p className="text-xs text-ink-muted mt-1">
              Run the seed route to populate demo transaction data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-muted/40">
                  <th className="text-left text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-5 py-3">
                    Vendor
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-3 py-3">
                    Category
                  </th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-3 py-3">
                    Total spend
                  </th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-3 py-3">
                    vs baseline
                  </th>
                  <th className="text-center text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-3 py-3">
                    Txns
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-3 py-3 pr-5">
                    Supplier trust
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendors.map((v) => (
                  <tr
                    key={v.vendor}
                    className={cn(
                      "hover:bg-bg-muted/30 transition-colors",
                      v.isAnomaly && "bg-signal-watch/5",
                    )}
                  >
                    {/* Vendor name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {v.isAnomaly && (
                          <AlertTriangle className="h-3.5 w-3.5 text-signal-watch shrink-0" />
                        )}
                        <span className="font-medium text-ink-primary text-xs">
                          {v.vendor}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        Last:{" "}
                        {new Date(v.lastTransaction).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded border text-[11px] font-medium capitalize",
                          categoryClass(v.category),
                        )}
                      >
                        {v.category}
                      </span>
                    </td>

                    {/* Total spend */}
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono text-xs font-semibold text-ink-primary tabular-nums">
                        LKR {v.totalSpend.toLocaleString()}
                      </span>
                    </td>

                    {/* Delta vs baseline */}
                    <td className="px-3 py-3 text-right">
                      {v.deltaVsBaseline !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                            v.deltaVsBaseline > 40
                              ? "text-signal-watch"
                              : v.deltaVsBaseline > 0
                                ? "text-ink-secondary"
                                : "text-signal-healthy",
                          )}
                        >
                          {v.deltaVsBaseline > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : v.deltaVsBaseline < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {v.deltaVsBaseline > 0 ? "+" : ""}
                          {v.deltaVsBaseline}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-muted">—</span>
                      )}
                    </td>

                    {/* Txn count */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-ink-muted">{v.txnCount}</span>
                    </td>

                    {/* Supplier Trust badge */}
                    <td className="px-3 py-3 pr-5">
                      {v.supplierId && v.supplierScore !== null ? (
                        <SupplierTrustBadge
                          score={v.supplierScore}
                          supplierId={v.supplierId}
                          trend={v.supplierTrend}
                          onClick={() =>
                            handleSupplierBadgeClick(v.supplierId!)
                          }
                        />
                      ) : (
                        <span className="text-[11px] text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anomaly callout */}
      {anomalyCount > 0 && (
        <div className="bg-signal-watch/5 border border-signal-watch/20 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-signal-watch shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-signal-watch">
              {anomalyCount} expense anomal{anomalyCount === 1 ? "y" : "ies"} detected
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              These vendors exceeded their 30-day baseline by more than 40%.
              Review these transactions in your CFO Dashboard for details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
