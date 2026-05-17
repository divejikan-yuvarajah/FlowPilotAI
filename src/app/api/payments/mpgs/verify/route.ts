import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrderStatus } from "@/lib/mpgs/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  const invoiceId = req.nextUrl.searchParams.get("invoiceId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const status = await getOrderStatus(orderId);
    const supabase = createClient();

    const paymentStatus =
      status.result === "SUCCESS"
        ? "completed"
        : status.result === "FAILURE"
          ? "failed"
          : "pending";

    await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        completed_at:
          paymentStatus === "completed" ? new Date().toISOString() : null,
        failure_reason: paymentStatus === "failed" ? status.status : null,
        metadata: {
          type: "mpgs",
          orderResult: status.result,
          orderStatus: status.status,
          capturedAmount: status.capturedAmount,
        },
      })
      .eq("external_ref", orderId);

    if (status.result === "SUCCESS" && invoiceId) {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_amount: status.capturedAmount ?? status.amount,
        })
        .eq("id", invoiceId);
    }

    return NextResponse.json(status);
  } catch (err) {
    console.error("[mpgs verify]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 502 },
    );
  }
}
