"use client";

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

export interface ChartPoint {
  date: string;
  balance: number;
  projected: boolean;
}

interface RunwayAreaChartProps {
  data: ChartPoint[];
  dangerThreshold?: number; // default 500_000
}

// ─── Design-system colours (HSL values from globals.css tokens) ────────────
const C = {
  healthy:     "hsl(142 71% 45%)",
  watch:       "hsl(38  92% 50%)",
  danger:      "hsl(0   84% 60%)",
  border:      "hsl(217 33% 17%)",
  surface:     "hsl(217 33% 12%)",
  inkMuted:    "hsl(215 16% 47%)",
  inkPrimary:  "hsl(210 40% 98%)",
};

// ─── Custom tooltip ────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { projected: boolean } }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const balance = payload[0]?.value ?? 0;
  const isProjected = payload[0]?.payload?.projected ?? false;
  const isLow = balance < 500_000;

  return (
    <div
      className="rounded-lg border border-border bg-surface shadow-lg px-3.5 py-3 text-sm min-w-[180px]"
      style={{ background: C.surface, borderColor: C.border }}
    >
      <p className="text-xs text-ink-muted mb-1.5">
        {label}
        {isProjected && (
          <span className="ml-1.5 text-signal-watch text-[10px] font-medium">projected</span>
        )}
      </p>
      <p
        className="font-mono text-base font-semibold tabular-nums"
        style={{ color: isLow ? C.danger : C.healthy }}
      >
        LKR {Number(balance).toLocaleString()}
      </p>
      {isLow && (
        <p className="text-xs mt-1" style={{ color: C.danger }}>
          Below danger threshold
        </p>
      )}
    </div>
  );
}

// ─── Chart ─────────────────────────────────────────────────────────────────

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function RunwayAreaChart({
  data,
  dangerThreshold = 500_000,
}: RunwayAreaChartProps) {
  // Show every 5th label on x-axis to avoid crowding
  const tickInterval = Math.floor(data.length / 8);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-ink-primary">30-Day Cash Flow Timeline</h3>
          <p className="text-xs text-ink-muted mt-0.5">Historical + projected balance</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-6 rounded-full" style={{ background: C.healthy, opacity: 0.7 }} />
            <span className="text-xs text-ink-muted">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-6 rounded-full border border-dashed" style={{ borderColor: C.watch, opacity: 0.7 }} />
            <span className="text-xs text-ink-muted">Projected</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              {/* Gradient for confirmed zone */}
              <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.healthy} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.healthy} stopOpacity={0.02} />
              </linearGradient>
              {/* Gradient for projected zone */}
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.watch} stopOpacity={0.20} />
                <stop offset="95%" stopColor={C.watch} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.border}
              vertical={false}
              opacity={0.5}
            />

            <XAxis
              dataKey="date"
              tick={{ fill: C.inkMuted, fontSize: 11 }}
              axisLine={{ stroke: C.border }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: C.inkMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Danger threshold line */}
            <ReferenceLine
              y={dangerThreshold}
              stroke={C.danger}
              strokeDasharray="6 3"
              strokeOpacity={0.7}
              label={{
                value: "⚠ Danger Zone",
                fill: C.danger,
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />

            {/* Confirmed area (historical, solid fill) */}
            <Area
              type="monotone"
              dataKey="balance"
              stroke={C.healthy}
              strokeWidth={2}
              fill="url(#confirmedGrad)"
              dot={false}
              activeDot={{ r: 4, fill: C.healthy, strokeWidth: 0 }}
              // Only show confirmed segment up to today
              // Recharts doesn't support segment filtering natively,
              // so we render both and differentiate via colour + tooltip
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
