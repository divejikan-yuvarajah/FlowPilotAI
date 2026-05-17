// Disable static generation — this page renders live UI components
export const dynamic = "force-dynamic";

import { Clock, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { SignalBadge } from "@/components/ui/signal-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AIInsightCard } from "@/components/ai/ai-insight-card";

const BADGE_VARIANTS = [
  "healthy",
  "watch",
  "danger",
  "critical",
  "ai",
  "neutral",
] as const;

export default function DesignTestPage() {
  const generatedAt = new Date(Date.now() - 1000 * 60 * 7); // 7 minutes ago

  return (
    <main className="min-h-screen bg-bg-base px-6 py-12 max-w-5xl mx-auto space-y-16">
      <header>
        <h1 className="text-3xl font-display font-semibold text-ink-primary">
          FlowPilot Design System
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Primitive component showcase — /design-test
        </p>
      </header>

      {/* ─── Typography ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          Typography
        </h2>
        <div className="space-y-3">
          <p className="font-sans text-2xl text-ink-primary">
            Inter (font-sans) — The quick brown fox
          </p>
          <p className="font-display text-2xl text-ink-primary">
            Geist (font-display) — The quick brown fox
          </p>
          <p className="font-mono text-2xl text-ink-primary">
            JetBrains Mono (font-mono) — The quick brown fox
          </p>
        </div>
      </section>

      {/* ─── AnimatedNumber ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          AnimatedNumber
        </h2>
        <div className="flex flex-wrap gap-8">
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Currency (LKR)</p>
            <AnimatedNumber
              value={1247500}
              prefix="LKR "
              className="text-4xl font-display font-semibold text-ink-primary tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Days</p>
            <AnimatedNumber
              value={14}
              suffix=" days"
              className="text-4xl font-display font-semibold text-signal-watch tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-ink-muted">Percentage</p>
            <AnimatedNumber
              value={92}
              suffix="%"
              className="text-4xl font-display font-semibold text-signal-healthy tabular-nums"
            />
          </div>
        </div>
      </section>

      {/* ─── SignalBadge ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          SignalBadge
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">Size: sm</p>
            <div className="flex flex-wrap gap-2 items-center">
              {BADGE_VARIANTS.map((v) => (
                <SignalBadge key={v} variant={v} size="sm">
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </SignalBadge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">Size: md</p>
            <div className="flex flex-wrap gap-2 items-center">
              {BADGE_VARIANTS.map((v) => (
                <SignalBadge key={v} variant={v} size="md">
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </SignalBadge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">Single-letter labels</p>
            <div className="flex flex-wrap gap-2 items-center">
              {BADGE_VARIANTS.map((v, i) => (
                <SignalBadge key={v} variant={v} size="sm">
                  {String.fromCharCode(65 + i)}
                </SignalBadge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── StatTile ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          StatTile — all four status variants
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Runway"
            value={14}
            suffix=" days"
            status="watch"
            delta={-3}
            deltaLabel="vs last week"
            icon={Clock}
          />
          <StatTile
            label="Cash Balance"
            value={1247500}
            prefix="LKR "
            status="healthy"
            delta={82000}
            deltaLabel="this month"
            icon={DollarSign}
          />
          <StatTile
            label="Overdue Invoices"
            value={7}
            suffix=" invoices"
            status="danger"
            delta={2}
            deltaLabel="since yesterday"
            icon={AlertTriangle}
          />
          <StatTile
            label="Burn Rate"
            value={340000}
            prefix="LKR "
            status="critical"
            delta={-15000}
            deltaLabel="vs last month"
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* ─── AIInsightCard ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          AIInsightCard
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AIInsightCard
            model="Mistral 7B"
            generatedAt={generatedAt}
            reasoning="Step 1: Fetched 90 days of transaction history. Step 2: Computed daily net cash flow. Step 3: Applied linear regression to identify trend. Step 4: Projected forward 30 days using the derived slope. Confidence interval: ±12%."
          >
            Cash flow is trending negative at <strong className="text-signal-danger">−LKR 18,500/day</strong>.
            At this rate, the runway extends approximately <strong className="text-signal-watch">14 days</strong>.
            Consider accelerating collections on overdue invoices to extend this by up to 8 days.
          </AIInsightCard>

          <AIInsightCard
            model="GPT-4o mini"
            generatedAt={new Date(Date.now() - 1000 * 60 * 32)}
          >
            Your top revenue customer (Seylan Bank Ltd.) has an invoice of{" "}
            <strong className="text-ink-primary">LKR 425,000</strong> that is 12 days overdue.
            Sending a follow-up today could recover 34% of this month&apos;s cash gap.
          </AIInsightCard>
        </div>
      </section>

      {/* ─── Glass utility ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-ink-tertiary font-medium border-b border-border pb-2">
          Glass utility
        </h2>
        <div className="relative rounded-xl overflow-hidden p-1 bg-gradient-to-br from-pilot-500/30 via-signal-ai/20 to-signal-healthy/20">
          <div className="glass rounded-lg p-6">
            <p className="text-sm text-ink-secondary">
              This card uses the <code className="font-mono text-signal-ai text-xs bg-bg-muted px-1 py-0.5 rounded">.glass</code> utility —
              backdrop-blur-xl with a semi-transparent surface and white/6 border.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
