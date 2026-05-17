import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Google (and any Supabase OAuth provider) redirects the user back to this
 * route with a one-time `code`. We exchange it for a session, write the
 * resulting auth cookies onto the *same* redirect response, then send the
 * user into the app.
 *
 * IMPORTANT: Cookies must be written directly onto the NextResponse we
 * return. If we use `cookies().set()` from `next/headers`, those cookies
 * are NOT preserved on a brand-new `NextResponse.redirect(...)` object,
 * which silently breaks the session and bounces the user back to /sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/war-room";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth_failed&reason=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
