"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";

export interface AlertEntry {
  id: string;
  ruleName: string;
  outcome: string;
  triggeredAt: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  entries: AlertEntry[];
  className?: string;
}

function outcomeToVariant(outcome: string): React.ComponentProps<typeof SignalBadge>["variant"] {
  switch (outcome) {
    case "success":     return "healthy";
    case "no_response": return "watch";
    case "pending":     return "watch";
    case "failed":      return "danger";
    default:            return "neutral";
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case "success":     return "Success";
    case "no_response": return "No response";
    case "pending":     return "Pending";
    case "failed":      return "Failed";
    default:            return outcome;
  }
}

const rowVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export function ActivityFeed({ entries, className }: ActivityFeedProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Activity className="h-4 w-4 text-ink-tertiary shrink-0" />
        <span className="font-medium text-sm text-ink-primary">Activity Feed</span>
        <span className="ml-auto text-xs text-ink-muted">Last 10 rule triggers</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-2 border-b border-border">
        <span className="text-xs text-ink-muted">Rule</span>
        <span className="text-xs text-ink-muted">Details</span>
        <span className="text-xs text-ink-muted">Status</span>
        <span className="text-xs text-ink-muted text-right">When</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-ink-muted">No recent activity</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const meta = entry.metadata ?? {};
            const detail =
              typeof meta.invoice === "string"
                ? `${meta.invoice}${meta.client ? ` · ${meta.client}` : ""}`
                : typeof meta.vendor === "string"
                  ? `${meta.vendor}`
                  : typeof meta.runway_days === "number"
                    ? `${meta.runway_days} days remaining`
                    : "";

            return (
              <motion.div
                key={entry.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-bg-raised transition-colors"
              >
                {/* Rule name */}
                <span className="text-sm text-ink-primary font-medium truncate">
                  {entry.ruleName}
                </span>

                {/* Detail */}
                <span className="text-xs text-ink-muted truncate max-w-[140px]">
                  {detail || "—"}
                </span>

                {/* Status badge */}
                <SignalBadge variant={outcomeToVariant(entry.outcome)} size="sm">
                  {outcomeLabel(entry.outcome)}
                </SignalBadge>

                {/* Timestamp */}
                <span className="text-xs text-ink-muted text-right tabular-nums whitespace-nowrap">
                  {formatDistanceToNow(new Date(entry.triggeredAt), { addSuffix: true })}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
