"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  TrendingDown,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  date: string;
  type: "inflow" | "outflow";
  category: string;
  amount: number;
  label: string;
  confidence: "high" | "medium" | "low";
  status: string;
}

export interface TimelineChartPoint {
  date: string;
  dateStr: string;
  balance: number;
  projected: boolean;
  hasInflow: boolean;
  hasOutflow: boolean;
}

interface Props {
  chartPoints: TimelineChartPoint[];
  events: TimelineEvent[];
  balance: number;
  dailyBurn: number;
  runwayDays: number;
  totalExpectedInflows: number;
  totalExpectedOutflows: number;
  overdueCount: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  healthy: "hsl(142 71% 45%)",
  watch: "hsl(38 92% 50%)",
  danger: "hsl(0 84% 60%)",
  pilot: "hsl(221 83% 63%)",
  border: "hsl(217 33% 17%)",
  surface: "hsl(220 26% 12%)",
  text: "hsl(213 31% 91%)",
  muted: "hsl(215 20% 55%)",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: TimelineChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-ink-primary mb-1">{label}</p>
      <p className="font-mono text-signal-healthy tabular-nums">
        LKR {payload[0].value.toLocaleString()}
      </p>
      {pt.hasInflow && (
        <p className="text-emerald-400 mt-0.5">↑ Inflow expected</p>
      )}
      {pt.hasOutflow && (
        <p className="text-signal-danger mt-0.5">↓ Payment due</p>
      )}
    </div>
  );
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: TimelineEvent["confidence"] }) {
  const map = {
    high: "bg-signal-healthy/10 text-signal-healthy",
    medium: "bg-signal-watch/10 text-signal-watch",
    low: "bg-signal-danger/10 text-signal-danger",
  };
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded capitalize", map[level])}>
      {level}
    </span>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type Filter = "all" | "inflow" | "outflow";

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TimelineClient({
  chartPoints,
  events,
  balance,
  dailyBurn,
  runwayDays,
  totalExpectedInflows,
  totalExpectedOutflows,
  overdueCount,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Show every 7th label on x-axis to avoid crowding
  const xTick = (value: string, index: number) =>
    index % 7 === 0 ? value : "";

  const runwayStatus =
    runwayDays < 7
      ? "critical"
      : runwayDays < 14
        ? "danger"
        : runwayDays < 30
          ? "watch"
          : "healthy";

  const runwayColor = {
    healthy: C.healthy,
    watch: C.watch,
    danger: C.danger,
    critical: C.danger,
  }[runwayStatus];

  // Danger line: balance / burn
  const dangerBalance = dailyBurn * 7;

  const filteredEvents = events.filter(
    (e) => filter === "all" || e.type === filter,
  );

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            Cash Flow Timeline
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            90-day projection combining invoices, obligations, and burn rate
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-emerald-400" />
            Actual
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-ink-muted" />
            Projected
          </div>
        </div>
      </div>

      {/* ── Stat tiles ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Current balance",
            value: `LKR ${(balance / 1000).toFixed(0)}k`,
            sub: "Live from Seylan",
            color: "text-ink-primary",
          },
          {
            label: "Runway",
            value: `${runwayDays}d`,
            sub: runwayStatus.charAt(0).toUpperCase() + runwayStatus.slice(1),
            color: runwayColor,
          },
          {
            label: "Expected inflows",
            value: `LKR ${(totalExpectedInflows / 1000).toFixed(0)}k`,
            sub: `${overdueCount} overdue collections`,
            color: "text-emerald-400",
          },
          {
            label: "Scheduled outflows",
            value: `LKR ${(totalExpectedOutflows / 1000).toFixed(0)}k`,
            sub: `${events.filter((e) => e.type === "outflow").length} obligations`,
            color: "text-signal-danger",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1"
          >
            <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">
              {tile.label}
            </p>
            <p
              className={cn(
                "font-display text-2xl font-semibold tabular-nums leading-none",
                tile.color,
              )}
            >
              {tile.value}
            </p>
            <p className="text-[11px] text-ink-muted">{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-xs font-medium text-ink-secondary mb-4">
          Projected cash balance — next 90 days
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartPoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.healthy} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.healthy} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: C.muted, fontSize: 10 }}
              tickFormatter={xTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: C.muted, fontSize: 10 }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Danger reference line */}
            <ReferenceLine
              y={dangerBalance}
              stroke={C.danger}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "7-day buffer",
                fill: C.danger,
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            {/* Today reference line */}
            <ReferenceLine
              x={chartPoints[0]?.date}
              stroke={C.muted}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={C.healthy}
              strokeWidth={2}
              fill="url(#balanceGrad)"
              dot={false}
              activeDot={{ r: 4, fill: C.healthy }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Events table ────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ink-tertiary" />
            <h2 className="text-sm font-semibold text-ink-primary">
              Scheduled Events
            </h2>
            <span className="text-xs text-ink-muted">
              {filteredEvents.length} item{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-bg-muted rounded-lg p-0.5">
            {(["all", "inflow", "outflow"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                  filter === f
                    ? "bg-surface text-ink-primary shadow-sm"
                    : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {f === "inflow" ? "Inflows" : f === "outflow" ? "Outflows" : "All"}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Clock className="h-7 w-7 text-ink-muted mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No scheduled events</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedId === ev.id;
              const isOverdue = ev.status === "overdue";
              const isPast = ev.date < new Date().toISOString().split("T")[0];

              return (
                <div key={ev.id}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-bg-muted/30 transition-colors",
                      isOverdue && "bg-signal-danger/5",
                    )}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : ev.id)
                    }
                  >
                    {/* Type icon */}
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        ev.type === "inflow"
                          ? "bg-emerald-400/10"
                          : "bg-signal-danger/10",
                      )}
                    >
                      {ev.type === "inflow" ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-signal-danger" />
                      )}
                    </div>

                    {/* Label + date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink-primary truncate">
                          {ev.label}
                        </p>
                        {isOverdue && (
                          <span className="flex items-center gap-0.5 text-[10px] text-signal-danger font-medium">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                        <ConfidenceBadge level={ev.confidence} />
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5 capitalize">
                        {ev.category.replace(/_/g, " ")} ·{" "}
                        {isPast ? "Expected" : "Due"}{" "}
                        {new Date(ev.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <p
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums shrink-0",
                        ev.type === "inflow"
                          ? "text-emerald-400"
                          : "text-signal-danger",
                      )}
                    >
                      {ev.type === "inflow" ? "+" : "-"}LKR{" "}
                      {ev.amount.toLocaleString()}
                    </p>

                    <TrendingDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-3 pt-1 bg-bg-muted/30 border-t border-border text-xs text-ink-muted space-y-1">
                      <p>
                        <span className="text-ink-tertiary">Type:</span>{" "}
                        <span className="capitalize">{ev.type}</span>
                      </p>
                      <p>
                        <span className="text-ink-tertiary">Category:</span>{" "}
                        <span className="capitalize">
                          {ev.category.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p>
                        <span className="text-ink-tertiary">Amount:</span>{" "}
                        <span className="font-mono">
                          LKR {ev.amount.toLocaleString()}
                        </span>
                      </p>
                      <p>
                        <span className="text-ink-tertiary">Date:</span>{" "}
                        {ev.date}
                      </p>
                      <p>
                        <span className="text-ink-tertiary">Confidence:</span>{" "}
                        <span className="capitalize">{ev.confidence}</span>
                      </p>
                      <p>
                        <span className="text-ink-tertiary">Status:</span>{" "}
                        <span className="capitalize">{ev.status}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
