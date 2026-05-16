"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Txn {
  id: string;
  postedAt: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter?: number;
  reference?: string;
  description?: string;
  counterparty?: string | null;
  transactionCode?: string;
  category?: string;
  isAnomaly?: boolean;
  matchedInvoiceId?: string | null;
}

type Filter = "all" | "credit" | "debit" | "anomaly" | "unreconciled";

const FILTER_CONFIG: { key: Filter; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "credit",       label: "Credits" },
  { key: "debit",        label: "Debits" },
  { key: "anomaly",      label: "Anomalies" },
  { key: "unreconciled", label: "Unreconciled" },
];

const CATEGORY_COLORS: Record<string, string> = {
  inventory:      "bg-amber-400/10 text-amber-400",
  logistics:      "bg-sky-400/10 text-sky-400",
  salaries:       "bg-violet-400/10 text-violet-400",
  utilities:      "bg-emerald-400/10 text-emerald-400",
  rent:           "bg-purple-400/10 text-purple-400",
  marketing:      "bg-rose-400/10 text-rose-400",
  software:       "bg-orange-400/10 text-orange-400",
  taxes:          "bg-red-500/10 text-red-400",
  client_payment: "bg-signal-healthy/10 text-signal-healthy",
  other:          "bg-slate-400/10 text-slate-400",
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchTxns = useCallback(async (skipCache = false) => {
    if (skipCache) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/seylan/transactions?limit=50${skipCache ? "&refresh=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { transactions: Txn[] };
      setTxns(data.transactions ?? []);
      if (skipCache) toast.success("Transactions refreshed");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load transactions";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTxns();
  }, [fetchTxns]);

  const filtered = txns.filter((t) => {
    if (filter === "all") return true;
    if (filter === "credit") return t.type === "credit";
    if (filter === "debit") return t.type === "debit";
    if (filter === "anomaly") return !!t.isAnomaly;
    if (filter === "unreconciled") return !t.matchedInvoiceId && t.type === "credit";
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary flex items-center gap-2">
            Transaction Feed
            <span className="text-[10px] px-1.5 py-0.5 bg-signal-healthy/20 text-signal-healthy rounded-full font-semibold tracking-wider">
              LIVE
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Seylan Bank · last 50 transactions
          </p>
        </div>
        <button
          onClick={() => fetchTxns(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-bg-subtle text-xs sm:text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── Filter bar — horizontally scrollable on mobile ─────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_CONFIG.map(({ key, label }) => {
          const count =
            key === "all"          ? txns.length :
            key === "credit"       ? txns.filter((t) => t.type === "credit").length :
            key === "debit"        ? txns.filter((t) => t.type === "debit").length :
            key === "anomaly"      ? txns.filter((t) => !!t.isAnomaly).length :
            key === "unreconciled" ? txns.filter((t) => !t.matchedInvoiceId && t.type === "credit").length :
            0;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border shrink-0",
                active
                  ? "bg-pilot-500/10 border-pilot-500/40 text-pilot-400"
                  : "bg-bg-subtle border-border text-ink-secondary hover:bg-bg-raised hover:text-ink-primary",
              )}
            >
              {label}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full tabular-nums font-semibold",
                  active
                    ? "bg-pilot-500/20 text-pilot-400"
                    : "bg-bg-muted text-ink-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">

        {/* Loading skeletons */}
        {loading && (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center py-12 gap-2 text-signal-danger">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm text-ink-muted">No transactions to display</p>
            <button onClick={() => fetchTxns(true)} className="text-xs text-pilot-500 hover:text-pilot-400 transition-colors">
              Try refreshing
            </button>
          </div>
        )}

        {/* Rows — card style on mobile, table on sm+ */}
        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y divide-border">
            {filtered.map((t) => {
              const isCredit = t.type === "credit";
              const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
              const sign = isCredit ? "+" : "−";
              const amountColor = isCredit ? "text-signal-healthy" : "text-signal-danger";

              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-bg-raised transition-colors",
                    t.isAnomaly && "bg-signal-watch/5",
                  )}
                >
                  {/* Type icon */}
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", isCredit ? "bg-signal-healthy/10" : "bg-signal-danger/10")}>
                    <Icon className={cn("h-4 w-4", amountColor)} />
                  </div>

                  {/* Description + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-ink-primary truncate">
                        {t.description || t.counterparty || t.transactionCode || "Transaction"}
                      </p>
                      {t.isAnomaly && <AlertCircle className="h-3 w-3 text-signal-watch shrink-0" />}
                      {t.matchedInvoiceId && <LinkIcon className="h-3 w-3 text-pilot-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-ink-muted tabular-nums">
                        {format(new Date(t.postedAt), "MMM d, h:mm a")}
                      </span>
                      {t.category && (
                        <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize", CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.other)}>
                          {t.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + balance */}
                  <div className="text-right shrink-0">
                    <p className={cn("font-mono text-sm font-semibold tabular-nums", amountColor)}>
                      {sign}LKR {(t.amount / 1000).toFixed(1)}k
                    </p>
                    {t.balanceAfter !== undefined && (
                      <p className="font-mono text-[10px] text-ink-muted tabular-nums mt-0.5 hidden sm:block">
                        Bal: {(t.balanceAfter / 1000).toFixed(0)}k
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-ink-muted text-right">
          Showing {filtered.length} of {txns.length} transactions
        </p>
      )}
    </div>
  );
}
