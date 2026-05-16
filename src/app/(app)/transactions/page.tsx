"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
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
}

type Filter = "all" | "credit" | "debit";

const FILTER_CONFIG: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credits" },
  { key: "debit", label: "Debits" },
];

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

  const filtered =
    filter === "all" ? txns : txns.filter((t) => t.type === filter);

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-primary flex items-center gap-2">
              Transaction Feed
              <span className="text-[10px] px-1.5 py-0.5 bg-signal-healthy/20 text-signal-healthy rounded-full font-semibold tracking-wider">
                LIVE
              </span>
            </h1>
            <p className="text-sm text-ink-secondary mt-0.5">
              Real-time from Seylan Bank sandbox · last 50 transactions
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchTxns(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-bg-subtle text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {FILTER_CONFIG.map(({ key, label }) => {
          const count =
            key === "all"
              ? txns.length
              : txns.filter((t) => t.type === key).length;
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors border",
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
        {/* Column headers */}
        <div className="grid grid-cols-[100px_30px_1fr_140px_120px] gap-4 items-center px-5 py-3 border-b border-border text-xs text-ink-muted uppercase tracking-wider font-medium">
          <span>Date</span>
          <span />
          <span>Description</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="divide-y divide-border">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[100px_30px_1fr_140px_120px] gap-4 items-center px-5 py-3"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-24 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
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
            <p className="text-sm text-ink-muted">
              No transactions to display
            </p>
            <button
              onClick={() => fetchTxns(true)}
              className="text-xs text-pilot-500 hover:text-pilot-400 transition-colors"
            >
              Try refreshing
            </button>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y divide-border">
            {filtered.map((t) => {
              const isCredit = t.type === "credit";
              const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
              const sign = isCredit ? "+" : "−";
              const amountColor = isCredit
                ? "text-signal-healthy"
                : "text-signal-danger";

              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[100px_30px_1fr_140px_120px] gap-4 items-center px-5 py-3 hover:bg-bg-raised transition-colors"
                >
                  {/* Date */}
                  <div className="text-xs">
                    <p className="text-ink-secondary tabular-nums">
                      {format(new Date(t.postedAt), "MMM d")}
                    </p>
                    <p className="text-ink-muted tabular-nums">
                      {format(new Date(t.postedAt), "h:mm a")}
                    </p>
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                      isCredit
                        ? "bg-signal-healthy/10"
                        : "bg-signal-danger/10",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", amountColor)} />
                  </div>

                  {/* Description */}
                  <div className="min-w-0">
                    <p className="text-sm text-ink-primary truncate">
                      {t.description ||
                        t.counterparty ||
                        t.transactionCode ||
                        "Transaction"}
                    </p>
                    {t.reference && (
                      <p className="text-xs text-ink-tertiary truncate">
                        Ref: {t.reference}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums text-right",
                      amountColor,
                    )}
                  >
                    {sign}LKR {t.amount.toLocaleString()}
                  </p>

                  {/* Running balance */}
                  <p className="font-mono text-xs text-ink-muted tabular-nums text-right">
                    {t.balanceAfter !== undefined
                      ? `LKR ${t.balanceAfter.toLocaleString()}`
                      : "—"}
                  </p>
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
