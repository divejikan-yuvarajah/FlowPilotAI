"use client";

import { useState, useMemo } from "react";
import { CheckCircle, X, Send, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OverdueCard,
  type OverdueInvoiceData,
} from "@/components/invoices/overdue-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type StageFilter = "all" | "1" | "2" | "3";
type SortKey = "most_overdue" | "highest_amount" | "lowest_trust" | "highest_priority";

const STAGE_LABEL: Record<StageFilter, string> = {
  all: "All",
  "1": "Stage 1 · Soft",
  "2": "Stage 2 · Firm",
  "3": "Stage 3 · Legal",
};

const SORT_LABEL: Record<SortKey, string> = {
  most_overdue:      "Most overdue",
  highest_amount:    "Highest amount",
  lowest_trust:      "Lowest trust score",
  highest_priority:  "Highest priority",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stageOf(invoice: OverdueInvoiceData): StageFilter {
  if (invoice.escalationStage === "3") return "3";
  if (invoice.escalationStage === "2") return "2";
  if (invoice.escalationStage === "1") return "1";
  // Uncontacted: bucket by days
  if (invoice.daysOverdue >= 14) return "3";
  if (invoice.daysOverdue >= 7)  return "2";
  return "1";
}

function sortInvoices(invoices: OverdueInvoiceData[], key: SortKey): OverdueInvoiceData[] {
  return [...invoices].sort((a, b) => {
    switch (key) {
      case "most_overdue":     return b.daysOverdue - a.daysOverdue;
      case "highest_amount":   return b.amount - a.amount;
      case "lowest_trust":     return a.client.trustScore - b.client.trustScore;
      case "highest_priority": return (b.riskScore ?? 0) - (a.riskScore ?? 0);
    }
  });
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors border",
        active
          ? "bg-pilot-500/10 border-pilot-500/40 text-pilot-400"
          : "bg-bg-subtle border-border text-ink-secondary hover:text-ink-primary hover:bg-bg-raised",
      )}
    >
      {label}
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded-full tabular-nums font-semibold",
          active ? "bg-pilot-500/20 text-pilot-400" : "bg-bg-muted text-ink-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Selection bar ────────────────────────────────────────────────────────────

function SelectionBar({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-pilot-500/30 bg-pilot-500/5">
      <span className="text-sm font-medium text-pilot-400">{count} selected</span>
      <div className="flex items-center gap-2 ml-2">
        <button className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary px-3 py-1.5 rounded-md border border-border hover:bg-bg-raised transition-colors">
          <Send className="h-3.5 w-3.5" />
          Send Stage 1 to all
        </button>
        <button className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary px-3 py-1.5 rounded-md border border-border hover:bg-bg-raised transition-colors">
          <FileText className="h-3.5 w-3.5" />
          Generate report
        </button>
      </div>
      <button
        onClick={onClear}
        className="ml-auto text-ink-muted hover:text-ink-primary transition-colors"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-signal-healthy/10">
        <CheckCircle className="h-8 w-8 text-signal-healthy" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-ink-primary">
          No overdue invoices
        </h2>
        <p className="text-sm text-ink-secondary">
          All your clients are paying on time.
        </p>
      </div>
    </div>
  );
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-bg-subtle text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors"
      >
        {SORT_LABEL[value]}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg z-20 overflow-hidden">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={cn(
                "w-full text-left px-3.5 py-2.5 text-sm transition-colors",
                value === key
                  ? "bg-pilot-500/10 text-pilot-400"
                  : "text-ink-secondary hover:bg-bg-raised hover:text-ink-primary",
              )}
            >
              {SORT_LABEL[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function OverdueClient({ invoices }: { invoices: OverdueInvoiceData[] }) {
  const [filter, setFilter] = useState<StageFilter>("all");
  const [sort, setSort] = useState<SortKey>("highest_priority");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Counts per stage
  const stageCounts = useMemo(() => {
    const counts: Record<StageFilter, number> = { all: invoices.length, "1": 0, "2": 0, "3": 0 };
    invoices.forEach((inv) => { counts[stageOf(inv)]++; });
    return counts;
  }, [invoices]);

  // Filtered + sorted list
  const displayed = useMemo(() => {
    const filtered =
      filter === "all" ? invoices : invoices.filter((inv) => stageOf(inv) === filter);
    return sortInvoices(filtered, sort);
  }, [invoices, filter, sort]);

  function handleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selected ? next.add(id) : next.delete(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter + Sort bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "1", "2", "3"] as StageFilter[]).map((stage) => (
            <FilterChip
              key={stage}
              label={STAGE_LABEL[stage]}
              count={stageCounts[stage]}
              active={filter === stage}
              onClick={() => setFilter(stage)}
            />
          ))}
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <SelectionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} />
      )}

      {/* Cards */}
      {displayed.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {displayed.map((inv) => (
            <OverdueCard
              key={inv.id}
              invoice={inv}
              isSelected={selectedIds.has(inv.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      {displayed.length > 0 && (
        <p className="text-xs text-ink-muted text-right">
          Showing {displayed.length} of {invoices.length} overdue invoices
        </p>
      )}
    </div>
  );
}
