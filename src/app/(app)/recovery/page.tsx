import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlertCircle, ArrowRight } from "lucide-react";

// ─── If accessed with ?invoiceId= (legacy links), redirect directly ──────────
// ─── Otherwise show a list of overdue invoices to pick from ──────────────────

export default async function RecoveryCenterPage({
  searchParams,
}: {
  searchParams: { invoiceId?: string };
}) {
  // Legacy query-param links
  if (searchParams.invoiceId) {
    redirect(`/recovery/${searchParams.invoiceId}`);
  }

  // Fetch overdue invoices so the user can pick one
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const today = new Date().toISOString().split("T")[0];
  const { data: rows } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, due_date, risk_score, clients(name, risk_tier)")
    .or(`status.eq.overdue,and(due_date.lt.${today},status.neq.paid)`)
    .order("risk_score", { ascending: false, nullsFirst: false })
    .limit(10);

  const now = Date.now();
  const invoices = (rows ?? []).map((r) => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    const c = client as { name?: string; risk_tier?: string } | null;
    return {
      id: r.id as string,
      invoiceNumber: r.invoice_number as string,
      amount: Number(r.amount),
      daysOverdue: Math.max(0, Math.floor((now - new Date(r.due_date as string).getTime()) / 86_400_000)),
      riskScore: r.risk_score !== null ? Number(r.risk_score) : null,
      clientName: c?.name ?? "Unknown",
      riskTier: c?.risk_tier ?? "C",
    };
  });

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Recovery Center</h1>
        <p className="text-sm text-ink-secondary mt-0.5">Select an invoice to draft a recovery message</p>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="h-14 w-14 rounded-full bg-signal-healthy/10 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-signal-healthy" />
          </div>
          <p className="font-display text-lg font-semibold text-ink-primary">No overdue invoices</p>
          <p className="text-sm text-ink-secondary">All clients are paying on time.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/recovery/${inv.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-surface border border-border rounded-lg hover:bg-bg-raised hover:border-pilot-500/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink-primary">{inv.clientName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-bg-muted text-ink-muted font-medium">
                    {inv.riskTier}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{inv.invoiceNumber}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm text-ink-primary tabular-nums">
                  LKR {inv.amount.toLocaleString()}
                </p>
                <p className={`text-xs font-medium tabular-nums ${
                  inv.daysOverdue >= 14 ? "text-signal-critical" : inv.daysOverdue >= 7 ? "text-signal-danger" : "text-signal-watch"
                }`}>
                  {inv.daysOverdue}d overdue
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-pilot-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
