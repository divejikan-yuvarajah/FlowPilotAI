"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    Checkout: {
      configure: (config: { session: { id: string } }) => void;
      showPaymentPage: () => void;
    };
  }
}

interface InvoiceData {
  id: string;
  amount: string | number;
  invoice_number: string;
  status: string;
  clients: { name: string } | { name: string }[] | null;
  users?: { business_name?: string; owner_name?: string } | null;
}

export default function PayClient({ invoice }: { invoice: InvoiceData }) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scriptUrl =
    process.env.NEXT_PUBLIC_MPGS_CHECKOUT_SCRIPT_URL ??
    "https://test-seylan.mtf.gateway.mastercard.com/static/checkout/checkout.min.js";

  useEffect(() => {
    if (typeof window !== "undefined" && window.Checkout) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Could not load payment system. Please refresh.");
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [scriptUrl]);

  if (invoice.status === "paid") {
    return (
      <Card className="p-8 text-center bg-bg-surface border-border">
        <CheckCircle2 className="h-16 w-16 text-signal-healthy mx-auto mb-4" />
        <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">
          Already paid
        </h1>
        <p className="text-ink-secondary">
          Invoice {invoice.invoice_number} has been settled. Thank you!
        </p>
      </Card>
    );
  }

  const businessName =
    (invoice.users as { business_name?: string } | null | undefined)
      ?.business_name ?? "your invoice";
  const ownerName =
    (invoice.users as { owner_name?: string } | null | undefined)
      ?.owner_name ?? "your supplier";
  const amount = parseFloat(String(invoice.amount));

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/mpgs/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed to start payment");
      }
      const { sessionId } = (await res.json()) as { sessionId: string };
      window.Checkout.configure({ session: { id: sessionId } });
      window.Checkout.showPaymentPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card className="p-8 bg-bg-surface border-border">
      {/* Logo row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded bg-pilot-500 flex items-center justify-center text-white text-xs font-bold">
          FP
        </div>
        <span className="font-display font-semibold text-ink-primary">
          FlowPilot AI
        </span>
      </div>

      <h1 className="text-2xl font-display font-semibold text-ink-primary mt-6">
        Pay {businessName}
      </h1>
      <p className="text-ink-secondary text-sm mt-1">
        Invoice {invoice.invoice_number} from {ownerName}
      </p>

      {/* Amount */}
      <div className="mt-6 p-4 rounded-lg bg-bg-inset border border-border">
        <div className="text-xs uppercase tracking-wider text-ink-tertiary">
          Amount due
        </div>
        <div className="text-3xl font-display font-semibold tracking-tight text-ink-primary mt-1 tabular-nums">
          LKR {amount.toLocaleString()}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded border border-signal-danger/40 bg-signal-danger/10 text-signal-danger text-sm">
          {error}
        </div>
      )}

      <Button
        className="mt-6 w-full bg-pilot-500 hover:bg-pilot-600 text-white"
        size="lg"
        onClick={handlePay}
        disabled={loading || !scriptLoaded}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Opening payment…
          </>
        ) : !scriptLoaded ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay by Card
          </>
        )}
      </Button>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-tertiary">
        <Shield className="h-3 w-3" />
        Secured by Mastercard Payment Gateway · Seylan Bank
      </div>
    </Card>
  );
}
