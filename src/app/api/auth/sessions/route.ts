import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeJwtPayload } from "@/lib/auth/decode-jwt";

export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
  user_agent: string | null;
  ip: string | null;
  not_after: string | null;
}

interface JwtClaims {
  sub?: string;
  session_id?: string;
}

export async function GET() {
  const supabase = createClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const claims = decodeJwtPayload<JwtClaims>(session.access_token) ?? {};
  const currentSessionId = claims.session_id ?? null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_my_sessions", { uid: session.user.id });

  if (error) {
    console.error("[sessions] rpc error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SessionRow[];

  return NextResponse.json({
    currentSessionId,
    sessions: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      refreshedAt: r.refreshed_at,
      userAgent: r.user_agent,
      ip: r.ip,
      notAfter: r.not_after,
      isCurrent: r.id === currentSessionId,
    })),
  });
}
