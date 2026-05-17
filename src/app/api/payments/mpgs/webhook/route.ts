import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrderStatus } from "@/lib/mpgs/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderObj = payload?.order as Record<string, unknown> | undefined;
  const orderId = (orderObj?.id as string | undefined) ?? (payload?.orderId as string | undefined);
  if (!orderId) {
    // MPGS expects a 200 even for unrecognised events; return ok so it doesn't retry
    return NextResponse.json({ ok: false, reason: "no orderId" }, { status: 200 });
  }

  try {
    const status = await getOrderStatus(orderId);
    const supabase = createClient();

    if (status.result === "SUCCESS") {
      const { data: payment } = await supabase
        .from("payments")
        .select("invoice_id")
        .eq("external_ref", orderId)
        .single();

      if (payment?.invoice_id) {
        await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_amount: status.capturedAmount,
          })
          .eq("id", payment.invoice_id as string);
      }

      await supabase
        .from("payments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("external_ref", orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mpgs webhook]", err);
    // Always return 200 for webhooks so MPGS doesn't infinitely retry
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
