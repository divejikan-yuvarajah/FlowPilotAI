"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Globe,
  MessageSquare,
  Play,
  Receipt,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
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

// ─── NAV ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bg-base/90 backdrop-blur-md border-b border-border-subtle shadow-sm"
          : "bg-transparent",
      )}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="FlowPilot AI home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pilot-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold text-ink-primary tracking-tight">
            FlowPilot AI
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden md:flex items-center gap-6">
          {["Features", "Engines", "Pricing", "Demo"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors rounded-lg hover:bg-bg-raised"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors"
          >
            Get early access
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-ink-secondary hover:bg-bg-raised transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1">
              <span className={cn("block h-0.5 w-5 bg-current transition-transform", menuOpen && "rotate-45 translate-y-1.5")} />
              <span className={cn("block h-0.5 w-5 bg-current transition-opacity", menuOpen && "opacity-0")} />
              <span className={cn("block h-0.5 w-5 bg-current transition-transform", menuOpen && "-rotate-45 -translate-y-1.5")} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-bg-base/95 backdrop-blur-md border-b border-border px-4 py-3 space-y-1">
          {["Features", "Engines", "Pricing", "Demo"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link
            href="/sign-in"
            className="block px-3 py-2 rounded-lg text-sm text-ink-secondary hover:bg-bg-raised transition-colors"
          >
            Sign in
          </Link>
        </div>
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
      {/* Background dot grid */}
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(221 83% 63% / 0.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />
      {/* Radial gradient blur */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] -z-10 opacity-30 blur-3xl rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, hsl(221 83% 63%) 0%, hsl(270 70% 60%) 50%, transparent 100%)",
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
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-ink-primary leading-[1.05]">
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
    price: "2,900",
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
    price: "4,900",
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
    price: "9,900",
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
    price: "24,900",
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
    <div className="min-h-screen bg-bg-base text-ink-primary antialiased">
      <Nav />
      <main>
        <Hero />
        <Engines />
        <SeylanIntegration />
        <DemoVideo />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
