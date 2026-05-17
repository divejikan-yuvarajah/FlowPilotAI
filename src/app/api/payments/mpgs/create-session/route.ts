import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/mpgs/client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  invoiceId: z.string().uuid(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, amount, invoice_number, client_id, user_id, status, clients(name)",
    )
    .eq("id", body.invoiceId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid") {
    return NextResponse.json(
      { error: "Invoice already paid" },
      { status: 409 },
    );
  }

  try {
    const result = await createCheckoutSession({
      invoiceId: invoice.id as string,
      amount: parseFloat(invoice.amount as string),
      currency: env.MPGS_CURRENCY,
      description: `Invoice ${invoice.invoice_number as string}`,
      customerEmail: body.customerEmail,
      customerName:
        body.customerName ??
        (Array.isArray(invoice.clients)
          ? (invoice.clients[0] as { name?: string })?.name
          : (invoice.clients as { name?: string } | null)?.name) ??
        undefined,
    });

    // Persist the payment attempt in the payments table
    await supabase.from("payments").insert({
      user_id: invoice.user_id as string,
      method: "justpay",
      invoice_id: invoice.id as string,
      amount: parseFloat(invoice.amount as string),
      status: "initiated",
      external_ref: result.orderId,
      metadata: {
        type: "mpgs",
        sessionId: result.session.id,
        successIndicator: result.successIndicator,
        merchantId: result.merchantId,
      },
    });

    return NextResponse.json({
      sessionId: result.session.id,
      orderId: result.orderId,
      successIndicator: result.successIndicator,
      merchantId: result.merchantId,
    });
  } catch (err) {
    console.error("[mpgs create-session]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment session failed" },
      { status: 502 },
    );
  }
}
