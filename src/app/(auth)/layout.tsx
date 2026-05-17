import { Zap } from "lucide-react";
import Link from "next/link";
import { AuthFeatureShowcase } from "@/components/auth/auth-feature-showcase";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-y-auto flex">
      {/* ── Left column: form ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 lg:max-w-[480px] bg-bg-base">

        {/* Logo — centered on mobile, left-aligned on lg */}
        <div className="flex justify-center lg:justify-start px-6 lg:px-12 pt-6 pb-0 lg:pt-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-pilot-500">
              <Zap className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white" />
            </div>
            <span className="font-display text-base lg:text-lg font-semibold text-ink-primary tracking-tight">
              FlowPilot AI
            </span>
          </Link>
        </div>

        {/* Form — centered both axes, compact padding on mobile */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 lg:px-12 py-6">
          <div className="w-full max-w-[340px] sm:max-w-sm lg:max-w-md">
            {children}
          </div>
        </div>
      </div>

      {/* ── Right column: feature showcase (lg+) ──────────────────────── */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, hsl(243 75% 65% / 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 70%, hsl(270 70% 65% / 0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 60% 20%, hsl(142 71% 45% / 0.06) 0%, transparent 70%),
            hsl(var(--surface))
          `,
        }}
      >
        {/* Logo mark */}
        <div className="absolute top-10 left-10 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-pilot-500/20 border border-pilot-500/30">
            <Zap className="h-3.5 w-3.5 text-pilot-400" />
          </div>
          <span className="font-display text-sm font-semibold text-ink-secondary">
            FlowPilot AI
          </span>
        </div>

        {/* Tagline */}
        <div className="mb-8 text-center space-y-1">
          <h2 className="font-display text-2xl font-semibold text-ink-primary">
            Your financial war room.
          </h2>
          <p className="text-sm text-ink-secondary">
            AI-powered cash flow intelligence for Sri Lankan businesses.
          </p>
        </div>

        <AuthFeatureShowcase />
      </div>
    </div>
  );
}
