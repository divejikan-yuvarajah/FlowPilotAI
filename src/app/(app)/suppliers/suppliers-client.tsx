"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierObligation {
  id: string;
  reference: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  paidAt: string | null;
  description: string | null;
}

export interface SupplierCardData {
  id: string;
  name: string;
  businessType: string;
  reliabilityScore: number;
  trend: "improving" | "stable" | "worsening";
  relationshipStatus: "active" | "strained" | "critical" | "excellent";
  notes: string | null;
  aiInsight: string | null;
  obligations: SupplierObligation[];
  totalOutstanding: number;
  pendingCount: number;
  overdueCount: number;
}

interface SuppliersClientProps {
  suppliers: SupplierCardData[];
  totalOwed: number;
  suppliersAtRisk: number;
  avgPunctuality: number;
  upcomingCount: number;
  upcomingTotal: number;
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return "text-signal-healthy";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-signal-watch";
  if (score >= 45) return "text-orange-400";
  return "text-signal-danger";
}

function scoreRingColor(score: number): string {
  if (score >= 90) return "stroke-signal-healthy";
  if (score >= 75) return "stroke-emerald-400";
  if (score >= 60) return "stroke-signal-watch";
  if (score >= 45) return "stroke-orange-400";
  return "stroke-signal-danger";
}

function scoreTier(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function tierBgClass(tier: "A" | "B" | "C" | "D" | "F"): string {
  switch (tier) {
    case "A": return "bg-signal-healthy/10 text-signal-healthy border-signal-healthy/30";
    case "B": return "bg-emerald-400/10 text-emerald-400 border-emerald-400/30";
    case "C": return "bg-signal-watch/10 text-signal-watch border-signal-watch/30";
    case "D": return "bg-orange-400/10 text-orange-400 border-orange-400/30";
    case "F": return "bg-signal-danger/10 text-signal-danger border-signal-danger/30";
  }
}

function relationshipBadge(status: SupplierCardData["relationshipStatus"]) {
  switch (status) {
    case "excellent":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-signal-healthy/10 text-signal-healthy border border-signal-healthy/20">Excellent</span>;
    case "active":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pilot-500/10 text-pilot-400 border border-pilot-500/20">Active</span>;
    case "strained":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-signal-watch/10 text-signal-watch border border-signal-watch/20">
        <AlertTriangle className="h-3 w-3" /> Strained
      </span>;
    case "critical":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-signal-danger/10 text-signal-danger border border-signal-danger/20">
        <XCircle className="h-3 w-3" /> Critical
      </span>;
  }
}

function statusBadge(status: SupplierObligation["status"]) {
  switch (status) {
    case "paid":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-signal-healthy/10 text-signal-healthy"><CheckCircle2 className="h-3 w-3" />Paid</span>;
    case "pending":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-pilot-500/10 text-pilot-400"><Clock className="h-3 w-3" />Pending</span>;
    case "overdue":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-signal-danger/10 text-signal-danger"><AlertTriangle className="h-3 w-3" />Overdue</span>;
  }
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - score / 100);

  return (
    <div className="relative inline-flex items-center justify-center w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={r}
          className="stroke-border"
          strokeWidth="4" fill="none"
        />
        <circle
          cx="28" cy="28" r={r}
          className={cn("transition-all duration-700", scoreRingColor(score))}
          strokeWidth="4" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={cn("absolute text-sm font-bold tabular-nums", scoreColor(score))}>
        {score}
      </span>
    </div>
  );
}

// ─── Add Obligation inline form ───────────────────────────────────────────────

function AddObligationForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mt-3 pt-3 border-t border-border bg-bg-muted/40 rounded-lg px-3 py-3">
      <p className="text-xs font-medium text-ink-secondary mb-2">New obligation</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          className="col-span-2 sm:col-span-1 text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-pilot-500"
          placeholder="Reference (e.g. OBL-0130)"
        />
        <input
          className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-pilot-500"
          placeholder="Amount (LKR)"
          type="number"
        />
        <input
          className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-ink-primary focus:outline-none focus:ring-1 focus:ring-pilot-500"
          type="date"
        />
        <input
          className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-pilot-500"
          placeholder="Description (optional)"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="text-xs h-7 bg-pilot-500 hover:bg-pilot-600 text-white">
          Save obligation
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({
  supplier,
  highlighted,
}: {
  supplier: SupplierCardData;
  highlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    relationship_health: string;
    primary_concern: string;
    recommended_action: string;
    estimated_impact: string;
  } | null>(null);
  const router = useRouter();
  const tier = scoreTier(supplier.reliabilityScore);

  const handleAnalyze = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/supplier-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: supplier.id }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          analysis: {
            relationship_health: string;
            primary_concern: string;
            recommended_action: string;
            estimated_impact: string;
          };
        };
        setAiResult(data.analysis);
      }
    } catch {
      // silent fail — seed insight still shown
    } finally {
      setAnalyzing(false);
    }
  }, [supplier.id, analyzing]);

  const insight = aiResult
    ? `${aiResult.primary_concern} ${aiResult.recommended_action}`
    : supplier.aiInsight;

  const healthColor = (health: string) => {
    switch (health) {
      case "excellent": return "text-signal-healthy";
      case "good": return "text-emerald-400";
      case "strained": return "text-signal-watch";
      case "critical": return "text-signal-danger";
      default: return "text-ink-secondary";
    }
  };

  return (
    <div
      id={`supplier-${supplier.id}`}
      className={cn(
        "bg-surface border rounded-xl overflow-hidden transition-shadow",
        highlighted
          ? "border-pilot-500 shadow-lg shadow-pilot-500/10"
          : "border-border hover:border-border-hover",
      )}
    >
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        {/* Row 1: name + badges */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-ink-primary text-base leading-tight">
                {supplier.name}
              </h3>
              {relationshipBadge(supplier.relationshipStatus)}
            </div>
            <p className="text-xs text-ink-muted mt-0.5 capitalize">{supplier.businessType}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Tier badge */}
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold font-display",
              tierBgClass(tier)
            )}>
              {tier}
            </div>
            {/* Score gauge */}
            <ScoreGauge score={supplier.reliabilityScore} />
          </div>
        </div>

        {/* Row 2: trend + outstanding */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Trend indicator */}
          <div className="flex items-center gap-1.5">
            {supplier.trend === "improving" && (
              <TrendingUp className="h-3.5 w-3.5 text-signal-healthy" />
            )}
            {supplier.trend === "stable" && (
              <Minus className="h-3.5 w-3.5 text-ink-muted" />
            )}
            {supplier.trend === "worsening" && (
              <TrendingDown className="h-3.5 w-3.5 text-signal-danger" />
            )}
            <span className={cn(
              "text-xs font-medium capitalize",
              supplier.trend === "improving" && "text-signal-healthy",
              supplier.trend === "stable" && "text-ink-muted",
              supplier.trend === "worsening" && "text-signal-danger",
            )}>
              {supplier.trend}
            </span>
          </div>

          {/* Outstanding */}
          <div className="text-right">
            <p className="text-xs text-ink-muted">Total outstanding</p>
            <p className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              supplier.overdueCount > 0 ? "text-signal-danger" : "text-ink-primary"
            )}>
              LKR {supplier.totalOutstanding.toLocaleString()}
            </p>
            <p className="text-[10px] text-ink-muted">
              {supplier.pendingCount + supplier.overdueCount} obligation{supplier.pendingCount + supplier.overdueCount !== 1 ? "s" : ""} open
              {supplier.overdueCount > 0 && (
                <span className="text-signal-danger ml-1">· {supplier.overdueCount} overdue</span>
              )}
            </p>
          </div>
        </div>

        {/* AI insight card */}
        {insight && (
          <div className={cn(
            "border-l-2 rounded-r-lg px-3 py-2 mb-4",
            aiResult
              ? `border-l-${healthColor(aiResult.relationship_health).replace("text-", "")} bg-bg-muted/60`
              : "border-l-pilot-500 bg-pilot-500/5",
          )}>
            <div className="flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 text-pilot-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-secondary leading-relaxed">
                {aiResult && (
                  <span className={cn("font-semibold mr-1 capitalize", healthColor(aiResult.relationship_health))}>
                    {aiResult.relationship_health} ·
                  </span>
                )}
                {insight}
                {aiResult && (
                  <span className={cn(
                    "ml-1 text-[10px] font-medium uppercase tracking-wide",
                    aiResult.estimated_impact === "high" && "text-signal-danger",
                    aiResult.estimated_impact === "medium" && "text-signal-watch",
                    aiResult.estimated_impact === "low" && "text-ink-muted",
                  )}>
                    [{aiResult.estimated_impact} impact]
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Hide obligations</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> View obligations ({supplier.obligations.length})</>
            )}
          </Button>

          <Button
            size="sm"
            className="text-xs h-7 gap-1 bg-pilot-500 hover:bg-pilot-600 text-white"
            onClick={() => router.push("/payments")}
          >
            <CreditCard className="h-3 w-3" />
            Pay via CEFTS
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1 text-pilot-400"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {analyzing ? "Analyzing…" : "AI Analysis"}
          </Button>
        </div>
      </div>

      {/* ── Expanded obligations list ─────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border bg-bg-muted/40 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-tertiary font-medium mb-3">
            Payment obligations
          </p>

          {supplier.obligations.length === 0 ? (
            <p className="text-xs text-ink-muted">No obligations recorded.</p>
          ) : (
            <div className="space-y-2">
              {supplier.obligations.map((obl) => {
                const dueMs = new Date(obl.dueDate).getTime();
                const daysLate =
                  obl.paidAt
                    ? Math.max(0, Math.floor((new Date(obl.paidAt).getTime() - dueMs) / 86_400_000))
                    : obl.status === "overdue"
                      ? Math.floor((Date.now() - dueMs) / 86_400_000)
                      : 0;

                return (
                  <div
                    key={obl.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm",
                      obl.status === "overdue"
                        ? "bg-signal-danger/5 border border-signal-danger/20"
                        : "bg-surface border border-border",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ink-secondary">
                          {obl.reference}
                        </span>
                        {statusBadge(obl.status)}
                        {daysLate > 0 && (
                          <span className="text-[10px] text-signal-danger font-medium">
                            {daysLate}d late
                          </span>
                        )}
                      </div>
                      {obl.description && (
                        <p className="text-[11px] text-ink-muted mt-0.5 truncate">
                          {obl.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-semibold text-ink-primary tabular-nums">
                        LKR {obl.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        Due {new Date(obl.dueDate).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                      </p>
                    </div>

                    {obl.status === "overdue" && (
                      <Button
                        size="sm"
                        className="text-[11px] h-6 px-2 shrink-0 bg-signal-danger hover:bg-signal-danger/90 text-white"
                        onClick={() => router.push("/payments")}
                      >
                        Pay now
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add obligation form */}
          {showAddForm ? (
            <AddObligationForm onCancel={() => setShowAddForm(false)} />
          ) : (
            <button
              className="mt-3 flex items-center gap-1.5 text-xs text-pilot-400 hover:text-pilot-300 transition-colors"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add obligation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Right Rail ───────────────────────────────────────────────────────────────

function RightRail({ suppliers }: { suppliers: SupplierCardData[] }) {
  const router = useRouter();

  const atRisk = suppliers
    .filter(
      (s) => s.reliabilityScore < 60 || s.trend === "worsening",
    )
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore)
    .slice(0, 3);

  const recommendations: string[] = [];
  for (const s of suppliers) {
    if (s.overdueCount > 0) {
      const overdue = s.obligations.find((o) => o.status === "overdue");
      if (overdue) {
        recommendations.push(
          `Pay ${s.name} — ${overdue.reference} (LKR ${overdue.amount.toLocaleString()}) is overdue. Initiate CEFTS today.`,
        );
      }
    } else if (s.trend === "worsening" && s.obligations.some((o) => o.status === "pending")) {
      const pending = s.obligations.find((o) => o.status === "pending");
      if (pending) {
        recommendations.push(
          `Pay ${s.name} early — score ${s.reliabilityScore} worsening. Schedule CEFTS for ${pending.reference} before due date.`,
        );
      }
    } else if (s.reliabilityScore >= 80 && s.obligations.some((o) => o.status === "pending")) {
      recommendations.push(
        `${s.name} is a strong relationship. Maintain by paying ${s.obligations.find((o) => o.status === "pending")?.reference} on time.`,
      );
    }
    if (recommendations.length >= 3) break;
  }

  return (
    <div className="space-y-4">
      {/* AI Relationship Health */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-pilot-400" />
          <h3 className="text-sm font-semibold text-ink-primary">
            AI Relationship Health
          </h3>
        </div>

        {atRisk.length === 0 ? (
          <p className="text-xs text-ink-secondary">All supplier relationships are healthy.</p>
        ) : (
          <div className="space-y-3">
            {atRisk.map((s) => {
              const overdue = s.obligations.find((o) => o.status === "overdue");
              return (
                <div
                  key={s.id}
                  className="border-l-2 border-l-signal-danger pl-3 py-1"
                >
                  <p className="text-xs font-medium text-ink-primary">{s.name}</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">
                    {s.trend === "worsening"
                      ? `Your reliability score is worsening (${s.reliabilityScore}/100).`
                      : `Score ${s.reliabilityScore}/100 — below safe threshold.`}
                    {overdue
                      ? ` Consider initiating CEFTS payment for ${overdue.reference} to recover standing.`
                      : " Pay upcoming obligations early to improve score."}
                  </p>
                  <button
                    className="text-[10px] text-pilot-400 font-medium mt-1 hover:underline"
                    onClick={() => {
                      const el = document.getElementById(`supplier-${s.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    View supplier →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended actions */}
      {recommendations.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-ink-primary mb-3">
            Recommended Actions
          </h3>
          <ol className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-ink-secondary">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-pilot-500/10 text-pilot-400 font-bold text-[10px]">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ol>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 text-xs h-7 w-full"
            onClick={() => router.push("/payments")}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Open Payments Hub
          </Button>
        </div>
      )}

      {/* Quick legend */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">
          Score tiers
        </h3>
        <div className="space-y-1.5">
          {(["A", "B", "C", "D", "F"] as const).map((tier) => {
            const labels: Record<string, string> = {
              A: "90–100 · Excellent payer",
              B: "75–89 · Good payer",
              C: "60–74 · Acceptable",
              D: "45–59 · At risk",
              F: "0–44 · High-risk payer",
            };
            return (
              <div key={tier} className="flex items-center gap-2">
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold border",
                  tierBgClass(tier),
                )}>{tier}</span>
                <span className="text-[11px] text-ink-muted">{labels[tier]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Stat tiles (simple, no animation dep) ───────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
  status = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  status?: "healthy" | "watch" | "danger" | "neutral";
}) {
  const valueClass = {
    healthy: "text-signal-healthy",
    watch: "text-signal-watch",
    danger: "text-signal-danger",
    neutral: "text-ink-primary",
  }[status];

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">
        {label}
      </p>
      <p className={cn("font-display text-2xl font-semibold tabular-nums leading-none", valueClass)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SuppliersClient({
  suppliers,
  totalOwed,
  suppliersAtRisk,
  avgPunctuality,
  upcomingCount,
  upcomingTotal,
}: SuppliersClientProps) {
  const [highlightId] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">
          Supplier Trust Mirror
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          How reliable are <span className="font-medium text-ink-primary">YOU</span> as a payer?
          Supplier health is <span className="font-medium text-ink-primary">YOUR</span> risk too.
        </p>
      </div>

      {/* ── Stat tiles ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label="Total owed"
          value={`LKR ${totalOwed >= 1_000_000 ? `${(totalOwed / 1_000_000).toFixed(1)}M` : totalOwed.toLocaleString()}`}
          sub="Pending + overdue obligations"
          status={totalOwed > 500_000 ? "watch" : "neutral"}
        />
        <MiniStat
          label="Suppliers at risk"
          value={String(suppliersAtRisk)}
          sub="Score < 60 or worsening"
          status={suppliersAtRisk > 0 ? "danger" : "healthy"}
        />
        <MiniStat
          label="Avg payment punctuality"
          value={`${Math.round(avgPunctuality)}/100`}
          sub="Across all suppliers"
          status={avgPunctuality >= 75 ? "healthy" : avgPunctuality >= 60 ? "watch" : "danger"}
        />
        <MiniStat
          label="Due in 7 days"
          value={String(upcomingCount)}
          sub={upcomingCount > 0 ? `LKR ${upcomingTotal.toLocaleString()} total` : "No urgent payments"}
          status={upcomingCount > 0 ? "watch" : "healthy"}
        />
      </div>

      {/* ── Content grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Supplier cards — left area */}
        <div className="xl:col-span-9">
          {suppliers.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl px-6 py-12 text-center">
              <Building2 className="h-8 w-8 text-ink-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ink-secondary">No suppliers found</p>
              <p className="text-xs text-ink-muted mt-1">
                Run the seed route to populate demo supplier data.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  highlighted={highlightId === supplier.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="xl:col-span-3">
          <RightRail suppliers={suppliers} />
        </div>
      </div>
    </div>
  );
}
