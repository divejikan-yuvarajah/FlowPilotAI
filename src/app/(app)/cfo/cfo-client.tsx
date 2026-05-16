"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  Info,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatTile } from "@/components/ui/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import type { BurnDataPoint } from "@/components/charts/burn-rate-chart";
import type { CategorySlice } from "@/components/charts/expense-donut";

const CHART_FALLBACK = <div className="h-full w-full bg-bg-muted rounded-xl animate-pulse min-h-[200px]" />;

const BurnRateChart = dynamic(
  () => import("@/components/charts/burn-rate-chart").then((m) => ({ default: m.BurnRateChart })),
  { ssr: false, loading: () => CHART_FALLBACK },
);
const ExpenseDonut = dynamic(
  () => import("@/components/charts/expense-donut").then((m) => ({ default: m.ExpenseDonut })),
  { ssr: false, loading: () => CHART_FALLBACK },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Recommendation {
  title: string;
  reasoning: string;
  href: string;
}

export interface CfoBriefRow {
  id: string;
  briefDate: string;
  createdAt: string;
  bullets: string[];
  healthScore: number;
  runwayDays: number;
  recommendations: { priority: number; action: string }[];
}

export interface CfoDashboardData {
  burnRateDaily: number;
  runwayDays: number;
  efficiencyScore: number;
  anomalyCount: number;
  burnTrend: BurnDataPoint[];
  expenseByCategory: CategorySlice[];
  totalMonthlyExpense: number;
  briefings: CfoBriefRow[];
  urgentRecs: Recommendation[];
  importantRecs: Recommendation[];
  suggestedRecs: Recommendation[];
}

// ─── Recommendation card ─────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: {
    label: "Urgent",
    Icon: AlertTriangle,
    headerColor: "text-signal-danger",
    borderColor: "border-l-signal-danger",
    bgColor: "bg-signal-danger/5",
  },
  important: {
    label: "Important",
    Icon: Info,
    headerColor: "text-signal-watch",
    borderColor: "border-l-signal-watch",
    bgColor: "bg-signal-watch/5",
  },
  suggested: {
    label: "Suggested",
    Icon: Lightbulb,
    headerColor: "text-signal-ai",
    borderColor: "border-l-signal-ai",
    bgColor: "bg-signal-ai/5",
  },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;

function RecommendationPanel({
  priority,
  items,
}: {
  priority: Priority;
  items: Recommendation[];
}) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <div className={cn("bg-surface border border-border border-l-2 rounded-lg overflow-hidden", cfg.borderColor)}>
      <div className={cn("flex items-center gap-2 px-4 py-3 border-b border-border", cfg.bgColor)}>
        <cfg.Icon className={cn("h-4 w-4 shrink-0", cfg.headerColor)} />
        <span className={cn("text-sm font-semibold", cfg.headerColor)}>{cfg.label}</span>
        <span className="ml-auto text-xs text-ink-muted">{items.length} items</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((rec, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-ink-primary leading-snug">{rec.title}</p>
            <p className="text-xs text-ink-secondary leading-relaxed">{rec.reasoning}</p>
            <Link
              href={rec.href}
              className="inline-flex items-center gap-1 text-xs text-pilot-500 hover:text-pilot-400 font-medium transition-colors"
            >
              Take action <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-4 py-4 text-xs text-ink-muted">No items in this category</p>
        )}
      </div>
    </div>
  );
}

// ─── Briefing history row ─────────────────────────────────────────────────────

function BriefingRow({ brief }: { brief: CfoBriefRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-bg-raised transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-primary">
              {format(new Date(brief.briefDate), "MMMM d, yyyy")}
            </span>
            <span className="text-xs text-ink-muted">
              · Health {brief.healthScore.toFixed(0)} · {brief.runwayDays}d runway
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-muted shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="px-5 pb-4 space-y-1.5">
              {brief.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal-ai mt-2 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function CfoDashboardClient({ data }: { data: CfoDashboardData }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefings, setBriefings] = useState(data.briefings);
  const [generatedBullets, setGeneratedBullets] = useState<string[] | null>(null);

  // Filter burn trend by selected category (show full trend always; category filters transactions table in future)
  const burnTrendData = data.burnTrend;

  async function handleGenerateBrief() {
    setIsGenerating(true);
    setGeneratedBullets(null);

    try {
      const res = await fetch("/api/ai/cfo-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "today" }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        bullets?: string[];
        briefDate?: string;
        healthScore?: number;
        runwayDays?: number;
        recommendations?: { priority: number; action: string }[];
      };

      const bullets = data.bullets ?? [];
      setGeneratedBullets(bullets);

      // Prepend to briefings history
      setBriefings((prev) => [
        {
          id: `new-${Date.now()}`,
          briefDate: data.briefDate ?? new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          bullets,
          healthScore: data.healthScore ?? 0,
          runwayDays: data.runwayDays ?? 0,
          recommendations: data.recommendations ?? [],
        },
        ...prev,
      ]);

      toast.success("CFO brief generated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  const runwayStatus =
    data.runwayDays > 30 ? "healthy" : data.runwayDays > 14 ? "watch" : data.runwayDays > 7 ? "danger" : "critical";

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary">
            AI CFO Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Financial intelligence · GPT-4o-mini
          </p>
        </div>
        <button
          onClick={handleGenerateBrief}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
        >
          {isGenerating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Generate today's </span>CFO brief</>
          )}
        </button>
      </div>

      {/* ── Generated brief inline panel ────────────────────────────────── */}
      <AnimatePresence>
        {generatedBullets && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="border border-signal-ai/30 border-l-2 border-l-signal-ai bg-purple-950/10 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-signal-ai" />
                <span className="text-sm font-medium text-signal-ai">New CFO Brief — Generated just now</span>
              </div>
              <button
                onClick={() => setGeneratedBullets(null)}
                className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
            <ul className="space-y-2">
              {generatedBullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm text-ink-secondary"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-signal-ai mt-2 shrink-0" />
                  {b}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROW 1: 4 StatTiles — 2×2 on mobile, 4×1 on lg ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Burn Rate"
          value={data.burnRateDaily}
          format={(v) => `LKR ${(v/1000).toFixed(0)}k`}
          status={data.burnRateDaily > 50_000 ? "danger" : data.burnRateDaily > 25_000 ? "watch" : "healthy"}
          deltaLabel="per day"
        />
        <StatTile
          label="Runway"
          value={data.runwayDays}
          format={(v) => `${v}d`}
          status={runwayStatus}
          delta={-3}
          deltaLabel="vs last week"
        />
        <StatTile
          label="Efficiency"
          value={data.efficiencyScore}
          format={(v) => `${v}/100`}
          status={data.efficiencyScore >= 75 ? "healthy" : data.efficiencyScore >= 50 ? "watch" : "danger"}
          deltaLabel="score"
        />
        <StatTile
          label="Anomalies"
          value={data.anomalyCount}
          format={(v) => `${v}`}
          status={data.anomalyCount === 0 ? "healthy" : data.anomalyCount <= 2 ? "watch" : "danger"}
          deltaLabel="flagged"
        />
      </div>

      {/* ── ROW 2: Charts — stacked on mobile, side-by-side on lg ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 h-[240px] sm:h-[300px]">
          <BurnRateChart data={burnTrendData} avgBurnRate={data.burnRateDaily} />
        </div>
        <div className="lg:col-span-5 h-[260px] sm:h-[300px]">
          <ExpenseDonut
            data={data.expenseByCategory}
            totalAmount={data.totalMonthlyExpense}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* ── ROW 3: Recommendations — stacked on mobile, 3-col on lg ──────── */}
      <div className="space-y-3">
        <h2 className="font-display text-sm sm:text-base font-semibold text-ink-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-signal-ai" />
          AI CFO Recommendations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RecommendationPanel priority="urgent" items={data.urgentRecs} />
          <RecommendationPanel priority="important" items={data.importantRecs} />
          <RecommendationPanel priority="suggested" items={data.suggestedRecs} />
        </div>
      </div>

      {/* ── ROW 4: Briefing history ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink-primary flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-ink-tertiary" />
          Past Briefings
        </h2>
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {briefings.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">
              No past briefings. Click "Generate today's CFO brief" above.
            </p>
          ) : (
            briefings.map((brief) => (
              <BriefingRow key={brief.id} brief={brief} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
