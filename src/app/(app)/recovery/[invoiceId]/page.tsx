import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  RecoveryClient,
  type InvoiceDetail,
  type RecoveryEntry,
} from "./recovery-client";

interface Props {
  params: { invoiceId: string };
}

export default async function RecoveryPage({ params }: Props) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { invoiceId } = params;

  // ── Fetch invoice + client ─────────────────────────────────────────────────
  const { data: row, error } = await supabase
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
        whatsapp_phone,
        email
      )
    `)
    .eq("id", invoiceId)
    .single();

  if (error || !row) notFound();

  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  const c = client as {
    id: string; name: string; business_type: string;
    trust_score: number; trust_trend: string; risk_tier: string;
    whatsapp_phone: string | null; email: string | null;
  } | null;

  if (!c) notFound();

  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - new Date(row.due_date as string).getTime()) / 86_400_000),
  );

  const invoice: InvoiceDetail = {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    amount: Number(row.amount),
    dueDate: row.due_date as string,
    daysOverdue,
    riskScore: row.risk_score !== null ? Number(row.risk_score) : null,
    justpayLink: row.justpay_link as string | null,
    aiRiskReasoning: row.ai_risk_reasoning as string | null,
    lastRecoveryMessage: row.last_recovery_message as string | null,
    escalationStage: row.escalation_stage as string | null,
    client: {
      id: c.id,
      name: c.name,
      businessType: c.business_type ?? "",
      trustScore: Number(c.trust_score),
      trustTrend: c.trust_trend ?? "stable",
      riskTier: c.risk_tier ?? "C",
      whatsappPhone: c.whatsapp_phone ?? null,
      email: c.email ?? null,
    },
  };

  // ── Fetch recovery history from alert_log ──────────────────────────────────
  const { data: logRows } = await supabase
    .from("alert_log")
    .select("id, triggered_at, channel, action_taken, outcome, invoice_id")
    .eq("invoice_id", invoiceId)
    .order("triggered_at", { ascending: false })
    .limit(10);

  const history: RecoveryEntry[] = (logRows ?? []).map((r) => ({
    id: r.id as string,
    triggeredAt: r.triggered_at as string,
    channel: (r.channel as string) ?? "in_app",
    actionTaken: (r.action_taken as string) ?? "Action taken",
    outcome: (r.outcome as string) ?? "pending",
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            Recovery Center
          </h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            {invoice.invoiceNumber} · {invoice.client.name} ·{" "}
            <span className={daysOverdue >= 14 ? "text-signal-critical" : daysOverdue >= 7 ? "text-signal-danger" : "text-signal-watch"}>
              {daysOverdue} days overdue
            </span>
          </p>
        </div>
        <a
          href="/overdue"
          className="text-sm text-ink-muted hover:text-ink-primary transition-colors"
        >
          ← Back to Overdue Radar
        </a>
      </div>

      <RecoveryClient invoice={invoice} history={history} />
    </div>
  );
}
