import { CrisisBanner } from "@/components/layout/crisis-banner";
import { AppShell } from "@/components/layout/app-shell";

const DEMO_RUNWAY_DAYS = 5;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrisisBanner runwayDays={DEMO_RUNWAY_DAYS} />
      <AppShell>{children}</AppShell>
    </>
  );
}
