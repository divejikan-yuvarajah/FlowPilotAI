import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayClient from "./pay-client";

// Public route — no authentication required.
// Customers use this link to pay an invoice by card.

export default async function PayPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const { invoiceId } = params;

  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, amount, invoice_number, status, clients(name)",
    )
    .eq("id", invoiceId)
    .single();

  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PayClient invoice={invoice} />
      </div>
    </div>
  );
}
