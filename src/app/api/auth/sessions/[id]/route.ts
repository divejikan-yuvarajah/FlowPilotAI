import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeJwtPayload } from "@/lib/auth/decode-jwt";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Refuse to revoke the current session via this endpoint — that's what
  // /api/auth/sessions/revoke-others or normal sign-out is for.
  const claims = decodeJwtPayload<{ session_id?: string }>(session.access_token) ?? {};
  if (claims.session_id === sessionId) {
    return NextResponse.json(
      { error: "Use sign-out to end your current session." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("revoke_my_session", {
    session_id: sessionId,
    uid: session.user.id,
  });

  if (error) {
    console.error("[sessions/:id DELETE] rpc error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data !== true) {
    return NextResponse.json(
      { error: "Session not found or already revoked" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
