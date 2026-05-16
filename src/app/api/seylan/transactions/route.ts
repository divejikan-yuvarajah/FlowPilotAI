import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seylan, type SeylanTransaction } from "@/lib/seylan/client";

const cache = new Map<
  string,
  { data: SeylanTransaction[]; expiresAt: number }
>();
const TTL_MS = 30_000;

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = parseInt(sp.get("limit") ?? "50", 10);
  const skipCache = sp.get("refresh") === "1";

  const cacheKey = `${user.id}:${limit}`;
  if (!skipCache) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        transactions: cached.data,
        count: cached.data.length,
        cached: true,
      });
    }
  }

  try {
    const txns = await seylan.listTransactions(user.id, {
      numberOfTransactions: limit,
    });
    cache.set(cacheKey, { data: txns, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json({
      transactions: txns,
      count: txns.length,
      cached: false,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch transactions";
    console.error("Transactions API error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
