import { NextResponse } from "next/server";
import { seylan } from "@/lib/seylan/client";
import { env } from "@/lib/env";

export async function GET() {
  const healthy = await seylan.checkHealth();
  return NextResponse.json({
    mode: env.SEYLAN_MODE,
    healthy,
    timestamp: new Date().toISOString(),
  });
}
