"use client";

import Link from "next/link";
import { CheckCircle, AlertTriangle, AlertCircle, ArrowRight, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";

export type ActionStatus = "healthy" | "watch" | "danger" | "critical" | "neutral";

export interface CriticalAction {
  id: string;
  label: string;
  status: ActionStatus;
  href: string;
  description?: string;
}

interface CriticalActionsListProps {
  actions: CriticalAction[];
  className?: string;
}

const STATUS_ICON: Record<ActionStatus, React.ElementType> = {
  healthy:  CheckCircle,
  watch:    AlertTriangle,
  danger:   AlertCircle,
  critical: AlertCircle,
  neutral:  Info,
};

const STATUS_ICON_COLOR: Record<ActionStatus, string> = {
  healthy:  "text-signal-healthy",
  watch:    "text-signal-watch",
  danger:   "text-signal-danger",
  critical: "text-signal-critical",
  neutral:  "text-ink-muted",
};

const STATUS_BADGE: Record<ActionStatus, React.ComponentProps<typeof SignalBadge>["variant"]> = {
  healthy:  "healthy",
  watch:    "watch",
  danger:   "danger",
  critical: "critical",
  neutral:  "neutral",
};

export function CriticalActionsList({ actions, className }: CriticalActionsListProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg flex flex-col h-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Zap className="h-4 w-4 text-signal-watch shrink-0" />
        <span className="font-medium text-sm text-ink-primary">Critical Actions</span>
        <span className="ml-auto text-xs text-ink-muted">{actions.length} pending</span>
      </div>

      {/* Actions */}
      <div className="flex-1 divide-y divide-border">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-5 py-8 text-center">
            <CheckCircle className="h-8 w-8 text-signal-healthy opacity-60" />
            <p className="text-sm text-ink-muted">
              All clear — no critical actions today
            </p>
          </div>
        ) : (
          actions.map((action) => {
            const Icon = STATUS_ICON[action.status];
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 px-5 py-3 group hover:bg-bg-raised transition-colors"
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", STATUS_ICON_COLOR[action.status])}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-primary leading-snug truncate">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-ink-muted truncate mt-0.5">
                      {action.description}
                    </p>
                  )}
                </div>
                <Link
                  href={action.href}
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors",
                    "opacity-0 group-hover:opacity-100",
                    action.status === "danger" || action.status === "critical"
                      ? "bg-signal-danger/10 text-signal-danger hover:bg-signal-danger/20"
                      : "bg-bg-muted text-ink-secondary hover:text-ink-primary",
                  )}
                >
                  Run
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <SignalBadge
                  variant={STATUS_BADGE[action.status]}
                  size="sm"
                  className="shrink-0 group-hover:opacity-0 transition-opacity absolute"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
