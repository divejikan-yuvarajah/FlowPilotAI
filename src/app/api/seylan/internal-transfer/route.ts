import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { seylan } from "@/lib/seylan/client";

const RequestSchema = z.object({
  destinationAccount: z.string().min(1).optional(),
  amount: z.number().positive(),
  reference: z.string().min(1).max(16),
  sourceNarration: z.string().max(35).optional(),
  destNarration: z.string().max(35).optional(),
  invoiceId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const result = await seylan.initiateInternalTransfer({
      userId: user.id,
      destinationAccount: input.destinationAccount,
      amount: input.amount,
      reference: input.reference,
      sourceNarration: input.sourceNarration,
      destNarration: input.destNarration,
    });

    const { error: insErr } = await supabase.from("payments").insert({
      user_id: user.id,
      method: "cefts", // reuse method enum; this is intra-bank
      invoice_id: input.invoiceId ?? null,
      amount: input.amount,
      status: result.status === "completed" ? "completed" : "failed",
      external_ref: result.externalRef ?? null,
      failure_reason: result.reason ?? null,
      completed_at: result.completedAt ?? null,
      metadata: {
        type: "internal_transfer",
        response_desc: result.responseDesc,
        code: result.code,
      },
    });
    if (insErr) console.warn("payments insert warning:", insErr.message);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transfer failed";
    console.error("Internal transfer API error:", msg);
    return NextResponse.json(
      { error: msg, status: "failed" },
      { status: 502 },
    );
  }
}
