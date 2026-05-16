"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { ActivityTicker } from "@/components/layout/activity-ticker";

// ── Lazy-loaded overlays ──────────────────────────────────────────────────────
// These are NOT needed on first paint — load them after the page is visible.

// MobileSidebar: sheet only used on <md screens — skip on desktop entirely
const MobileSidebar = dynamic(
  () => import("@/components/layout/sidebar").then((m) => ({ default: m.MobileSidebar })),
  { ssr: false },
);

// AssistantMount: Sparkles button + panel — heavy (Zustand, framer, Sheet)
const AssistantMount = dynamic(
  () => import("@/components/ai/assistant-mount").then((m) => ({ default: m.AssistantMount })),
  { ssr: false },
);

// CommandPalette: cmdk library — only needed on ⌘K press
const CommandPalette = dynamic(
  () => import("@/components/shell/command-palette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

// InvoiceRealtimeProvider: canvas-confetti + Supabase realtime — background feature
const InvoiceRealtimeProvider = dynamic(
  () => import("@/hooks/use-invoice-realtime").then((m) => ({ default: m.InvoiceRealtimeProvider })),
  { ssr: false },
);

const PAGE_SKELETON = (
  <div className="space-y-4 animate-pulse px-1">
    <div className="h-7 w-40 bg-bg-muted rounded-lg" />
    <div className="h-4 w-64 bg-bg-muted rounded" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-bg-muted rounded-xl" />
      ))}
    </div>
    <div className="h-72 bg-bg-muted rounded-xl" />
  </div>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar sheet */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Right column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <ActivityTicker />

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
            <Suspense fallback={PAGE_SKELETON}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Global overlays */}
      <AssistantMount />
      <CommandPalette />
      <InvoiceRealtimeProvider />
    </div>
  );
}
