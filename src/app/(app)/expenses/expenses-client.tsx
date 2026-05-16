"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpenseDonut, type CategorySlice } from "@/components/charts/expense-donut";
import type { VendorSummary } from "./page";

// ─── Placeholder data ─────────────────────────────────────────────────────────

const DONUT_DATA: CategorySlice[] = [
  { category: "Inventory",  amount: 338_000, color: "hsl(38 92% 50%)" },
  { category: "Salaries",   amount: 280_000, color: "hsl(243 75% 65%)" },
  { category: "Logistics",  amount: 156_000, color: "hsl(199 89% 48%)" },
  { category: "Utilities",  amount: 62_000,  color: "hsl(142 71% 45%)" },
  { category: "Rent",       amount: 85_000,  color: "hsl(270 70% 65%)" },
  { category: "Marketing",  amount: 44_000,  color: "hsl(0 84% 60%)" },
  { category: "Software",   amount: 28_000,  color: "hsl(38 60% 60%)" },
  { category: "Taxes",      amount: 51_000,  color: "hsl(0 72% 45%)" },
  { category: "Other",      amount: 19_000,  color: "hsl(215 16% 47%)" },
];

const LPOPP_DEADLINES = [
  { name: "EPF Contribution",  due: "May 15, 2026", amount: 28_400, status: "due_soon" },
  { name: "ETF Contribution",  due: "May 15, 2026", amount: 7_100,  status: "due_soon" },
  { name: "VAT Return Q1",     due: "Jun 30, 2026", amount: 63_200, status: "upcoming" },
];

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
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.other;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, status = "neutral" }: {
  label: string; value: string; sub?: string;
  status?: "healthy" | "watch" | "danger" | "neutral";
}) {
  const valueClass = { healthy: "text-signal-healthy", watch: "text-signal-watch", danger: "text-signal-danger", neutral: "text-ink-primary" }[status];
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">{label}</p>
      <p className={cn("font-display text-2xl font-semibold leading-none tabular-nums", valueClass)}>{value}</p>
      {sub && <p className="text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

// ─── Supplier Trust Badge ─────────────────────────────────────────────────────

function SupplierTrustBadge({ score, supplierId, trend, onClick }: {
  score: number; supplierId: string; trend: string | null; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title="Navigate to supplier in Trust Mirror"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-all hover:scale-105 hover:shadow-sm",
        scoreBg(score), scoreColor(score),
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

// ─── LPOPP Card ───────────────────────────────────────────────────────────────

function LpoppCard() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Calendar className="h-4 w-4 text-signal-watch" />
        <h2 className="text-sm font-semibold text-ink-primary">Statutory Payment Tracker</h2>
        <span className="ml-auto text-[10px] font-medium bg-signal-watch/10 text-signal-watch border border-signal-watch/20 px-2 py-0.5 rounded">
          LPOPP
        </span>
      </div>
      <div className="divide-y divide-border">
        {LPOPP_DEADLINES.map((d) => (
          <div key={d.name} className="flex items-center gap-4 px-5 py-3">
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              d.status === "due_soon" ? "bg-signal-danger/10" : "bg-signal-watch/10",
            )}>
              {d.status === "due_soon"
                ? <AlertTriangle className="h-3.5 w-3.5 text-signal-danger" />
                : <Clock className="h-3.5 w-3.5 text-signal-watch" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-primary">{d.name}</p>
              <p className="text-[11px] text-ink-muted">Due {d.due}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-ink-primary tabular-nums">
                LKR {d.amount.toLocaleString()}
              </p>
              <span className={cn(
                "text-[10px] font-medium",
                d.status === "due_soon" ? "text-signal-danger" : "text-signal-watch",
              )}>
                {d.status === "due_soon" ? "Due soon" : "Upcoming"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ExpensesClientProps {
  vendors: VendorSummary[];
  totalSpend: number;
  anomalyCount: number;
  suppliersLinked: number;
  topCategory: string;
  topCategoryAmount: number;
}

export function ExpensesClient({
  vendors,
  totalSpend,
  anomalyCount,
  suppliersLinked,
  topCategory,
  topCategoryAmount,
}: ExpensesClientProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const totalDonut = DONUT_DATA.reduce((s, d) => s + d.amount, 0);

  const handleSupplierBadgeClick = (supplierId: string) => {
    router.push(`/suppliers#supplier-${supplierId}`);
  };

  const displayVendors = vendors.length > 0 ? vendors : [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink-primary">Expense Intelligence</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pilot-500/10 text-pilot-400 border border-pilot-500/20 uppercase tracking-wide">Beta</span>
          </div>
          <p className="text-sm text-ink-secondary mt-1">30-day vendor spend analysis with supplier relationship context</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total spend (30d)" value={formatLkr(totalSpend || totalDonut)} sub="All debit transactions" />
        <StatTile label="Anomalies detected" value={String(anomalyCount || 3)} sub="> 40% above baseline" status={anomalyCount > 0 ? "watch" : "healthy"} />
        <StatTile label="Suppliers linked" value={String(suppliersLinked || 4)} sub="Vendors with trust scores" />
        <StatTile label="Top category" value={(topCategory || "Inventory").charAt(0).toUpperCase() + (topCategory || "Inventory").slice(1)} sub={formatLkr(topCategoryAmount || 338_000)} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Donut chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink-primary mb-4">Spend by category</h2>
          <ExpenseDonut
            data={DONUT_DATA}
            totalAmount={totalDonut}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(selectedCategory === cat ? null : cat)}
          />
        </div>

        {/* Vendor table */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Receipt className="h-4 w-4 text-ink-tertiary" />
            <h2 className="text-sm font-semibold text-ink-primary">Vendor Breakdown</h2>
            <span className="ml-auto text-xs text-ink-muted">{displayVendors.length || 6} vendors · last 30 days</span>
          </div>
          {displayVendors.length === 0 ? (
            <VendorStubTable onSupplierClick={handleSupplierBadgeClick} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-muted/40">
                    {["Vendor", "Category", "Total spend", "vs baseline", "Txns", "Supplier trust"].map((h) => (
                      <th key={h} className="text-left text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayVendors.map((v) => (
                    <tr key={v.vendor} className={cn("hover:bg-bg-muted/30 transition-colors", v.isAnomaly && "bg-signal-watch/5")}>
                      <td className="px-4 py-3 pl-5">
                        <div className="flex items-center gap-2">
                          {v.isAnomaly && <AlertTriangle className="h-3.5 w-3.5 text-signal-watch shrink-0" />}
                          <span className="font-medium text-ink-primary text-xs">{v.vendor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded border text-[11px] font-medium capitalize", categoryClass(v.category))}>{v.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-ink-primary tabular-nums">LKR {v.totalSpend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {v.deltaVsBaseline !== null ? (
                          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", v.deltaVsBaseline > 40 ? "text-signal-watch" : v.deltaVsBaseline > 0 ? "text-ink-secondary" : "text-signal-healthy")}>
                            {v.deltaVsBaseline > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {v.deltaVsBaseline > 0 ? "+" : ""}{v.deltaVsBaseline}%
                          </span>
                        ) : <span className="text-[11px] text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-ink-muted">{v.txnCount}</td>
                      <td className="px-4 py-3 pr-5">
                        {v.supplierId && v.supplierScore !== null ? (
                          <SupplierTrustBadge score={v.supplierScore} supplierId={v.supplierId} trend={v.supplierTrend} onClick={() => handleSupplierBadgeClick(v.supplierId!)} />
                        ) : <span className="text-[11px] text-ink-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* LPOPP statutory tracker */}
      <LpoppCard />

      {/* Anomaly callout */}
      {(anomalyCount > 0 || displayVendors.length === 0) && (
        <div className="bg-signal-watch/5 border border-signal-watch/20 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-signal-watch shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-signal-watch">Expense anomalies detected</p>
            <p className="text-xs text-ink-secondary mt-0.5">Inventory spend from Janashakthi Distributors is 36.3% above your 30-day baseline. Review in CFO Dashboard.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stub vendor table (when no real data) ───────────────────────────────────

const STUB_VENDORS = [
  { vendor: "Janashakthi Distributors", category: "inventory",  spend: 338_000, delta: 36, txns: 4, anomaly: true,  supplierScore: 82, trend: "stable" },
  { vendor: "Colombo Freight Ltd",      category: "logistics",  spend: 156_000, delta: 12, txns: 7, anomaly: false, supplierScore: 64, trend: "worsening" },
  { vendor: "Dialog Axiata",            category: "utilities",  spend: 62_000,  delta: -2, txns: 2, anomaly: false, supplierScore: 95, trend: "improving" },
  { vendor: "Hayleys Business Centre",  category: "rent",       spend: 85_000,  delta: 0,  txns: 1, anomaly: false, supplierScore: null, trend: null },
  { vendor: "Google Workspace",         category: "software",   spend: 28_000,  delta: 0,  txns: 1, anomaly: false, supplierScore: null, trend: null },
  { vendor: "IRD Payments",             category: "taxes",      spend: 51_000,  delta: 5,  txns: 2, anomaly: false, supplierScore: null, trend: null },
];

function VendorStubTable({ onSupplierClick }: { onSupplierClick: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-muted/40">
            {["Vendor", "Category", "Total spend", "vs baseline", "Txns", "Supplier trust"].map((h) => (
              <th key={h} className="text-left text-[11px] uppercase tracking-wider text-ink-tertiary font-medium px-4 py-3 first:pl-5 last:pr-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {STUB_VENDORS.map((v) => (
            <tr key={v.vendor} className={cn("hover:bg-bg-muted/30 transition-colors", v.anomaly && "bg-signal-watch/5")}>
              <td className="px-4 py-3 pl-5">
                <div className="flex items-center gap-2">
                  {v.anomaly && <AlertTriangle className="h-3.5 w-3.5 text-signal-watch shrink-0" />}
                  <span className="font-medium text-ink-primary text-xs">{v.vendor}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn("inline-flex px-2 py-0.5 rounded border text-[11px] font-medium capitalize", categoryClass(v.category))}>{v.category}</span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-ink-primary tabular-nums">LKR {v.spend.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", v.delta > 40 ? "text-signal-watch" : v.delta > 0 ? "text-ink-secondary" : v.delta < 0 ? "text-signal-healthy" : "text-ink-muted")}>
                  {v.delta > 0 ? <TrendingUp className="h-3 w-3" /> : v.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {v.delta > 0 ? "+" : ""}{v.delta}%
                </span>
              </td>
              <td className="px-4 py-3 text-center text-xs text-ink-muted">{v.txns}</td>
              <td className="px-4 py-3 pr-5">
                {v.supplierScore !== null ? (
                  <button
                    onClick={() => onSupplierClick("stub")}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium hover:scale-105 transition-all", scoreBg(v.supplierScore), scoreColor(v.supplierScore))}
                  >
                    <Building2 className="h-2.5 w-2.5" />
                    Supplier Trust: {v.supplierScore}
                    {v.trend === "worsening" && <TrendingDown className="h-2.5 w-2.5" />}
                    {v.trend === "improving" && <TrendingUp className="h-2.5 w-2.5" />}
                    {v.trend === "stable" && <CheckCircle2 className="h-2.5 w-2.5" />}
                  </button>
                ) : <span className="text-[11px] text-ink-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
