"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: AlertTriangle,
    color: "text-signal-danger",
    bg: "bg-signal-danger/10",
    border: "border-signal-danger/20",
    title: "Predict cash crises 22 days early",
    description:
      "FlowPilot analyses your bank data and flags dangerous runway drops before they become emergencies.",
    pill: { label: "Cash runway: 14 days", status: "watch" as const },
    detail: "⚠ Runway drops below 7 days in 14 days if no collections.",
  },
  {
    icon: MessageSquare,
    color: "text-signal-ai",
    bg: "bg-signal-ai/10",
    border: "border-signal-ai/20",
    title: "Recover payments automatically",
    description:
      "AI drafts personalised Sinhala, Tamil and English recovery messages. One click sends via WhatsApp.",
    pill: { label: "Stage 1 · Warm reminder", status: "healthy" as const },
    detail: "✦ AI drafted in Sinhala. JustPay link included.",
  },
  {
    icon: BrainCircuit,
    color: "text-pilot-400",
    bg: "bg-pilot-500/10",
    border: "border-pilot-500/20",
    title: "AI CFO brief every morning",
    description:
      "Wake up to a 5-bullet brief — your cash position, who owes you, and the one action to take today.",
    pill: { label: "Today's brief ready", status: "healthy" as const },
    detail: "• Runway extended 8 days if Nexus Traders pays today.",
  },
  {
    icon: TrendingUp,
    color: "text-signal-healthy",
    bg: "bg-signal-healthy/10",
    border: "border-signal-healthy/20",
    title: "90-day cash flow projections",
    description:
      "See exactly when your balance turns negative and stress-test scenarios before they happen.",
    pill: { label: "Projected safe for 62 days", status: "healthy" as const },
    detail: "If top 2 clients default: runway shrinks to 9 days.",
  },
  {
    icon: ShieldCheck,
    color: "text-signal-watch",
    bg: "bg-signal-watch/10",
    border: "border-signal-watch/20",
    title: "Know which clients to trust",
    description:
      "Every client gets a Trust Score based on payment behaviour. Spot risky relationships before they cost you.",
    pill: { label: "Trust score: 68 / 100 ↓", status: "watch" as const },
    detail: "3 late payments in the last 90 days. Stage 2 recommended.",
  },
  {
    icon: Zap,
    color: "text-pilot-400",
    bg: "bg-pilot-500/10",
    border: "border-pilot-500/20",
    title: "Connected to Seylan Bank",
    description:
      "Real-time balance, CEFTS transfers, JustPay links and Mastercard card payments — all in one dashboard.",
    pill: { label: "Live · Seylan sandbox", status: "healthy" as const },
    detail: "CEFTS transfer sent. Ref: FlowPilot-17389241.",
  },
];

const STATUS_COLORS = {
  healthy: "bg-signal-healthy/15 text-signal-healthy",
  watch:   "bg-signal-watch/15 text-signal-watch",
  danger:  "bg-signal-danger/15 text-signal-danger",
};

// ─── Animated progress dots ───────────────────────────────────────────────────

function ProgressDots({
  total,
  active,
  onSelect,
}: {
  total: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={cn(
            "rounded-full transition-all duration-500",
            i === active
              ? "w-5 h-1.5 bg-pilot-500"
              : "w-1.5 h-1.5 bg-border hover:bg-ink-muted",
          )}
          aria-label={`Feature ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuthFeatureShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % FEATURES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [paused]);

  const feature = FEATURES[index];
  const Icon = feature.icon;

  return (
    <div
      className="w-full max-w-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Feature card ────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-border bg-bg-surface overflow-hidden shadow-raised min-h-[280px]">
        {/* Animated gradient blob in background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "absolute inset-0 pointer-events-none",
              feature.bg,
            )}
            style={{ filter: "blur(60px)", opacity: 0.3 }}
          />
        </AnimatePresence>

        <div className="relative p-6 space-y-4">
          {/* Icon + status pill row */}
          <div className="flex items-start justify-between gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", feature.bg, feature.border)}>
              <Icon className={cn("h-5 w-5", feature.color)} />
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={`pill-${index}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "text-[10px] font-semibold px-2 py-1 rounded-full",
                  STATUS_COLORS[feature.pill.status],
                )}
              >
                {feature.pill.label}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Title + description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-2"
            >
              <h3 className="font-display text-base font-semibold text-ink-primary leading-snug">
                {feature.title}
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Detail strip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`detail-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-mono leading-relaxed",
                feature.bg,
                feature.border,
                feature.color,
              )}
            >
              {feature.detail}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="relative h-0.5 bg-border overflow-hidden">
          {!paused && (
            <motion.div
              key={index}
              className="absolute left-0 top-0 h-full bg-pilot-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear" }}
            />
          )}
        </div>
      </div>

      {/* ── Navigation dots + counter ───────────────────────────────────── */}
      <div className="flex items-center justify-between mt-4 px-1">
        <ProgressDots
          total={FEATURES.length}
          active={index}
          onSelect={(i) => {
            setIndex(i);
            setPaused(true);
            setTimeout(() => setPaused(false), 4000);
          }}
        />
        <p className="text-[10px] text-ink-muted tabular-nums">
          {index + 1} / {FEATURES.length}
        </p>
      </div>

      {/* ── Social proof strip ──────────────────────────────────────────── */}
      <div className="mt-5 flex items-center gap-2 justify-center">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-healthy opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-healthy" />
        </span>
        <p className="text-xs text-ink-muted">
          Built for Sri Lankan SMEs · Powered by Seylan Bank APIs
        </p>
      </div>
    </div>
  );
}
