import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MpgsOrderStatus } from "@/lib/mpgs/types";

async function verifyOrder(
  invoiceId: string,
  orderId: string,
): Promise<MpgsOrderStatus | null> {
  const baseUrl =
    process.env.MPGS_RETURN_URL_BASE ?? "http://localhost:3000";
  try {
    const res = await fetch(
      `${baseUrl}/api/payments/mpgs/verify?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(invoiceId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as MpgsOrderStatus;
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: { invoiceId: string };
  searchParams: { orderId?: string };
}) {
  const { invoiceId } = params;
  const orderId = searchParams.orderId;

  if (!orderId) redirect(`/pay/${invoiceId}`);

  const status = await verifyOrder(invoiceId, orderId);
  const success = status?.result === "SUCCESS";

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <Card className="p-8 w-full max-w-md text-center bg-bg-surface border-border">
        {success ? (
          <>
            <CheckCircle2 className="h-20 w-20 text-signal-healthy mx-auto mb-6" />
            <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">
              Payment successful
            </h1>
            <p className="text-ink-secondary mb-6">
              Thank you! Your payment of LKR{" "}
              {((status?.capturedAmount ?? status?.amount) ?? 0).toLocaleString()} has
              been received.
            </p>
            <div className="text-xs text-ink-tertiary border-t border-border pt-4 mt-4 space-y-1">
              <p>Order ID: {orderId}</p>
              <p>Status: {status?.status ?? "CAPTURED"}</p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-20 w-20 text-signal-watch mx-auto mb-6" />
            <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">
              Payment status pending
            </h1>
            <p className="text-ink-secondary mb-6">
              We&apos;re verifying your payment. You&apos;ll receive a
              confirmation shortly.
            </p>
            <div className="text-xs text-ink-tertiary border-t border-border pt-4">
              Order ID: {orderId}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
