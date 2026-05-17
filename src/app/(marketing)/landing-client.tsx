"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Globe,
  MessageSquare,
  Moon,
  Play,
  Receipt,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// ─── Motion helpers ───────────────────────────────────────────────────────────

function FadeUp({
  children,
  i = 0,
  className,
}: {
  children: React.ReactNode;
  i?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return { ref, value };
}

function CountUp({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

// ─── Theme toggle (same logic as dashboard ThemeToggle) ───────────────────────

function LandingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-8 w-8" />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-raised transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = ["Features", "Engines", "Pricing", "Demo"];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const pillBase = "backdrop-blur-xl border transition-all duration-300";
  const pillScrolled = "bg-bg-surface/90 border-border shadow-raised";
  const pillDefault = "bg-bg-surface/70 border-border/60 shadow-subtle";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-4 px-4"
      aria-label="Main navigation"
    >
      {/* ── Floating pill ─────────────────────────────────────────────── */}
      <div
        className={cn(
          pillBase,
          scrolled ? pillScrolled : pillDefault,
          /* Desktop: wide pill / Mobile: compact pill */
          "w-[80%] sm:w-full max-w-5xl flex items-center justify-between gap-2 px-4 sm:px-5 h-14 rounded-2xl",
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="FlowPilot AI home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pilot-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold text-ink-primary tracking-tight">
            FlowPilot AI
          </span>
        </Link>

        {/* Desktop center links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Desktop right CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <LandingThemeToggle />
          <Link
            href="/sign-in"
            className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors rounded-xl hover:bg-bg-raised"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors"
          >
            Get early access
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile right: hamburger only (theme toggle lives inside the dropdown) */}
        <button
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl text-ink-secondary hover:bg-bg-raised transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <div className="space-y-[5px]">
              <span className="block h-0.5 w-5 bg-current rounded-full" />
              <span className="block h-0.5 w-5 bg-current rounded-full" />
              <span className="block h-0.5 w-3.5 bg-current rounded-full" />
            </div>
          )}
        </button>
      </div>

      {/* ── Mobile dropdown — Softora-style rounded card ──────────────── */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="md:hidden mt-2 w-full max-w-5xl rounded-2xl border border-border bg-bg-surface/95 backdrop-blur-xl shadow-raised overflow-hidden"
        >
          {/* Nav items */}
          <div className="px-3 py-2">
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors"
              >
                {item}
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </a>
            ))}
            <a
              href="/sign-in"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors"
            >
              Sign in
              <ChevronRight className="h-4 w-4 text-ink-muted" />
            </a>

            {/* Theme toggle row */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl">
              <span className="text-sm font-medium text-ink-secondary">Appearance</span>
              <LandingThemeToggle />
            </div>
          </div>

          {/* CTA at bottom */}
          <div className="px-5 py-4 border-t border-border">
            <Link
              href="/sign-up"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-semibold transition-colors"
            >
              Get early access
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { label: "Recovery time", from: "34d", to: "12d", value: 12, suffix: "d", note: "avg collection" },
  { label: "Early warning", value: 48, suffix: "hr", note: "cash crisis alert" },
  { label: "AI engines", value: 6, suffix: "", note: "intelligence layers" },
  { label: "Less manual work", value: 90, suffix: "%", note: "automation rate" },
];

function Hero() {
  return (
    <div
      id="features"
      className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-4 overflow-hidden"
    >
      {/* Subtle dot grid — very light so page gradient shows through */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(243 75% 50% / 0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto text-center space-y-6">
        {/* Eyebrow */}
        <FadeUp i={0}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pilot-500/30 bg-pilot-500/10 px-3 py-1 text-xs font-medium text-pilot-400">
            <Sparkles className="h-3 w-3" />
            Powered by Seylan Bank APIs
          </span>
        </FadeUp>

        {/* Headline */}
        <FadeUp i={1}>
          <h1 className="font-display text-[2.2rem] sm:text-5xl md:text-6xl font-bold tracking-tighter text-ink-primary leading-[1.08]">
            Your business&apos;s{" "}
            <span className="bg-gradient-to-r from-pilot-400 to-violet-400 bg-clip-text text-transparent">
              financial nervous system.
            </span>
          </h1>
        </FadeUp>

        {/* Sub-headline */}
        <FadeUp i={2}>
          <p className="text-base sm:text-lg text-ink-secondary max-w-2xl mx-auto leading-relaxed">
            FlowPilot AI predicts cash crises{" "}
            <strong className="text-ink-primary font-semibold">22 days early</strong>,
            recovers payments automatically, and gives Sri Lankan SMEs a
            CFO-grade intelligence layer.
          </p>
        </FadeUp>

        {/* CTAs */}
        <FadeUp i={3} className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-semibold transition-all hover:scale-105 shadow-lg shadow-pilot-500/25"
          >
            Start free
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-ink-secondary hover:text-ink-primary hover:border-border-hover text-sm font-medium transition-colors">
            <Play className="h-4 w-4 fill-current" />
            Watch 90-sec demo
          </button>
        </FadeUp>

        {/* Stat tiles */}
        <FadeUp i={4}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-3xl mx-auto">
            {HERO_STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-bg-surface/60 backdrop-blur border border-border rounded-xl p-4 text-center"
              >
                <p className="font-display text-3xl font-bold text-pilot-400 tabular-nums leading-none">
                  <CountUp target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-tertiary font-medium mt-1">
                  {stat.label}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">{stat.note}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 bg-ink-muted rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── SIX ENGINES ─────────────────────────────────────────────────────────────

const ENGINES = [
  {
    icon: TrendingUp,
    name: "Payment Prediction",
    desc: "Predicts which clients will pay late and by how many days.",
    model: "Mistral 7B",
    color: "bg-signal-watch/10 text-signal-watch",
  },
  {
    icon: AlertTriangle,
    name: "Anomaly Detection",
    desc: "Flags expense spikes the moment they deviate from baseline.",
    model: "Rules + AI",
    color: "bg-signal-danger/10 text-signal-danger",
  },
  {
    icon: MessageSquare,
    name: "AI Recovery Engine",
    desc: "Drafts recovery messages in English, Sinhala, and Tamil.",
    model: "LLaMA 3 8B",
    color: "bg-violet-400/10 text-violet-400",
  },
  {
    icon: Shield,
    name: "Trust Scoring",
    desc: "Composite 0-100 reliability score for every client and supplier.",
    model: "Formula",
    color: "bg-pilot-500/10 text-pilot-400",
  },
  {
    icon: Briefcase,
    name: "AI CFO Advisory",
    desc: "Daily financial brief with prioritised recommended actions.",
    model: "Gemma 7B",
    color: "bg-signal-healthy/10 text-signal-healthy",
  },
  {
    icon: Receipt,
    name: "Expense Intelligence",
    desc: "Category-level spend analysis with supplier trust overlay.",
    model: "Mistral 7B",
    color: "bg-sky-400/10 text-sky-400",
  },
];

function Engines() {
  return (
    <Section
      id="engines"
      className="py-24 sm:py-32 px-4 max-w-7xl mx-auto"
    >
      <div className="text-center mb-12">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pilot-400 mb-3">
          The six engines
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight">
          One platform. Six intelligences.
        </h2>
        <p className="text-ink-secondary mt-3 text-base max-w-xl mx-auto">
          Each engine runs independently and feeds into a unified financial health score.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ENGINES.map((engine) => (
          <div
            key={engine.name}
            className="group bg-bg-surface border border-border rounded-2xl p-6 hover:border-pilot-500/40 hover:shadow-lg hover:shadow-pilot-500/5 transition-all"
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl mb-4",
                engine.color,
              )}
            >
              <engine.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-primary mb-1">
              {engine.name}
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed mb-3">
              {engine.desc}
            </p>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {engine.model}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── SEYLAN INTEGRATION ───────────────────────────────────────────────────────

const SEYLAN_APIS = [
  {
    name: "Balance Check",
    desc: "Real-time account balance via secure API.",
    usedFor: "Runway calculation",
  },
  {
    name: "Transaction Retrieval",
    desc: "Full statement history with categorisation.",
    usedFor: "Anomaly detection & burn rate",
  },
  {
    name: "CEFTS Transfer",
    desc: "Instant interbank payment initiation.",
    usedFor: "One-click supplier payments",
  },
  {
    name: "JustPay",
    desc: "Payment link generation for client collections.",
    usedFor: "Recovery Center CTAs",
  },
  {
    name: "SeylanPay QR",
    desc: "Merchant QR code for instant collection.",
    usedFor: "Walk-in & WhatsApp payments",
  },
  {
    name: "Govt Payment (LPOPP)",
    desc: "EPF, ETF, VAT, and IRD payments.",
    usedFor: "Tax deadline automation",
  },
];

function SeylanIntegration() {
  return (
    <Section
      id="demo"
      className="py-24 sm:py-32 bg-bg-surface"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
            <Globe className="h-3.5 w-3.5" />
            Bank-grade integration
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight">
            Built on all six Seylan Bank APIs
          </h2>
          <p className="text-ink-secondary mt-3 text-base max-w-xl mx-auto">
            FlowPilot AI is the only platform with end-to-end Seylan integration — real data, real payments, real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEYLAN_APIS.map((api) => (
            <div
              key={api.name}
              className="bg-bg-base border border-border rounded-xl p-5 hover:border-emerald-400/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-display text-sm font-semibold text-ink-primary">
                  {api.name}
                </h3>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed mb-3">
                {api.desc}
              </p>
              <span className="inline-block text-[10px] font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded">
                Used for: {api.usedFor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── DEMO VIDEO ───────────────────────────────────────────────────────────────

function DemoVideo() {
  return (
    <Section className="py-24 sm:py-32 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-ink-primary">
            See it in action
          </h2>
          <p className="text-ink-secondary mt-2 text-base">
            Watch FlowPilot AI handle a live cash crisis scenario in 90 seconds.
          </p>
        </div>
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-pilot-500/20 via-violet-500/10 to-bg-surface flex items-center justify-center group cursor-pointer hover:from-pilot-500/30 transition-all">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(221_83%_63%/0.15)_0%,transparent_70%)]" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur border border-white/20 group-hover:scale-110 transition-transform">
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            </div>
            <p className="text-sm text-ink-secondary font-medium">
              Demo coming soon
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── PRICING ──────────────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "5,900",
    segment: "Sole traders & micro businesses",
    features: [
      "Up to 3 clients",
      "AI recovery messages (English)",
      "Basic cash flow timeline",
      "Seylan balance sync",
      "Email support",
    ],
    popular: false,
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "9,900",
    segment: "Growing SMEs with active receivables",
    features: [
      "Unlimited clients",
      "Sinhala + Tamil recovery",
      "Full 6-engine suite",
      "CEFTS + JustPay integration",
      "Automation rules (up to 20)",
    ],
    popular: true,
    cta: "Get Growth",
  },
  {
    name: "Business",
    price: "18,900",
    segment: "Established businesses with complex cash flow",
    features: [
      "Everything in Growth",
      "Supplier Trust Mirror",
      "AI CFO daily brief",
      "Unlimited automation rules",
      "Priority support + onboarding",
    ],
    popular: false,
    cta: "Get Business",
  },
  {
    name: "Enterprise",
    price: "44,900",
    segment: "Multi-entity or franchise operations",
    features: [
      "Everything in Business",
      "Multi-entity dashboard",
      "Dedicated AI model fine-tuning",
      "Custom integrations",
      "SLA + dedicated account manager",
    ],
    popular: false,
    cta: "Contact us",
  },
];

function Pricing() {
  return (
    <Section
      id="pricing"
      className="py-24 sm:py-32 bg-bg-surface"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pilot-400 mb-3">
            Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-ink-secondary mt-3 text-base max-w-md mx-auto">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-all",
                tier.popular
                  ? "border-pilot-500 bg-pilot-500/5 shadow-xl shadow-pilot-500/10"
                  : "border-border bg-bg-base hover:border-border-hover",
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-pilot-500 text-white uppercase tracking-wide">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-display text-lg font-semibold text-ink-primary">
                  {tier.name}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">{tier.segment}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-ink-muted">LKR</span>
                  <span className="font-display text-3xl font-bold text-ink-primary tabular-nums">
                    {tier.price}
                  </span>
                  <span className="text-xs text-ink-muted">/mo</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-secondary">
                    <CheckCircle2 className="h-3.5 w-3.5 text-signal-healthy shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={cn(
                  "block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  tier.popular
                    ? "bg-pilot-500 hover:bg-pilot-600 text-white shadow-md shadow-pilot-500/25 hover:scale-105"
                    : "border border-border hover:border-border-hover text-ink-secondary hover:text-ink-primary",
                )}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Scroll-triggered zoom-out reveal ────────────────────────────────────────
// Reusable motion variant: element starts scaled-up + invisible,
// zooms out to normal size as it enters the viewport.

const ZOOM_OUT = {
  hidden:  { opacity: 0, scale: 1.08, y: 24 },
  visible: (delay: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.75, ease: "easeOut" as const, delay },
  }),
};

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    num: "01",
    title: "Connect your Seylan account",
    desc: "One-click authorisation via Seylan Bank's open API. Balance and transactions sync in real time. Setup takes under 3 minutes.",
    accent: "bg-pilot-500/10 border-pilot-500/25",
    numColor: "text-pilot-500/20",
  },
  {
    num: "02",
    title: "AI maps your cash flow",
    desc: "FlowPilot's 6-engine AI analyses transaction patterns, builds a 90-day projection, and assigns risk scores to every client.",
    accent: "bg-signal-ai/10 border-signal-ai/25",
    numColor: "text-signal-ai/20",
  },
  {
    num: "03",
    title: "Get your morning brief",
    desc: "Wake up to a CFO-grade 5-point brief. One action, one risk, one opportunity — delivered every business day.",
    accent: "bg-signal-healthy/10 border-signal-healthy/25",
    numColor: "text-signal-healthy/20",
  },
  {
    num: "04",
    title: "Recover payments on autopilot",
    desc: "Automation rules fire WhatsApp, email and SMS messages in Sinhala, Tamil or English — without you lifting a finger.",
    accent: "bg-signal-watch/10 border-signal-watch/25",
    numColor: "text-signal-watch/20",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32 px-4">
      <div className="max-w-7xl mx-auto">

        <motion.div
          className="text-center mb-16"
          variants={ZOOM_OUT}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          custom={0}
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pilot-400 mb-3">
            How it works
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight">
            From bank account to AI CFO in 3 minutes
          </h2>
          <p className="text-ink-secondary mt-3 max-w-md mx-auto">
            No manual data entry. No spreadsheets. Connect once and let FlowPilot do the work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {HOW_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              variants={ZOOM_OUT}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              custom={i * 0.1}
              className={cn("relative rounded-2xl border p-6", step.accent)}
            >
              <span className={cn("font-display text-5xl font-black leading-none select-none block mb-3", step.numColor)}>
                {step.num}
              </span>
              <h3 className="font-display text-base font-semibold text-ink-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-ink-secondary leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "FlowPilot told me I'd hit a cash crisis 19 days before it happened. I collected two overdue invoices that week. Game-changer.",
    name: "Kasun Perera",
    role: "CEO, Ceylon Tech Solutions",
    initials: "KP",
    color: "bg-pilot-500",
  },
  {
    quote: "The Tamil recovery messages landed better than anything I wrote myself. Clients actually responded and paid.",
    name: "Priya Krishnaswamy",
    role: "Founder, Spice Route Trading",
    initials: "PK",
    color: "bg-signal-ai",
  },
  {
    quote: "My accountant asked why my receivables improved so much. I just showed her the Overdue Radar. She wants it too.",
    name: "Nimal Bandara",
    role: "MD, Bandara Retail Group",
    initials: "NB",
    color: "bg-signal-healthy",
  },
  {
    quote: "Setting up took 4 minutes. The next morning I had my first AI CFO brief. That single brief saved me from a bad supplier deal.",
    name: "Amara Silva",
    role: "Owner, Amara Exports",
    initials: "AS",
    color: "bg-signal-watch",
  },
  {
    quote: "I used to check my Seylan balance 10 times a day out of anxiety. Now I check FlowPilot once. The runway number alone gives me peace.",
    name: "Rajith Fernando",
    role: "Director, Rajith Holdings",
    initials: "RF",
    color: "bg-pilot-600",
  },
  {
    quote: "Automation rules alone saved 6 hours a week of manual follow-up emails. The ROI paid for a year of subscriptions in a month.",
    name: "Dilini Jayawardena",
    role: "CFO, Dilini & Co",
    initials: "DJ",
    color: "bg-signal-danger",
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 px-4 bg-bg-surface">
      <div className="max-w-7xl mx-auto">

        <motion.div
          className="text-center mb-14"
          variants={ZOOM_OUT}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          custom={0}
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pilot-400 mb-3">
            Testimonials
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink-primary tracking-tight">
            Sri Lankan SMEs already winning
          </h2>
          <p className="text-ink-secondary mt-3 max-w-md mx-auto">
            Real results from businesses who replaced spreadsheet anxiety with AI clarity.
          </p>
        </motion.div>

        <div className="columns-1 sm:columns-2 xl:columns-3 gap-5 space-y-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              variants={ZOOM_OUT}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              custom={i * 0.07}
              className="break-inside-avoid rounded-2xl border border-border bg-bg-base p-6 shadow-subtle hover:shadow-card transition-shadow"
            >
              <div className="flex gap-0.5 mb-4">
                {[0,1,2,3,4].map((s) => (
                  <svg key={s} className="h-3.5 w-3.5 fill-signal-watch" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-ink-secondary leading-relaxed mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold shrink-0", t.color)}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary leading-none">{t.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-24 sm:py-32 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          variants={ZOOM_OUT}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          custom={0}
          className="rounded-3xl border border-pilot-500/30 bg-gradient-to-br from-pilot-500/10 via-transparent to-signal-ai/10 px-6 sm:px-12 py-14 sm:py-20 shadow-raised relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(243 75% 65% / 0.18) 0%, transparent 65%)" }}
          />
          <div className="relative">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-pilot-400 mb-4">
              Start today
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-ink-primary tracking-tight mb-4">
              Know your runway.
              <br />
              <span className="text-pilot-400">Before it&apos;s too late.</span>
            </h2>
            <p className="text-ink-secondary text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Join Sri Lankan SMEs who&apos;ve replaced cash flow anxiety with AI clarity. Free 14-day trial. No credit card.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-pilot-500 hover:bg-pilot-600 text-white font-semibold text-base transition-all hover:scale-105 shadow-lg shadow-pilot-500/30"
              >
                Start free trial
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border border-border hover:border-pilot-500/50 text-ink-secondary hover:text-ink-primary text-base font-medium transition-all"
              >
                <Play className="h-4 w-4" />
                Watch demo first
              </Link>
            </div>
            <p className="text-xs text-ink-muted mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Setup in 3 minutes</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Product: ["War Room", "Cash Flow Timeline", "Recovery Center", "AI CFO", "Automation Rules", "Supplier Trust"],
  Company: ["About", "Blog", "Careers", "Press", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
};

function Footer() {
  return (
    <footer className="border-t border-border py-12 sm:py-16 px-4 bg-bg-base">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pilot-500">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-display text-sm font-semibold text-ink-primary">
                FlowPilot AI
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed max-w-[200px]">
              CFO-grade financial intelligence for Sri Lankan SMEs.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-ink-primary uppercase tracking-wider mb-3">
                {group}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ink-muted">
          <p>© {new Date().getFullYear()} FlowPilot AI. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            Built for Cursor Colombo 24H Buildathon 2025
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    /*
     * The gradient is set directly on the scroll container so it paints ON TOP
     * of the base background-color instead of being hidden behind it.
     * Left blob  → indigo/blue (hsl 243) bleeding in from top-left corner
     * Right blob → violet (hsl 270) bleeding in from top-right corner
     * Center     → clean, no tint (same as Softora reference)
     */
    <div
      className="h-screen overflow-y-auto text-ink-primary antialiased"
      style={{
        background: `
          radial-gradient(ellipse 70% 65% at -8% -5%, hsl(243 75% 65% / 0.28) 0%, transparent 62%),
          radial-gradient(ellipse 65% 60% at 108% -5%, hsl(270 70% 65% / 0.22) 0%, transparent 62%),
          radial-gradient(ellipse 45% 30% at 50% 105%, hsl(243 75% 65% / 0.10) 0%, transparent 60%),
          hsl(var(--background))
        `,
      }}
    >
      <Nav />
      <main>
        <Hero />
        <Engines />
        <SeylanIntegration />
        <DemoVideo />
        <Pricing />
        <HowItWorks />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
