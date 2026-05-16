import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { CrisisBanner } from "@/components/layout/crisis-banner";
import { AssistantMount } from "@/components/ai/assistant-mount";
import { CommandPalette } from "@/components/shell/command-palette";
import { InvoiceRealtimeProvider } from "@/hooks/use-invoice-realtime";
import { ActivityTicker } from "@/components/layout/activity-ticker";

// In a future PR, runwayDays will be fetched from the DB via a server action.
// For the demo, we use 5 to activate the crisis banner.
const DEMO_RUNWAY_DAYS = 5;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Fixed-width sidebar */}
      <Sidebar />

      {/* Flexible right column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Crisis banner — only visible when runway < 7 days */}
        <CrisisBanner runwayDays={DEMO_RUNWAY_DAYS} />

        {/* Sticky top nav */}
        <TopNav />

        {/* Live activity ticker */}
        <ActivityTicker />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-8 py-6">{children}</div>
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
