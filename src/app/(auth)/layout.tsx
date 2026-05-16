import { Zap } from "lucide-react";
import Link from "next/link";
import { WarRoomPreview } from "@/components/auth/war-room-preview";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left column: form ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 lg:max-w-[480px] bg-bg-base px-6 py-10 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-auto pb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pilot-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold text-ink-primary tracking-tight">
            FlowPilot AI
          </span>
        </Link>

        {/* Page-specific form content */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {children}
        </div>
      </div>

      {/* ── Right column: visual panel (lg+) ──────────────────────────── */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, hsl(243 75% 65% / 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 70%, hsl(270 70% 65% / 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 60% 20%, hsl(142 71% 45% / 0.08) 0%, transparent 70%),
            hsl(var(--surface))
          `,
        }}
      >
        {/* Logo mark in top-left of panel */}
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

        {/* Animated War Room mini-preview */}
        <WarRoomPreview />
      </div>
    </div>
  );
}
