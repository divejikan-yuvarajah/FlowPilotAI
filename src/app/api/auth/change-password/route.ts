import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed;

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Detect OAuth-only accounts (e.g. Google sign-in only). For these users we
  // skip the current-password verification because they have never set one.
  const providers =
    (user.app_metadata?.providers as string[] | undefined) ??
    (user.app_metadata?.provider ? [user.app_metadata.provider as string] : []);
  const hasEmailProvider = providers.includes("email");

  if (hasEmailProvider) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 },
      );
    }

    // Verify the current password using a non-persistent supabase-js instance
    // so we don't disturb the live browser session.
    const verifier = createSupabaseJs(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }
  }

  // Update with admin client; merges existing metadata.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    user_metadata: {
      ...user.user_metadata,
      password_changed_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[change-password] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    hadPasswordBefore: hasEmailProvider,
  });
}
