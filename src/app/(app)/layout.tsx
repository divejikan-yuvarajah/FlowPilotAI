import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { CrisisBanner } from "@/components/layout/crisis-banner";
import { AssistantMount } from "@/components/ai/assistant-mount";
import { CommandPalette } from "@/components/shell/command-palette";
import { InvoiceRealtimeProvider } from "@/hooks/use-invoice-realtime";
import { ActivityTicker } from "@/components/layout/activity-ticker";

// In a future PR, runwayDays will be fetched from the DB via a server action.
// For the demo, we use 5 to activate the crisis banner.
const DEMO_RUNWAY_DAYS = 5;

"use client";

import { useState, Suspense } from "react";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Fixed-width sidebar — desktop only */}
      <Sidebar />

      {/* Mobile sidebar (Sheet) */}
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Flexible right column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Crisis banner — only visible when runway < 7 days */}
        <CrisisBanner runwayDays={DEMO_RUNWAY_DAYS} />

        {/* Sticky top nav */}
        <TopNav onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Live activity ticker */}
        <ActivityTicker />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
            <Suspense fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-bg-muted rounded-lg" />
                <div className="h-4 w-72 bg-bg-muted rounded-lg" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-bg-muted rounded-xl" />
                  ))}
                </div>
                <div className="h-64 bg-bg-muted rounded-xl" />
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </main>
      </div>

      {/* AI Assistant — floating button + slide-over panel */}
      <AssistantMount />

      {/* Command Palette — ⌘K */}
      <CommandPalette />

      {/* Invoice realtime — fires confetti + toast on paid */}
      <InvoiceRealtimeProvider />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
