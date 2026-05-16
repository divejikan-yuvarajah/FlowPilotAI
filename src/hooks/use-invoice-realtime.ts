"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInvoiceRealtime() {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("invoice-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "invoices",
        },
        (payload) => {
          const newRecord = payload.new as {
            status?: string;
            invoice_number?: string;
            amount?: number;
          };
          const oldRecord = payload.old as { status?: string };

          // Only fire when status transitions TO 'paid'
          if (
            newRecord.status === "paid" &&
            oldRecord.status !== "paid"
          ) {
            // Confetti burst
            void confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#22C55E", "#1A6AFF", "#A855F7", "#EAB308"],
            });

            // Success toast
            const invNum = newRecord.invoice_number ?? "Invoice";
            const amount = newRecord.amount
              ? `LKR ${Number(newRecord.amount).toLocaleString()}`
              : "";
            toast.success(`🎉 ${invNum} paid${amount ? ` — ${amount} received` : ""}`, {
              duration: 6000,
              description: "Payment confirmed via Seylan Bank",
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}

// ─── Provider component for use in layout ────────────────────────────────────

export function InvoiceRealtimeProvider() {
  useInvoiceRealtime();
  return null;
}

