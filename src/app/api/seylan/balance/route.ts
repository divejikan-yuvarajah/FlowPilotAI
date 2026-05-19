import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seylan, type SeylanBalance } from "@/lib/seylan/client";

// In-memory cache to avoid hammering the sandbox
const cache = new Map<string, { data: SeylanBalance; expiresAt: number }>();
const TTL_MS = 30_000;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cached = cache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { ...cached.data, cached: true },
      { headers: { "X-Cache": "HIT" } },
    );
  }

  try {
    const balance = await seylan.getBalance(user.id);
    cache.set(user.id, { data: balance, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json(
      { ...balance, cached: false },
      { headers: { "X-Cache": "MISS" } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch balance";
    console.error("Balance API error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
