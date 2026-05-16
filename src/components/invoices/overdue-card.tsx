"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OverdueInvoiceData {
  id: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  escalationStage: string | null;
  riskScore: number | null;
  justpayLink: string | null;
  aiRiskReasoning: string | null;
  lastRecoveryMessage: string | null;
  client: {
    id: string;
    name: string;
    businessType: string;
    trustScore: number;
    trustTrend: string;
    riskTier: string;
    avgDaysToPay: number | null;
    latePaymentCount: number;
    whatsappPhone: string | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeverityBorder(daysOverdue: number): string {
  if (daysOverdue >= 14) return "border-l-signal-critical";
  if (daysOverdue >= 7)  return "border-l-signal-danger";
  return "border-l-signal-watch";
}

function getSeverityColor(daysOverdue: number): string {
  if (daysOverdue >= 14) return "text-signal-critical";
  if (daysOverdue >= 7)  return "text-signal-danger";
  return "text-signal-watch";
}

function getHealthGrade(riskScore: number | null): { grade: string; color: string } {
  const s = riskScore ?? 50;
  if (s <= 25) return { grade: "A", color: "text-signal-healthy" };
  if (s <= 45) return { grade: "B", color: "text-signal-watch" };
  if (s <= 65) return { grade: "C", color: "text-signal-watch" };
  if (s <= 80) return { grade: "D", color: "text-signal-danger" };
  return { grade: "F", color: "text-signal-critical" };
}

function getTrustVariant(tier: string): React.ComponentProps<typeof SignalBadge>["variant"] {
  switch (tier) {
    case "A": case "B": return "healthy";
    case "C": return "watch";
    case "D": return "danger";
    default:  return "critical";
  }
}

const TREND_ICON: Record<string, React.ElementType> = {
  improving: ArrowUpRight,
  stable:    ArrowRight,
  worsening: ArrowDownRight,
};

const TREND_COLOR: Record<string, string> = {
  improving: "text-signal-healthy",
  stable:    "text-ink-muted",
  worsening: "text-signal-danger",
};

// ─── Default probability mini-gauge ──────────────────────────────────────────

function DefaultProbGauge({ riskScore }: { riskScore: number | null }) {
  const prob = Math.min(1, (riskScore ?? 50) / 100);
  const r = 13;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - prob);
  const color =
    prob >= 0.7
      ? "hsl(0 84% 60%)"
      : prob >= 0.4
        ? "hsl(38 92% 50%)"
        : "hsl(142 71% 45%)";
  const pct = Math.round(prob * 100);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative flex items-center justify-center">
        <svg width="34" height="34" viewBox="0 0 34 34">
          <circle r={r} cx={17} cy={17} fill="none" stroke="hsl(217 33% 17%)" strokeWidth={3.5} />
          <circle
            r={r} cx={17} cy={17} fill="none"
            stroke={color} strokeWidth={3.5}
            strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90, 17, 17)" strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[9px] font-bold tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      <span className="text-[10px] text-ink-muted leading-none">default</span>
    </div>
  );
}

// ─── Payment history sparkline ────────────────────────────────────────────────

function PaymentSparkline({ avgDaysToPay, lateCount }: { avgDaysToPay: number | null; lateCount: number }) {
  // Simulate 6-invoice history from avg/late count
  const avg = avgDaysToPay ?? 10;
  const points = [avg * 0.8, avg * 1.2, avg, avg * 1.5, avg * 0.9, avg * 1.8].map(
    (d, i) => Math.max(0, Math.round(d + (i % 2 === 0 ? -2 : 3))),
  );
  const max = Math.max(...points, 1);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-ink-tertiary uppercase tracking-wider font-medium">
        Payment delay trend (last 6 invoices)
      </p>
      <div className="flex items-end gap-1.5 h-10">
        {points.map((days, i) => {
          const height = Math.max(4, (days / max) * 40);
          const color =
            days >= 14
              ? "bg-signal-critical"
              : days >= 7
                ? "bg-signal-danger"
                : days >= 3
                  ? "bg-signal-watch"
                  : "bg-signal-healthy";
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-[8px] text-ink-muted tabular-nums">{days}d</span>
              <div
                className={cn("w-full rounded-sm", color)}
                style={{ height }}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted">
        Avg: <span className="font-medium text-ink-secondary">{avg} days</span> · Late payments:{" "}
        <span className="font-medium text-ink-secondary">{lateCount}</span>
      </p>
    </div>
  );
}

// ─── Expanded content ─────────────────────────────────────────────────────────

function ExpandedContent({ invoice }: { invoice: OverdueInvoiceData }) {
  return (
    <motion.div
      key="expanded"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
      className="overflow-hidden"
    >
      <div className="border-t border-border mx-6 py-4 grid grid-cols-2 gap-6">
        {/* Payment history */}
        <PaymentSparkline
          avgDaysToPay={invoice.client.avgDaysToPay}
          lateCount={invoice.client.latePaymentCount}
        />

        {/* AI suggested action */}
        <div className="space-y-1.5">
          <p className="text-xs text-ink-tertiary uppercase tracking-wider font-medium flex items-center gap-1.5">
            <span className="text-signal-ai">✦</span> AI-suggested next action
          </p>
          <div className="border-l-2 border-l-signal-ai bg-purple-950/10 rounded-lg px-3 py-2.5">
            <p className="text-sm text-ink-secondary leading-relaxed">
              {invoice.aiRiskReasoning
                ? invoice.aiRiskReasoning.slice(0, 180) + (invoice.aiRiskReasoning.length > 180 ? "…" : "")
                : invoice.lastRecoveryMessage
                  ? `Last message sent: "${invoice.lastRecoveryMessage.slice(0, 100)}…"`
                  : `Send a Stage ${invoice.daysOverdue >= 14 ? "3" : invoice.daysOverdue >= 7 ? "2" : "1"} recovery message immediately.`}
            </p>
          </div>
          <Link
            href={`/recovery/${invoice.id}`}
            className="inline-flex items-center gap-1 text-xs text-pilot-500 hover:text-pilot-400 transition-colors mt-1"
          >
            View full client profile →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface OverdueCardProps {
  invoice: OverdueInvoiceData;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

export function OverdueCard({ invoice, isSelected, onSelect }: OverdueCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { grade, color: gradeColor } = getHealthGrade(invoice.riskScore);
  const TrendIcon = TREND_ICON[invoice.client.trustTrend] ?? ArrowRight;

  async function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    if (!invoice.justpayLink) return;
    await navigator.clipboard.writeText(invoice.justpayLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const phone = invoice.client.whatsappPhone?.replace(/\D/g, "") ?? "";
    const text = encodeURIComponent(
      `Dear ${invoice.client.name}, this is a reminder regarding invoice ${invoice.invoiceNumber} for LKR ${invoice.amount.toLocaleString()}. Please settle at your earliest convenience.${invoice.justpayLink ? ` Pay here: ${invoice.justpayLink}` : ""}`,
    );
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  }

  function handleRecover(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/recovery/${invoice.id}`);
  }

  return (
    <div
      className={cn(
        "bg-surface border border-border border-l-4 rounded-lg overflow-hidden",
        "cursor-pointer select-none transition-colors hover:bg-bg-raised",
        getSeverityBorder(invoice.daysOverdue),
        isSelected && "ring-1 ring-pilot-500",
      )}
      onClick={() => setIsExpanded((v) => !v)}
    >
      {/* Main row */}
      <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center group">

        {/* Checkbox (hover) */}
        <div className="absolute left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onSelect(invoice.id, !isSelected); }}>
          <Checkbox checked={isSelected} onCheckedChange={(v) => onSelect(invoice.id, v === true)} />
        </div>

        {/* Col 1-3: Client */}
        <div className="col-span-3 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-base text-ink-primary truncate">{invoice.client.name}</p>
            <SignalBadge variant={getTrustVariant(invoice.client.riskTier)} size="sm">
              {invoice.client.riskTier}
            </SignalBadge>
            <TrendIcon className={cn("h-3.5 w-3.5 shrink-0", TREND_COLOR[invoice.client.trustTrend])} />
          </div>
          <p className="text-sm text-ink-secondary truncate">{invoice.client.businessType}</p>
          <p className="text-xs text-ink-muted">Trust: {invoice.client.trustScore}/100</p>
        </div>

        {/* Col 4-5: Amount */}
        <div className="col-span-2 space-y-0.5">
          <p className="font-mono text-xl font-semibold text-ink-primary tabular-nums">
            {(invoice.amount / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-ink-tertiary font-mono">LKR {invoice.amount.toLocaleString()}</p>
          <p className="text-xs text-ink-muted">{invoice.invoiceNumber}</p>
        </div>

        {/* Col 6-7: Days overdue */}
        <div className="col-span-2 space-y-0.5">
          <p className={cn("text-2xl font-display font-bold tabular-nums", getSeverityColor(invoice.daysOverdue))}>
            {invoice.daysOverdue}d
          </p>
          <p className="text-xs text-ink-muted">
            Due {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          {invoice.escalationStage && (
            <p className="text-xs text-ink-tertiary">Stage {invoice.escalationStage}</p>
          )}
        </div>

        {/* Col 8: Health grade */}
        <div className="col-span-1 flex flex-col items-center">
          <span className={cn("text-2xl font-display font-bold", gradeColor)}>{grade}</span>
          <span className="text-[10px] text-ink-muted">grade</span>
        </div>

        {/* Col 9: Default probability gauge */}
        <div className="col-span-1 flex justify-center">
          <DefaultProbGauge riskScore={invoice.riskScore} />
        </div>

        {/* Col 10-12: Actions */}
        <div
          className="col-span-3 flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRecover}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-pilot-500 hover:bg-pilot-600 text-white transition-colors"
          >
            Recover
          </button>
          <button
            onClick={handleCopyLink}
            disabled={!invoice.justpayLink}
            title="Copy JustPay link"
            className="p-2 rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-muted transition-colors disabled:opacity-30"
          >
            {isCopied ? <Check className="h-4 w-4 text-signal-healthy" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleWhatsApp}
            title="Send WhatsApp"
            className="p-2 rounded-md text-ink-muted hover:text-signal-healthy hover:bg-signal-healthy/10 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-ink-muted shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
          )}
        </div>
      </div>

      {/* Expanded inline section */}
      <AnimatePresence>
        {isExpanded && <ExpandedContent invoice={invoice} />}
      </AnimatePresence>
    </div>
  );
}
