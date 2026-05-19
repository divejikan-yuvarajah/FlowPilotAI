import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "./(marketing)/landing-client";

/**
 * Root page: show the marketing landing page to unauthenticated visitors.
 * Authenticated users are forwarded straight to the War Room.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/war-room");

  return <LandingPage />;
}
