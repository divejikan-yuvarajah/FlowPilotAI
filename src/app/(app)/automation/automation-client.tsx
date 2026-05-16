"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  Send,
  Shield,
  Sparkles,
  TrendingDown,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutomationRule {
  id: string;
  name: string;
  priority: number;
  conditionJson: Record<string, unknown>;
  actionJson: Record<string, unknown>;
  isActive: boolean;
  triggerCount: number;
  createdAt: string;
}

export interface AlertLogEntry {
  id: string;
  ruleName: string;
  invoiceId: string | null;
  triggeredAt: string;
  outcome: string;
  actionTaken: string | null;
  channel: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Render a condition_json as readable English */
function formatCondition(json: Record<string, unknown>): string {
  if (json.event) return `When event: ${String(json.event).replace(/_/g, " ")}`;

  const metric = json.metric ? String(json.metric).replace(/_/g, " ") : null;
  const op = json.operator as string | undefined;
  const threshold = json.threshold !== undefined ? json.threshold : null;
  const window = json.window_days ? ` within ${json.window_days} days` : "";
  const taxTypes =
    Array.isArray(json.tax_types) ? ` [${(json.tax_types as string[]).join(", ")}]` : "";

  if (metric && op && threshold !== null) {
    const opLabel =
      op === ">=" ? "≥" : op === "<=" ? "≤" : op === ">" ? ">" : op === "<" ? "<" : op;
    return `${metric}${taxTypes} ${opLabel} ${threshold}${window}`;
  }
  return JSON.stringify(json);
}

/** Render an action_json as readable English */
function formatAction(json: Record<string, unknown>): string {
  const type = (json.type as string | undefined)?.replace(/_/g, " ") ?? "unknown";
  const parts = [type];
  if (json.channel) parts.push(`via ${json.channel}`);
  if (json.template) parts.push(`(${json.template})`);
  if (json.severity) parts.push(`[${json.severity}]`);
  if (json.delta) parts.push(`+${json.delta} pts`);
  if (json.auto_send === false) parts.push("(manual confirm)");
  return parts.join(" · ");
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  create_alert: AlertCircle,
  send_reminder: MessageSquare,
  block_credit: Shield,
  activate_crisis_mode: Zap,
  downgrade_risk_tier: TrendingDown,
  increase_trust_score: CheckCircle2,
  generate_cefts_transfer: Send,
  mark_invoice_paid: CheckCircle2,
};

function actionIcon(json: Record<string, unknown>): LucideIcon {
  const type = json.type as string | undefined;
  return (type && ACTION_ICONS[type]) ? ACTION_ICONS[type] : Workflow;
}

function priorityColor(p: number): string {
  if (p <= 3) return "bg-signal-danger/10 text-signal-danger border-signal-danger/20";
  if (p <= 6) return "bg-signal-watch/10 text-signal-watch border-signal-watch/20";
  return "bg-bg-muted text-ink-muted border-border";
}

function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "success": return "text-signal-healthy";
    case "no_response": return "text-signal-watch";
    case "pending": return "text-pilot-400";
    default: return "text-signal-danger";
  }
}

function outcomeIcon(outcome: string) {
  switch (outcome) {
    case "success": return <CheckCircle2 className="h-3.5 w-3.5 text-signal-healthy" />;
    case "pending": return <Clock className="h-3.5 w-3.5 text-pilot-400" />;
    default: return <AlertCircle className="h-3.5 w-3.5 text-signal-watch" />;
  }
}

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({ rule }: { rule: AutomationRule }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(rule.isActive);
  const ActionIcon = actionIcon(rule.actionJson);

  return (
    <div
      className={cn(
        "bg-surface border rounded-xl overflow-hidden transition-all",
        active ? "border-border" : "border-border opacity-60",
      )}
    >
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        className="w-full px-4 py-4 text-left hover:bg-bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Priority badge */}
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold mt-0.5",
              priorityColor(rule.priority),
            )}
          >
            {rule.priority}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-ink-primary">
                {rule.name}
              </p>
              {rule.triggerCount > 0 && (
                <span className="text-[10px] text-ink-muted bg-bg-muted px-1.5 py-0.5 rounded">
                  {rule.triggerCount}× fired
                </span>
              )}
            </div>

            {/* IF */}
            <div className="flex items-start gap-1.5 mt-1.5">
              <span className="text-[10px] font-bold text-pilot-400 uppercase tracking-wide shrink-0 mt-0.5">
                IF
              </span>
              <p className="text-xs text-ink-secondary capitalize">
                {formatCondition(rule.conditionJson)}
              </p>
            </div>

            {/* THEN */}
            <div className="flex items-start gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide shrink-0 mt-0.5">
                THEN
              </span>
              <div className="flex items-center gap-1">
                <ActionIcon className="h-3 w-3 text-ink-muted shrink-0" />
                <p className="text-xs text-ink-secondary capitalize">
                  {formatAction(rule.actionJson)}
                </p>
              </div>
            </div>
          </div>

          {/* Right: toggle + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActive(!active);
              }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                active ? "bg-pilot-500" : "bg-bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                  active ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-ink-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border bg-bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium mb-2">
            Rule details (read-only)
          </p>
          <div>
            <p className="text-[10px] text-ink-muted mb-1">Condition JSON</p>
            <pre className="text-[11px] text-ink-secondary bg-bg-inset border border-border rounded-md px-3 py-2 overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(rule.conditionJson, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-[10px] text-ink-muted mb-1">Action JSON</p>
            <pre className="text-[11px] text-ink-secondary bg-bg-inset border border-border rounded-md px-3 py-2 overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(rule.actionJson, null, 2)}
            </pre>
          </div>
          <p className="text-[10px] text-ink-muted">
            Created {new Date(rule.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Alert log row ────────────────────────────────────────────────────────────

function AlertLogRow({ entry }: { entry: AlertLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0">{outcomeIcon(entry.outcome)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium text-ink-primary">{entry.ruleName}</p>
            <span className={cn("text-[10px] font-medium capitalize", outcomeColor(entry.outcome))}>
              {entry.outcome.replace(/_/g, " ")}
            </span>
            {entry.channel && (
              <span className="text-[10px] text-ink-muted bg-bg-muted px-1.5 py-0.5 rounded capitalize">
                {entry.channel.replace(/_/g, " ")}
              </span>
            )}
          </div>
          {entry.actionTaken && (
            <p className="text-[11px] text-ink-muted mt-0.5 truncate">{entry.actionTaken}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-ink-muted">{timeAgo(entry.triggeredAt)}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-ink-muted" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
          )}
        </div>
      </button>

      {expanded && entry.metadata && (
        <div className="px-5 pb-3 bg-bg-muted/20 border-t border-border">
          <p className="text-[10px] text-ink-muted mb-1 mt-2">Metadata</p>
          <pre className="text-[11px] text-ink-secondary bg-bg-inset border border-border rounded-md px-3 py-2 overflow-x-auto font-mono leading-relaxed">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
          <p className="text-[10px] text-ink-muted mt-1">
            {new Date(entry.triggeredAt).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AutomationClient({
  rules,
  alerts,
  activeCount,
  totalTriggers,
}: {
  rules: AutomationRule[];
  alerts: AlertLogEntry[];
  activeCount: number;
  totalTriggers: number;
}) {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            Automation Rules
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            IF/THEN rules that trigger alerts, messages, and actions automatically
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          New rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total rules", value: rules.length, color: "text-ink-primary" },
          { label: "Active", value: activeCount, color: "text-signal-healthy" },
          { label: "Inactive", value: rules.length - activeCount, color: "text-ink-muted" },
          { label: "Total triggers", value: totalTriggers, color: "text-pilot-400" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">
              {s.label}
            </p>
            <p className={cn("font-display text-2xl font-semibold mt-1", s.color)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Rules grid */}
      {rules.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl px-6 py-12 text-center">
          <Workflow className="h-8 w-8 text-ink-muted mx-auto mb-3" />
          <p className="text-sm text-ink-secondary">No automation rules found</p>
          <p className="text-xs text-ink-muted mt-1">Run the seed route to populate demo rules.</p>
        </div>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-tertiary font-medium mb-3">
            {rules.length} rules — ordered by priority
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {/* Trigger log */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ink-tertiary" />
          <h2 className="text-sm font-semibold text-ink-primary">Trigger Log</h2>
          <span className="ml-auto text-xs text-ink-muted">
            Last {alerts.length} events
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Clock className="h-7 w-7 text-ink-muted mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No trigger history yet</p>
          </div>
        ) : (
          <div>
            {alerts.map((entry) => (
              <AlertLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
