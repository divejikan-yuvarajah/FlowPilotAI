"use client";

import { useState, Suspense } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { ActivityTicker } from "@/components/layout/activity-ticker";
import { AssistantMount } from "@/components/ai/assistant-mount";
import { CommandPalette } from "@/components/shell/command-palette";
import { InvoiceRealtimeProvider } from "@/hooks/use-invoice-realtime";

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

        <main className="flex-1 overflow-y-auto">
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
