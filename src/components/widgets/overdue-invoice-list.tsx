"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  clientName: string;
  trustScore: number;
  riskTier: string;
}

interface OverdueInvoiceListProps {
  invoices: OverdueInvoice[];
  className?: string;
}

function getDaysColor(days: number): string {
  if (days >= 14) return "text-signal-critical";
  if (days >= 7)  return "text-signal-danger";
  if (days >= 3)  return "text-signal-watch";
  return "text-ink-muted";
}

function getTierVariant(tier: string): React.ComponentProps<typeof SignalBadge>["variant"] {
  switch (tier) {
    case "A": return "healthy";
    case "B": return "healthy";
    case "C": return "watch";
    case "D": return "danger";
    default:  return "critical";
  }
}

function DataRow({ invoice }: { invoice: OverdueInvoice }) {
  const router = useRouter();

  return (
    <div
      className="flex items-center gap-2 px-4 py-3 hover:bg-bg-raised transition-colors cursor-pointer"
      onClick={() => router.push(`/recovery/${invoice.id}`)}
    >
      {/* Tier badge */}
      <SignalBadge variant={getTierVariant(invoice.riskTier)} size="sm" className="shrink-0">
        {invoice.riskTier}
      </SignalBadge>

      {/* Client + invoice */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-primary truncate leading-tight">
          {invoice.clientName}
        </p>
        <p className="text-[11px] text-ink-muted">{invoice.invoiceNumber}</p>
      </div>

      {/* Amount — abbreviated on small screens */}
      <span className="font-mono text-xs sm:text-sm text-ink-primary tabular-nums shrink-0">
        <span className="sm:hidden">LKR {(invoice.amount / 1000).toFixed(0)}k</span>
        <span className="hidden sm:inline">LKR {invoice.amount.toLocaleString()}</span>
      </span>

      {/* Days overdue */}
      <span className={cn("text-xs font-bold tabular-nums shrink-0 min-w-[28px] text-right", getDaysColor(invoice.daysOverdue))}>
        {invoice.daysOverdue}d
      </span>

      <ChevronRight className="h-3.5 w-3.5 text-ink-muted shrink-0" />
    </div>
  );
}

export function OverdueInvoiceList({ invoices, className }: OverdueInvoiceListProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg flex flex-col h-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-signal-danger shrink-0" />
          <span className="font-medium text-sm text-ink-primary">Overdue Invoices</span>
        </div>
        <span className="text-xs text-signal-danger font-medium">
          {invoices.length} outstanding
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <span className="w-6 shrink-0" />
        <span className="text-[10px] text-ink-muted flex-1 uppercase tracking-wide">Client</span>
        <span className="text-[10px] text-ink-muted uppercase tracking-wide">Amount</span>
        <span className="text-[10px] text-ink-muted uppercase tracking-wide min-w-[28px] text-right">Due</span>
        <span className="w-3.5 shrink-0" />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <p className="text-sm text-ink-muted">No overdue invoices</p>
          </div>
        ) : (
          invoices.map((inv) => <DataRow key={inv.id} invoice={inv} />)
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <button
          onClick={() => {}}
          className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
        >
          View all in Overdue Radar →
        </button>
      </div>
    </div>
  );
}
