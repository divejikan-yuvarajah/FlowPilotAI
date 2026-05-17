import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeJwtPayload } from "@/lib/auth/decode-jwt";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const claims = decodeJwtPayload<{ session_id?: string }>(session.access_token) ?? {};
  if (!claims.session_id) {
    return NextResponse.json(
      { error: "Could not determine current session" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("revoke_my_other_sessions", {
    current_session_id: claims.session_id,
    uid: session.user.id,
  });

  if (error) {
    console.error("[sessions/revoke-others] rpc error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, revoked: data ?? 0 });
}
