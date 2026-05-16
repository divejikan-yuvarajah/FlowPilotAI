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
  ReferenceArea,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface StressChartPoint {
  date: string;
  baseline: number;
  stressed: number;
}

interface StressCompareChartProps {
  data: StressChartPoint[];
  dangerThreshold?: number;
  isStressActive: boolean;
}

const C = {
  baseline:  "hsl(215 16% 47%)",
  stressed:  "hsl(0 84% 60%)",
  stressedFg: "hsl(0 84% 60% / 0.1)",
  border:    "hsl(217 33% 17%)",
  inkMuted:  "hsl(215 16% 47%)",
  danger:    "hsl(0 84% 60%)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border bg-surface shadow-lg px-3.5 py-3 text-xs min-w-[200px] space-y-2"
      style={{ background: "hsl(217 33% 12%)", borderColor: C.border }}
    >
      <p className="text-ink-muted">{label as string}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-ink-secondary capitalize">{p.name}</span>
          </div>
          <span className="font-mono font-semibold tabular-nums" style={{ color: p.color }}>
            LKR {Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatY(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function StressCompareChart({
  data,
  dangerThreshold = 500_000,
  isStressActive,
}: StressCompareChartProps) {
  const tickInterval = Math.floor(data.length / 8);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="stressedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={C.stressed} stopOpacity={0.2} />
              <stop offset="95%" stopColor={C.stressed} stopOpacity={0.02} />
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
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            formatter={(value: string) =>
              value === "baseline" ? "Baseline" : "Stressed"
            }
          />

          {/* Danger zone fill (0 → 500k) */}
          <ReferenceArea
            y1={0}
            y2={dangerThreshold}
            fill={C.danger}
            fillOpacity={0.04}
          />

          {/* Danger threshold line */}
          <ReferenceLine
            y={dangerThreshold}
            stroke={C.danger}
            strokeDasharray="6 3"
            strokeOpacity={0.6}
            label={{
              value: "⚠ LKR 500k",
              fill: C.danger,
              fontSize: 10,
              position: "insideTopLeft",
            }}
          />

          {/* Stressed area fill */}
          {isStressActive && (
            <Area
              type="monotone"
              dataKey="stressed"
              fill="url(#stressedGrad)"
              stroke="none"
              isAnimationActive
              animationDuration={300}
            />
          )}

          {/* Baseline — dashed gray */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke={C.baseline}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />

          {/* Stressed — solid red */}
          {isStressActive && (
            <Line
              type="monotone"
              dataKey="stressed"
              stroke={C.stressed}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
