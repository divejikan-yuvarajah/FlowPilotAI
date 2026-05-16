"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { SignalBadge } from "@/components/ui/signal-badge";

export function WarRoomPreview() {
  const [runway, setRunway] = useState(14);

  useEffect(() => {
    const id = setInterval(
      () => setRunway((v) => (v === 14 ? 11 : 14)),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-sm space-y-3">
      {/* Header label */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-ink-muted font-medium">
          War Room — Live Preview
        </span>
        <SignalBadge variant="watch" size="sm">
          WATCH
        </SignalBadge>
      </div>

      {/* Glass card wrapping the stat tiles */}
      <div className="glass rounded-xl p-5 space-y-4">
        <StatTile
          label="Runway"
          value={runway}
          format={(v) => `${v} days`}
          status="watch"
          delta={-3}
          deltaLabel="vs last week"
          icon={Clock}
        />

        <div className="border-t border-white/[0.06]" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-ink-tertiary" />
              <span className="text-xs uppercase tracking-wider text-ink-tertiary">
                Cash
              </span>
            </div>
            <p className="text-lg font-display font-semibold text-signal-healthy tabular-nums">
              LKR 1.2M
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-ink-tertiary" />
              <span className="text-xs uppercase tracking-wider text-ink-tertiary">
                Overdue
              </span>
            </div>
            <p className="text-lg font-display font-semibold text-signal-danger tabular-nums">
              7 invoices
            </p>
          </div>
        </div>

        {/* AI insight strip */}
        <div className="flex items-start gap-2 border-t border-white/[0.06] pt-3">
          <SignalBadge variant="ai" size="sm">
            AI
          </SignalBadge>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Cash flow trending negative at{" "}
            <span className="text-signal-danger font-medium">−LKR 18,500/day</span>.
            Collect overdue invoices to extend runway by 8 days.
          </p>
        </div>
      </div>

      {/* Pulse dot + live label */}
      <div className="flex items-center gap-1.5 justify-center">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-healthy opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-healthy" />
        </span>
        <span className="text-xs text-ink-muted">Live data · refreshes every 15 min</span>
      </div>
    </div>
  );
}
