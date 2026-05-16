"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DollarSign, Clock, TrendingDown } from "lucide-react";
import { useStressTestStore } from "@/store/stress-test";
import { useAssistantStore } from "@/store/assistant-store";
import { StatTile } from "@/components/ui/stat-tile";
import { HealthScoreGauge } from "@/components/widgets/health-score-gauge";
import { AiMorningBrief } from "@/components/widgets/ai-morning-brief";
import { CriticalActionsList, type CriticalAction } from "@/components/widgets/critical-actions-list";
import { OverdueInvoiceList, type OverdueInvoice } from "@/components/widgets/overdue-invoice-list";
import { ActivityFeed, type AlertEntry } from "@/components/widgets/activity-feed";
import { RunwayAreaChart, type ChartPoint } from "@/components/charts/runway-area-chart";

type HealthStatus = "healthy" | "watch" | "danger" | "critical";

export interface WarRoomData {
  initialBalance: number;
  runwayDays: number;
  dailyBurnRate: number;
  healthScore: number;
  healthStatus: HealthStatus;
  healthGrade: string;
  overdueTotal: number;
  cfoBrief: {
    bullets: string[];
    briefDate: string;
    modelUsed: string;
  } | null;
  overdueInvoices: OverdueInvoice[];
  alertLog: AlertEntry[];
  chartData: ChartPoint[];
}

// ─── Critical actions derived from live data ───────────────────────────────

function buildCriticalActions(
  overdueInvoices: OverdueInvoice[],
): CriticalAction[] {
  const actions: CriticalAction[] = [];

  // Most critical overdue invoice
  if (overdueInvoices.length > 0) {
    const worst = overdueInvoices[0];
    actions.push({
      id: "action-1",
      label: `Send Stage 2 to ${worst.clientName}`,
      description: `${worst.invoiceNumber} · ${worst.daysOverdue} days overdue`,
      status: worst.daysOverdue >= 10 ? "danger" : "watch",
      href: `/recovery/${worst.id}`,
    });
  }

  actions.push({
    id: "action-2",
    label: "Pay EPF/ETF — due this month",
    description: "Inland Revenue Dept · LKR 45,600",
    status: "watch",
    href: "/payments",
  });

  actions.push({
    id: "action-3",
    label: "Review 3 flagged expense anomalies",
    description: "Inventory spend +36% above baseline",
    status: "watch",
    href: "/expenses",
  });

  if (overdueInvoices.length > 1) {
    actions.push({
      id: "action-4",
      label: `Update credit limit for ${overdueInvoices[1].clientName}`,
      description: "Risk tier review recommended",
      status: "neutral",
      href: "/overdue",
    });
  }

  actions.push({
    id: "action-5",
    label: "Initiate CEFTS to Lanka Logistics",
    description: "Outstanding payable — LKR 46,000",
    status: "healthy",
    href: "/payments",
  });

  return actions.slice(0, 5);
}

// ─── Runway status from days ───────────────────────────────────────────────

function runwayStatus(days: number): "healthy" | "watch" | "danger" | "critical" {
  if (days > 30)  return "healthy";
  if (days > 14)  return "watch";
  if (days > 7)   return "danger";
  return "critical";
}

// ─── Main client component ─────────────────────────────────────────────────

export function WarRoomClient({ data }: { data: WarRoomData }) {
  const { balance, isStressActive, activateStress, deactivateStress } =
    useStressTestStore();
  const { addSuggestion } = useAssistantStore();
  const suggestionsFiredfRef = useRef(false);

  const [liveBalance, setLiveBalance] = useState(data.initialBalance);
  const [briefBullets, setBriefBullets] = useState(
    data.cfoBrief?.bullets ?? [],
  );

  // Proactive AI suggestions — fire once after data loads
  useEffect(() => {
    if (suggestionsFiredfRef.current) return;
    suggestionsFiredfRef.current = true;

    const topOverdue = data.overdueInvoices[0];
    if (topOverdue && topOverdue.daysOverdue >= 7) {
      addSuggestion(
        `I noticed **${topOverdue.clientName}** is ${topOverdue.daysOverdue} days overdue on ${topOverdue.invoiceNumber} (LKR ${topOverdue.amount.toLocaleString()}). Want to draft a recovery message?`,
      );
    }

    if (data.runwayDays < 14) {
      addSuggestion(
        `Your runway is ${data.runwayDays} days — below the 14-day safety threshold. Want to see what changed?`,
      );
    }
  }, [data, addSuggestion]);

  // Sync live balance → Zustand store
  useEffect(() => {
    useStressTestStore.setState({ balance: data.initialBalance, baseBalance: data.initialBalance });
  }, [data.initialBalance]);

  // Poll /api/seylan/balance every 30 s
  useEffect(() => {
    if (isStressActive) return; // don't override stress-test balance

    async function pollBalance() {
      try {
        const res = await fetch("/api/seylan/balance");
        if (!res.ok) return;
        const json = (await res.json()) as { balance: number };
        setLiveBalance(json.balance);
        useStressTestStore.setState({ balance: json.balance, baseBalance: json.balance });
      } catch {
        // Non-fatal — keep showing last known value
      }
    }

    pollBalance();
    const interval = setInterval(pollBalance, 30_000);
    return () => clearInterval(interval);
  }, [isStressActive]);

  // Display balance: stress-test overrides live
  const displayBalance = isStressActive ? balance : liveBalance;

  // Regenerate CFO brief
  const handleRegenerate = useCallback(async () => {
    const res = await fetch("/api/ai/cfo-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "today" }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { bullets?: string[] };
    if (json.bullets) setBriefBullets(json.bullets);
  }, []);

  const criticalActions = buildCriticalActions(data.overdueInvoices);
  const rStatus = runwayStatus(data.runwayDays);

  return (
    <div className="space-y-6">
      {/* ── Stress-test banner ─────────────────────────────────────────── */}
      {isStressActive && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-signal-danger/40 bg-signal-danger/5 text-sm">
          <TrendingDown className="h-4 w-4 text-signal-danger shrink-0" />
          <span className="text-signal-danger font-medium">Stress test active</span>
          <span className="text-ink-secondary">— balance reduced to 40% to simulate client defaults.</span>
          <button
            onClick={deactivateStress}
            className="ml-auto text-xs text-ink-muted hover:text-ink-primary underline transition-colors"
          >
            Exit stress test
          </button>
        </div>
      )}

      {/* ── ROW 1: Hero StatTiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Cash Position */}
        <div className="col-span-3">
          <StatTile
            label="Cash Position"
            value={displayBalance}
            format={(v) => `LKR ${v.toLocaleString()}`}
            status={displayBalance < 500_000 ? "danger" : displayBalance < 1_000_000 ? "watch" : "healthy"}
            delta={isStressActive ? Math.round(displayBalance - data.initialBalance) : undefined}
            deltaLabel="vs baseline"
            icon={DollarSign}
          />
        </div>

        {/* Runway */}
        <div className="col-span-3">
          <StatTile
            label="Runway"
            value={data.runwayDays}
            format={(v) => `${v} days`}
            status={rStatus}
            delta={-3}
            deltaLabel="vs last week"
            icon={Clock}
          />
        </div>

        {/* Health Score */}
        <div className="col-span-3">
          <HealthScoreGauge
            score={data.healthScore}
            status={data.healthStatus}
            grade={data.healthGrade}
          />
        </div>

        {/* Overdue Total */}
        <div className="col-span-3">
          <Link href="/overdue" className="block h-full">
            <StatTile
              label="Overdue Total"
              value={data.overdueTotal}
              format={(v) => `LKR ${v.toLocaleString()}`}
              status={data.overdueTotal > 400_000 ? "danger" : "watch"}
              delta={data.overdueInvoices.length}
              deltaLabel="invoices"
              icon={TrendingDown}
              className="hover:border-signal-danger/40 transition-colors cursor-pointer h-full"
            />
          </Link>
        </div>
      </div>

      {/* ── ROW 2: AI Brief + Critical Actions ─────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 min-h-[280px]">
          <AiMorningBrief
            bullets={briefBullets}
            generatedAt={data.cfoBrief?.briefDate ?? new Date().toISOString()}
            model={data.cfoBrief?.modelUsed ?? "gpt-4o-mini"}
            onRegenerate={handleRegenerate}
          />
        </div>
        <div className="col-span-4 min-h-[280px]">
          <CriticalActionsList actions={criticalActions} />
        </div>
      </div>

      {/* ── ROW 3: Chart + Overdue List ─────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 min-h-[320px]">
          <RunwayAreaChart data={data.chartData} dangerThreshold={500_000} />
        </div>
        <div className="col-span-5 min-h-[320px]">
          <OverdueInvoiceList invoices={data.overdueInvoices} />
        </div>
      </div>

      {/* ── ROW 4: Activity Feed ────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <ActivityFeed entries={data.alertLog} />
        </div>
      </div>

      {/* ── Stress-test toggle (bottom) ─────────────────────────────────── */}
      {!isStressActive && (
        <div className="flex justify-end">
          <button
            onClick={() => activateStress(0.4)}
            className="text-xs text-ink-muted hover:text-signal-danger border border-border hover:border-signal-danger/40 px-3 py-1.5 rounded-md transition-colors"
          >
            Run stress test →
          </button>
        </div>
      )}
    </div>
  );
}
