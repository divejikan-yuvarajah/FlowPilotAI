import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AutomationClient, type AutomationRule, type AlertLogEntry } from "./automation-client";

export const metadata = { title: "Automation Rules — FlowPilot AI" };

export default async function AutomationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [rulesResult, alertsResult] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("id, name, priority, condition_json, action_json, is_active, trigger_count, created_at")
      .eq("user_id", user.id)
      .order("priority", { ascending: true }),
    supabase
      .from("alert_log")
      .select("id, rule_name, invoice_id, triggered_at, outcome, action_taken, channel, metadata")
      .order("triggered_at", { ascending: false })
      .limit(20),
  ]);

  const rules: AutomationRule[] = (rulesResult.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    priority: Number(r.priority),
    conditionJson: r.condition_json as Record<string, unknown>,
    actionJson: r.action_json as Record<string, unknown>,
    isActive: Boolean(r.is_active),
    triggerCount: Number(r.trigger_count ?? 0),
    createdAt: r.created_at as string,
  }));

  const alerts: AlertLogEntry[] = (alertsResult.data ?? []).map((a) => ({
    id: a.id as string,
    ruleName: a.rule_name as string,
    invoiceId: a.invoice_id as string | null,
    triggeredAt: a.triggered_at as string,
    outcome: a.outcome as string,
    actionTaken: a.action_taken as string | null,
    channel: a.channel as string | null,
    metadata: a.metadata as Record<string, unknown> | null,
  }));

  const activeCount = rules.filter((r) => r.isActive).length;
  const totalTriggers = rules.reduce((s, r) => s + r.triggerCount, 0);

  return (
    <AutomationClient
      rules={rules}
      alerts={alerts}
      activeCount={activeCount}
      totalTriggers={totalTriggers}
    />
  );
}
