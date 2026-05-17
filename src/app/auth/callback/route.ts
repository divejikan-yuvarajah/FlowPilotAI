import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (and any Supabase OAuth provider) redirects the user back to
 * this route with a one-time `code`. We exchange it for a session and
 * then redirect the user into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets the sign-in page pass a post-login destination
  const next = searchParams.get("next") ?? "/war-room";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the app; use absolute URL so it works behind proxies
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to sign-in with an error flag
  return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`);
}
