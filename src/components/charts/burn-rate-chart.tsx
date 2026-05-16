"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface BurnDataPoint {
  date: string;       // e.g. "May 1"
  amount: number;     // total debit LKR that day
  isAnomaly?: boolean;
  anomalyLabel?: string;
}

interface BurnRateChartProps {
  data: BurnDataPoint[];
  avgBurnRate: number; // 30d average — shown as reference line
}

const C = {
  pilot:    "hsl(243 75% 65%)",
  pilotFg:  "hsl(243 75% 65% / 0.12)",
  border:   "hsl(217 33% 17%)",
  inkMuted: "hsl(215 16% 47%)",
  danger:   "hsl(0 84% 60%)",
  watch:    "hsl(38 92% 50%)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as BurnDataPoint;
  return (
    <div
      className="rounded-lg border border-border bg-surface shadow-lg px-3.5 py-3 text-xs min-w-[180px]"
      style={{ background: "hsl(217 33% 12%)", borderColor: C.border }}
    >
      <p className="text-ink-muted mb-1.5">{label as string}</p>
      <p className="font-mono font-semibold text-ink-primary tabular-nums">
        LKR {Number(payload[0]?.value ?? 0).toLocaleString()}
      </p>
      {point?.isAnomaly && (
        <p className="mt-1.5 text-signal-watch text-[10px] font-medium border-t border-border/50 pt-1.5">
          ⚠ {point.anomalyLabel ?? "Expense anomaly"}
        </p>
      )}
    </div>
  );
}

function formatY(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function BurnRateChart({ data, avgBurnRate }: BurnRateChartProps) {
  const anomalyDates = data.filter((d) => d.isAnomaly).map((d) => d.date);
  const tickInterval = Math.floor(data.length / 8);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-ink-primary">Burn Rate Trend</h3>
          <p className="text-xs text-ink-muted mt-0.5">Daily debit spend · last 90 days</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5 rounded" style={{ background: C.pilot }} />
            <span className="text-ink-muted">Daily</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5 border-t border-dashed" style={{ borderColor: C.watch }} />
            <span className="text-ink-muted">30d avg</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.pilot} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.pilot} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: C.inkMuted, fontSize: 10 }}
              axisLine={{ stroke: C.border }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={formatY}
              tick={{ fill: C.inkMuted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Avg burn rate reference */}
            <ReferenceLine
              y={avgBurnRate}
              stroke={C.watch}
              strokeDasharray="5 3"
              strokeOpacity={0.7}
            />

            {/* Anomaly vertical markers */}
            {anomalyDates.map((d) => (
              <ReferenceLine
                key={d}
                x={d}
                stroke={C.danger}
                strokeOpacity={0.4}
                strokeWidth={1}
              />
            ))}

            <Area
              type="monotone"
              dataKey="amount"
              fill="url(#burnGrad)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={C.pilot}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: C.pilot, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
