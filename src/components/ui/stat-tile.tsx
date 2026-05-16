import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

type Status = "healthy" | "watch" | "danger" | "critical";

interface StatTileProps {
  label: string;
  value: number;
  format?: (v: number) => string;
  status?: Status;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

const statusValueClass: Record<Status, string> = {
  healthy: "text-signal-healthy",
  watch: "text-signal-watch",
  danger: "text-signal-danger",
  critical: "text-signal-critical",
};

export function StatTile({
  label,
  value,
  format,
  status = "healthy",
  delta,
  deltaLabel,
  icon: Icon,
  className,
}: StatTileProps) {
  const hasDelta = delta !== undefined;
  const deltaPositive = hasDelta && delta > 0;
  const deltaNeutral = hasDelta && delta === 0;
  const DeltaIcon = deltaPositive ? TrendingUp : TrendingDown;

  const deltaColor = deltaNeutral
    ? "text-ink-muted"
    : deltaPositive
      ? "text-signal-healthy"
      : "text-signal-danger";

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg p-3 sm:p-6 flex flex-col gap-2 sm:gap-3",
        className,
      )}
    >
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
        )}
        <span className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
          {label}
        </span>
      </div>

      {/* Value */}
      <AnimatedNumber
        value={value}
        format={format}
        className={cn(
          "text-2xl sm:text-4xl font-display font-semibold leading-none tabular-nums break-all",
          statusValueClass[status],
        )}
      />

      {/* Delta row */}
      {hasDelta && (
        <div className={cn("flex items-center gap-1 text-xs", deltaColor)}>
          <DeltaIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium tabular-nums">
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
          {deltaLabel && (
            <span className="text-ink-muted">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
