import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { seylan } from "@/lib/seylan/client";
import type { SeylanBalance } from "@/lib/seylan/client";

// ─── In-memory cache (per-user, 60 s TTL) ────────────────────────────────────

interface CacheEntry {
  balance: SeylanBalance;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(userId: string): SeylanBalance | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.balance;
}

function setCached(userId: string, balance: SeylanBalance): void {
  cache.set(userId, { balance, cachedAt: Date.now() });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  // 1. Authenticate via Supabase
  const supabase = createSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. Check cache
  const cached = getCached(user.id);
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60",
          "X-Cache": "HIT",
        },
      },
    );
  }

  // 3. Fetch from Seylan (simulator or live)
  try {
    const balance = await seylan.getBalance();
    setCached(user.id, balance);

    return NextResponse.json(
      { ...balance, cached: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60",
          "X-Cache": "MISS",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch balance";

    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
