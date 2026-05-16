"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingDown, Loader2, RotateCcw, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStressTestStore } from "@/store/stress-test";
import { SignalBadge } from "@/components/ui/signal-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StressCompareChart, type StressChartPoint } from "@/components/charts/stress-compare-chart";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimClient {
  id: string;
  name: string;
  trustScore: number;
  riskTier: string;
  openInvoiceTotal: number;
}

export interface SimPageData {
  clients: SimClient[];
  baselineBalance: number;
  baselineBurnRateDaily: number;
  baselineRunwayDays: number;
  baselineChartData: { date: string; balance: number }[];
}

interface SurvivalAction {
  priority: number;
  category: string;
  action: string;
  impact: string;
  timeframe: string;
}

// ─── Projection engine (pure JS, runs on every slider change) ─────────────────

function computeProjection(
  baselineBalance: number,
  baselineBurnRate: number,
  defaultedTotal: number,
  expenseShockPct: number,
  days = 90,
): {
  points: StressChartPoint[];
  stressedRunwayDays: number;
  crisisDate: string | null;
  cashGap: number;
} {
  const stressedBalance = Math.max(0, baselineBalance - defaultedTotal);
  const stressedBurn = baselineBurnRate * (1 + expenseShockPct / 100);
  const today = new Date();

  let balBaseline = baselineBalance;
  let balStressed = stressedBalance;
  let stressedRunwayDays = 0;
  let crisisDate: string | null = null;
  let minStressed = stressedBalance;
  const points: StressChartPoint[] = [];

  for (let i = 1; i <= days; i++) {
    balBaseline = Math.max(0, balBaseline - baselineBurnRate);
    balStressed = Math.max(0, balStressed - stressedBurn);
    if (balStressed > 0) stressedRunwayDays = i;
    if (!crisisDate && balStressed < 500_000) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      crisisDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    minStressed = Math.min(minStressed, balStressed);
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    points.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      baseline: Math.round(balBaseline),
      stressed: Math.round(balStressed),
    });
  }

  return {
    points,
    stressedRunwayDays,
    crisisDate,
    cashGap: Math.max(0, 500_000 - minStressed),
  };
}

// ─── Control components ───────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  icon: Icon,
  onChange,
  colorClass,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon?: React.ElementType;
  onChange: (v: number) => void;
  colorClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-secondary font-medium">{label}</span>
        <span className={cn("font-mono font-semibold tabular-nums", colorClass)}>
          {value > 0 ? "+" : ""}{value}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {Icon && (
          <motion.div
            animate={{
              scale: 1 + (value / max) * 0.6,
              opacity: 0.4 + (value / max) * 0.6,
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", colorClass)} />
          </motion.div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn("w-full h-1.5 rounded-full cursor-pointer accent-signal-danger", value === 0 && "accent-border")}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted tabular-nums">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ n }: { n: number }) {
  const v: React.ComponentProps<typeof SignalBadge>["variant"] =
    n === 1 ? "critical" : n === 2 ? "danger" : n <= 3 ? "watch" : "neutral";
  return <SignalBadge variant={v} size="sm">#{n}</SignalBadge>;
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function SimulatorClient({ data }: { data: SimPageData }) {
  const {
    defaultedClientIds,
    expenseShockPct,
    revenueShockPct,
    lateThresholdDays,
    setExpenseShockPct,
    setRevenueShockPct,
    setLateThresholdDays,
    toggleDefaultedClient,
    setMetrics,
    clearAllStress,
  } = useStressTestStore();

  const [chartData, setChartData] = useState<StressChartPoint[]>(
    data.baselineChartData.map((p) => ({ date: p.date, baseline: p.balance, stressed: p.balance })),
  );
  const [stressedRunway, setStressedRunway] = useState(data.baselineRunwayDays);
  const [crisisDate, setCrisisDate] = useState<string | null>(null);
  const [cashGap, setCashGap] = useState(0);
  const [survivalActions, setSurvivalActions] = useState<SurvivalAction[]>([]);
  const [isFetchingSurvival, setIsFetchingSurvival] = useState(false);
  const survivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStressActive =
    defaultedClientIds.length > 0 || expenseShockPct > 0 || revenueShockPct > 0;

  // Compute stressed projection whenever params change
  const recalculate = useCallback(() => {
    const defaultedTotal = data.clients
      .filter((c) => defaultedClientIds.includes(c.id))
      .reduce((s, c) => s + c.openInvoiceTotal, 0);

    const result = computeProjection(
      data.baselineBalance,
      data.baselineBurnRateDaily,
      defaultedTotal,
      expenseShockPct,
    );

    setChartData(result.points);
    setStressedRunway(result.stressedRunwayDays);
    setCrisisDate(result.crisisDate);
    setCashGap(result.cashGap);

    // Update global store (triggers crisis banner, topnav pill)
    setMetrics({
      stressedRunwayDays: result.stressedRunwayDays,
      crisisDate: result.crisisDate,
      cashGap: result.cashGap,
    });
  }, [data, defaultedClientIds, expenseShockPct, setMetrics]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Debounced survival plan fetch
  useEffect(() => {
    if (!isStressActive) {
      setSurvivalActions([]);
      return;
    }
    if (survivalTimerRef.current) clearTimeout(survivalTimerRef.current);
    survivalTimerRef.current = setTimeout(async () => {
      if (!isStressActive) return;
      setIsFetchingSurvival(true);
      try {
        const res = await fetch("/api/ai/survival-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultedClientIds,
            expenseShockPct,
            revenueShockPct,
          }),
        });
        if (!res.ok) return;
        const d = (await res.json()) as {
          plan?: { actions?: SurvivalAction[] };
        };
        setSurvivalActions(d.plan?.actions ?? []);
      } catch {
        // non-fatal
      } finally {
        setIsFetchingSurvival(false);
      }
    }, 500);
    return () => { if (survivalTimerRef.current) clearTimeout(survivalTimerRef.current); };
  }, [defaultedClientIds, expenseShockPct, revenueShockPct, isStressActive]);

  function handleClearAll() {
    clearAllStress();
    setChartData(data.baselineChartData.map((p) => ({ date: p.date, baseline: p.balance, stressed: p.balance })));
    setStressedRunway(data.baselineRunwayDays);
    setCrisisDate(null);
    setCashGap(0);
    setSurvivalActions([]);
    toast.success("Stress test cleared — back to baseline");
  }

  const runwayStatus: "healthy" | "watch" | "danger" | "critical" =
    stressedRunway > 30 ? "healthy" : stressedRunway > 14 ? "watch" : stressedRunway > 7 ? "danger" : "critical";

  const runwayDelta = stressedRunway - data.baselineRunwayDays;

  const [controlsOpen, setControlsOpen] = useState(true);

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary">
            Stress Test Simulator
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Model worst-case scenarios in real time
          </p>
        </div>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-subtle text-xs sm:text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear all stress</span>
          <span className="sm:hidden">Clear</span>
        </button>
      </div>

      {/* ── 3 Result stat tiles — always visible at top on mobile ──────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 space-y-1 overflow-hidden">
          <p className="text-[9px] sm:text-xs uppercase tracking-wider text-ink-tertiary font-medium">Runway</p>
          <AnimatedNumber
            value={stressedRunway}
            format={(v) => `${v}d`}
            className={cn(
              "text-xl sm:text-3xl font-display font-bold tabular-nums",
              runwayStatus === "healthy" ? "text-signal-healthy"
                : runwayStatus === "watch" ? "text-signal-watch"
                : runwayStatus === "danger" ? "text-signal-danger"
                : "text-signal-critical",
            )}
          />
          {isStressActive && runwayDelta !== 0 && (
            <p className={cn("text-[10px] font-medium tabular-nums flex items-center gap-0.5", runwayDelta < 0 ? "text-signal-danger" : "text-signal-healthy")}>
              {runwayDelta > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {runwayDelta > 0 ? "+" : ""}{runwayDelta}d
            </p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 space-y-1 overflow-hidden">
          <p className="text-[9px] sm:text-xs uppercase tracking-wider text-ink-tertiary font-medium">Crisis</p>
          <p className={cn("text-sm sm:text-xl font-display font-bold leading-tight break-words", crisisDate ? "text-signal-danger" : "text-signal-healthy")}>
            {crisisDate ?? "None"}
          </p>
          <p className="text-[9px] sm:text-[10px] text-ink-muted leading-tight">
            {crisisDate ? "Below LKR 500k" : "Safe"}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 space-y-1 overflow-hidden">
          <p className="text-[9px] sm:text-xs uppercase tracking-wider text-ink-tertiary font-medium">Gap</p>
          <AnimatedNumber
            value={cashGap}
            format={(v) => v === 0 ? "None" : `${(v/1000).toFixed(0)}k`}
            className={cn("text-xl sm:text-2xl font-display font-bold tabular-nums", cashGap > 0 ? "text-signal-danger" : "text-signal-healthy")}
          />
          <p className="text-[9px] sm:text-[10px] text-ink-muted">Cash shortfall</p>
        </div>
      </div>

      {/* ── Main layout — stacked on mobile, 3-col on lg ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Controls — collapsible on mobile ─────────────────────────── */}
        <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
          {/* Mobile collapse toggle */}
          <button
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-lg text-sm font-medium text-ink-primary mb-2"
            onClick={() => setControlsOpen(!controlsOpen)}
          >
            <span>Stress Controls {isStressActive && <span className="ml-1 text-signal-danger text-xs">● Active</span>}</span>
            {controlsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <AnimatePresence>
            {(controlsOpen) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden lg:overflow-visible space-y-3"
              >
                <SectionCard title="Client Defaults">
                  <div className="space-y-2">
                    {data.clients.map((client) => {
                      const isDefaulted = defaultedClientIds.includes(client.id);
                      return (
                        <label key={client.id} className={cn("flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors", isDefaulted ? "bg-signal-danger/10" : "hover:bg-bg-raised")}>
                          <input type="checkbox" checked={isDefaulted} onChange={() => toggleDefaultedClient(client.id)} className="accent-signal-danger shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-medium truncate", isDefaulted ? "text-signal-danger" : "text-ink-primary")}>{client.name}</p>
                            <p className="text-[10px] text-ink-muted tabular-nums">LKR {(client.openInvoiceTotal/1000).toFixed(0)}k at risk</p>
                          </div>
                          <SignalBadge variant={client.riskTier === "A" || client.riskTier === "B" ? "healthy" : client.riskTier === "C" ? "watch" : "danger"} size="sm">{client.riskTier}</SignalBadge>
                        </label>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Expense Shock">
                  <SliderRow label="Increase in daily burn" value={expenseShockPct} min={0} max={50} step={5} unit="%" icon={Flame} onChange={setExpenseShockPct} colorClass={expenseShockPct > 0 ? "text-signal-danger" : "text-ink-muted"} />
                </SectionCard>

                <SectionCard title="Revenue Shock">
                  <SliderRow label="Reduction in inflows" value={revenueShockPct} min={0} max={50} step={5} unit="%" icon={TrendingDown} onChange={setRevenueShockPct} colorClass={revenueShockPct > 0 ? "text-signal-watch" : "text-ink-muted"} />
                </SectionCard>

                <SectionCard title="Late Payment Threshold">
                  <SliderRow label="Days before 'at-risk'" value={lateThresholdDays} min={7} max={30} step={1} unit="d" onChange={setLateThresholdDays} colorClass="text-ink-secondary" />
                  <p className="text-[10px] text-ink-muted mt-2">Invoices &gt; {lateThresholdDays}d overdue treated as defaulted.</p>
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Chart ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-medium text-ink-primary">Runway Projection</h3>
                <p className="text-xs text-ink-muted">
                  {isStressActive ? "Stressed vs baseline · 90 days" : "Baseline projection · 90 days"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <div className="flex items-center gap-1"><div className="h-0.5 w-4 border-t border-dashed border-ink-muted/50" /><span className="text-ink-muted">Baseline</span></div>
                {isStressActive && <div className="flex items-center gap-1"><div className="h-0.5 w-4 rounded bg-signal-danger" /><span className="text-signal-danger">Stressed</span></div>}
              </div>
            </div>
            <div className="h-[220px] sm:h-[260px]">
              <StressCompareChart data={chartData} dangerThreshold={500_000} isStressActive={isStressActive} />
            </div>
          </div>
        </div>

        {/* ── AI Survival Plan ─────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-surface border border-border border-l-2 border-l-signal-ai rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-signal-ai shrink-0" />
              <span className="text-sm font-medium text-signal-ai">AI Survival Plan</span>
              {isFetchingSurvival && <Loader2 className="h-3.5 w-3.5 text-signal-ai animate-spin ml-auto" />}
            </div>
            <div className="p-4">
              <AnimatePresence mode="wait">
                {!isStressActive && (
                  <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-ink-muted text-center py-6">
                    Apply stress to generate a survival plan.
                  </motion.p>
                )}
                {isStressActive && isFetchingSurvival && survivalActions.length === 0 && (
                  <motion.div key="loading" className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-2.5 bg-bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-bg-muted rounded animate-pulse w-full" />
                        <div className="h-2 bg-bg-muted rounded animate-pulse w-1/2" />
                      </div>
                    ))}
                  </motion.div>
                )}
                {survivalActions.length > 0 && (
                  <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {survivalActions.map((action, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="space-y-1">
                        <div className="flex items-start gap-2">
                          <PriorityBadge n={action.priority} />
                          <p className="text-xs font-medium text-ink-primary leading-snug">{action.action}</p>
                        </div>
                        <div className="pl-7 space-y-0.5">
                          <p className="text-[10px] text-ink-secondary">{action.impact}</p>
                          <p className="text-[10px] text-ink-muted">{action.timeframe} · {action.category}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
