import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OverdueClient } from "./overdue-client";
import type { OverdueInvoiceData } from "@/components/invoices/overdue-card";

export default async function OverduePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const today = new Date().toISOString().split("T")[0];

  // Fetch overdue invoices — status='overdue' OR past due date and not paid
  const { data: rows } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount,
      due_date,
      status,
      risk_score,
      escalation_stage,
      justpay_link,
      ai_risk_reasoning,
      last_recovery_message,
      clients (
        id,
        name,
        business_type,
        trust_score,
        trust_trend,
        risk_tier,
        avg_days_to_pay,
        late_payment_count,
        whatsapp_phone
      )
    `)
    .eq("user_id", user.id)
    .or(`status.eq.overdue,and(due_date.lt.${today},status.neq.paid)`)
    .order("risk_score", { ascending: false, nullsFirst: false })
    .order("due_date", { ascending: true });

  const now = Date.now();

  const invoices: OverdueInvoiceData[] = (rows ?? []).map((row) => {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const c = client as {
      id: string; name: string; business_type: string;
      trust_score: number; trust_trend: string; risk_tier: string;
      avg_days_to_pay: number | null; late_payment_count: number;
      whatsapp_phone: string | null;
    } | null;

    const daysOverdue = Math.max(
      0,
      Math.floor((now - new Date(row.due_date as string).getTime()) / 86_400_000),
    );

    return {
      id: row.id as string,
      invoiceNumber: row.invoice_number as string,
      amount: Number(row.amount),
      dueDate: row.due_date as string,
      daysOverdue,
      escalationStage: row.escalation_stage as string | null,
      riskScore: row.risk_score !== null ? Number(row.risk_score) : null,
      justpayLink: row.justpay_link as string | null,
      aiRiskReasoning: row.ai_risk_reasoning as string | null,
      lastRecoveryMessage: row.last_recovery_message as string | null,
      client: {
        id: c?.id ?? "",
        name: c?.name ?? "Unknown",
        businessType: c?.business_type ?? "",
        trustScore: Number(c?.trust_score ?? 50),
        trustTrend: c?.trust_trend ?? "stable",
        riskTier: c?.risk_tier ?? "C",
        avgDaysToPay: c?.avg_days_to_pay !== null ? Number(c?.avg_days_to_pay) : null,
        latePaymentCount: Number(c?.late_payment_count ?? 0),
        whatsappPhone: c?.whatsapp_phone ?? null,
      },
    };
  });

  const overdueTotal = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink-primary">
            Overdue Radar
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Ranked by recovery priority
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-2.5 py-1.5 rounded-lg border border-border bg-bg-subtle text-center">
            <p className="text-[10px] text-ink-muted">Overdue</p>
            <p className="font-mono text-xs sm:text-sm font-semibold text-signal-danger tabular-nums">
              LKR {(overdueTotal/1000).toFixed(0)}k
            </p>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg border border-border bg-bg-subtle text-center">
            <p className="text-[10px] text-ink-muted">Invoices</p>
            <p className="font-display text-sm font-semibold text-ink-primary">
              {invoices.length}
            </p>
          </div>
        </div>
      </div>

      {/* Client component handles filters, sort, cards */}
      <OverdueClient invoices={invoices} />
    </div>
  );
}
