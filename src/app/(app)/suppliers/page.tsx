import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SuppliersClient,
  type SupplierCardData,
} from "./suppliers-client";

export const metadata = {
  title: "Supplier Trust Mirror — FlowPilot AI",
};

export default async function SuppliersPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // ── Fetch suppliers with their obligations ─────────────────────────────────
  const { data: rows } = await supabase
    .from("suppliers")
    .select(
      `
      id,
      name,
      business_type,
      payment_reliability_score,
      trend,
      relationship_status,
      notes,
      ai_relationship_insight,
      supplier_obligations (
        id,
        reference,
        amount,
        due_date,
        status,
        paid_at,
        description
      )
    `,
    )
    .order("payment_reliability_score", { ascending: true });

  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 86_400_000);

  const suppliers: SupplierCardData[] = (rows ?? []).map((row) => {
    const obligations = (
      Array.isArray(row.supplier_obligations)
        ? row.supplier_obligations
        : row.supplier_obligations
          ? [row.supplier_obligations]
          : []
    ) as Array<{
      id: string;
      reference: string;
      amount: number;
      due_date: string;
      status: string;
      paid_at: string | null;
      description: string | null;
    }>;

    const pending = obligations.filter((o) => o.status === "pending" || o.status === "overdue");
    const totalOutstanding = pending.reduce((s, o) => s + Number(o.amount), 0);
    const pendingCount = obligations.filter((o) => o.status === "pending").length;
    const overdueCount = obligations.filter((o) => o.status === "overdue").length;

    return {
      id: row.id as string,
      name: row.name as string,
      businessType: row.business_type as string,
      reliabilityScore: Number(row.payment_reliability_score),
      trend: (row.trend as "improving" | "stable" | "worsening") ?? "stable",
      relationshipStatus:
        (row.relationship_status as "active" | "strained" | "critical" | "excellent") ??
        "active",
      notes: row.notes as string | null,
      aiInsight: row.ai_relationship_insight as string | null,
      obligations: obligations
        .sort(
          (a, b) =>
            new Date(a.due_date as string).getTime() -
            new Date(b.due_date as string).getTime(),
        )
        .map((o) => ({
          id: o.id,
          reference: o.reference,
          amount: Number(o.amount),
          dueDate: o.due_date,
          status: o.status as "pending" | "paid" | "overdue",
          paidAt: o.paid_at,
          description: o.description,
        })),
      totalOutstanding,
      pendingCount,
      overdueCount,
    };
  });

  // ── Compute stats ──────────────────────────────────────────────────────────

  const totalOwed = suppliers.reduce((s, sup) => s + sup.totalOutstanding, 0);

  const suppliersAtRisk = suppliers.filter(
    (s) => s.reliabilityScore < 60 || s.trend === "worsening",
  ).length;

  const avgPunctuality =
    suppliers.length > 0
      ? suppliers.reduce((s, sup) => s + sup.reliabilityScore, 0) / suppliers.length
      : 70;

  const upcoming = suppliers.flatMap((s) =>
    s.obligations.filter((o) => {
      if (o.status !== "pending") return false;
      const due = new Date(o.dueDate);
      return due >= today && due <= sevenDaysFromNow;
    }),
  );
  const upcomingCount = upcoming.length;
  const upcomingTotal = upcoming.reduce((s, o) => s + o.amount, 0);

  return (
    <SuppliersClient
      suppliers={suppliers}
      totalOwed={totalOwed}
      suppliersAtRisk={suppliersAtRisk}
      avgPunctuality={avgPunctuality}
      upcomingCount={upcomingCount}
      upcomingTotal={upcomingTotal}
    />
  );
}
