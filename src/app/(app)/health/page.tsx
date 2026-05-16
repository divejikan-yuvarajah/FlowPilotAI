"use client";

import { useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthScoreGauge } from "@/components/widgets/health-score-gauge";

// ─── Stub data ────────────────────────────────────────────────────────────────

const HEALTH_SCORE = 58;
const HEALTH_GRADE = "C";
const HEALTH_STATUS = "watch" as const;

const COMPONENTS = [
  { label: "Cash Position",         score: 62, weight: "15%", trend: "down",   description: "14-day runway vs 30-day target" },
  { label: "Payment Punctuality",   score: 71, weight: "25%", trend: "stable", description: "Avg 8.3 days to pay suppliers" },
  { label: "Expense Control",       score: 54, weight: "15%", trend: "down",   description: "Inventory +36% above baseline" },
  { label: "Client Trust Average",  score: 71, weight: "25%", trend: "stable", description: "Across 3 active clients" },
  { label: "Revenue Consistency",   score: 48, weight: "20%", trend: "down",   description: "Irregular inflow pattern detected" },
];

function buildHistoryData(): Array<{ date: string; score: number }> {
  const base = [55, 58, 61, 57, 53, 59, 62, 60, 58, 56, 54, 57, 59, 61, 60, 58, 55, 53, 56, 58, 61, 63, 60, 58, 56, 54, 57, 58, 58, 58];
  const today = new Date();
  return base.map((score, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score,
    };
  });
}

const HISTORY = buildHistoryData();

// ─── Component bar ────────────────────────────────────────────────────────────

function ComponentBar({ label, score, weight, trend, description }: {
  label: string; score: number; weight: string; trend: string; description: string;
}) {
  const color =
    score >= 75 ? "bg-signal-healthy" :
    score >= 60 ? "bg-signal-watch" :
    "bg-signal-danger";

  const textColor =
    score >= 75 ? "text-signal-healthy" :
    score >= 60 ? "text-signal-watch" :
    "text-signal-danger";

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-signal-healthy" : trend === "down" ? "text-signal-danger" : "text-ink-muted";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <TrendIcon className={cn("h-3.5 w-3.5 shrink-0", trendColor)} />
          <span className="text-sm font-medium text-ink-primary truncate">{label}</span>
          <span className="text-[10px] text-ink-muted shrink-0">({weight})</span>
        </div>
        <span className={cn("font-mono text-sm font-bold tabular-nums shrink-0", textColor)}>
          {score}/100
        </span>
      </div>
      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[11px] text-ink-muted">{description}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const chartRef = useRef(null);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Business Health</h1>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-watch/10 text-signal-watch border border-signal-watch/20 uppercase tracking-wide">
          Preview
        </span>
      </div>
      <p className="text-sm text-ink-secondary -mt-4">Composite score across 5 financial health dimensions</p>

      {/* Hero gauge + components */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gauge */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
          <HealthScoreGauge score={HEALTH_SCORE} status={HEALTH_STATUS} grade={HEALTH_GRADE} />
          <div className="text-center">
            <p className="text-sm font-medium text-ink-primary">Overall Health Score</p>
            <p className="text-xs text-ink-muted mt-0.5">Updated 2 hours ago</p>
          </div>
          <div className="w-full space-y-1 pt-2 border-t border-border">
            {[
              { label: "Excellent", range: "90–100", active: false },
              { label: "Good",      range: "75–89",  active: false },
              { label: "Watch",     range: "60–74",  active: HEALTH_SCORE >= 60 && HEALTH_SCORE < 75 },
              { label: "Danger",    range: "45–59",  active: HEALTH_SCORE >= 45 && HEALTH_SCORE < 60 },
              { label: "Critical",  range: "0–44",   active: HEALTH_SCORE < 45 },
            ].map((tier) => (
              <div key={tier.label} className={cn("flex justify-between text-xs px-2 py-0.5 rounded", tier.active && "bg-signal-watch/10")}>
                <span className={cn(tier.active ? "text-signal-watch font-semibold" : "text-ink-muted")}>{tier.label}</span>
                <span className="text-ink-muted font-mono">{tier.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Component bars */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
            <Activity className="h-4 w-4 text-ink-tertiary" />
            Score components
          </h2>
          {COMPONENTS.map((c) => (
            <ComponentBar key={c.label} {...c} />
          ))}
        </div>
      </div>

      {/* 30-day trend chart */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-ink-tertiary" />
          <h2 className="text-sm font-semibold text-ink-primary">30-day score history</h2>
        </div>
        <ResponsiveContainer width="100%" height={200} ref={chartRef}>
          <AreaChart data={HISTORY} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
              tickFormatter={(v, i) => i % 7 === 0 ? v : ""}
              axisLine={false} tickLine={false} />
            <YAxis domain={[40, 80]} tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
              axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: "hsl(220 26% 12%)", border: "1px solid hsl(217 33% 17%)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(213 31% 91%)" }}
              itemStyle={{ color: "hsl(38 92% 50%)" }}
            />
            <Area type="monotone" dataKey="score" stroke="hsl(38 92% 50%)"
              strokeWidth={2} fill="url(#healthGrad)" dot={false}
              activeDot={{ r: 4, fill: "hsl(38 92% 50%)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink-primary mb-3">What&apos;s dragging your score</h2>
        <div className="space-y-2">
          {[
            { icon: "🔴", text: "Runway at 14 days — below the 30-day safe threshold. Collect overdue from Nexus Traders immediately." },
            { icon: "🟡", text: "Inventory spend 36% above baseline. Review Janashakthi Distributors invoices for duplicates." },
            { icon: "🟡", text: "Revenue inconsistency detected — 3 months of irregular inflows. Consider setting up recurring JustPay links." },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-ink-secondary">
              <span className="shrink-0 mt-0.5">{r.icon}</span>
              <p className="leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
