import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureSeeded } from "@/lib/seed/auto-seed";
import { CrisisBanner } from "@/components/layout/crisis-banner";
import { AppShell } from "@/components/layout/app-shell";

const DEMO_RUNWAY_DAYS = 5;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await ensureSeeded(user.id);

  return (
    <>
      <CrisisBanner runwayDays={DEMO_RUNWAY_DAYS} />
      <AppShell>{children}</AppShell>
    </>
  );
}
