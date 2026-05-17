"use client";

import { useState } from "react";
import {
  Bell, Building2, CheckCircle2, Clock,
  Shield,
  User, Users, Wifi, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SecurityClient } from "./security/security-client";

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-pilot-500" : "bg-bg-muted",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-0",
      )} />
    </button>
  );
}

// ─── Section row ─────────────────────────────────────────────────────────────

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-bg-muted/40">
        <p className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">{title}</p>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "seylan" | "notifications" | "team" | "security";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile",       label: "Profile",          icon: User },
  { key: "seylan",        label: "Seylan Bank",      icon: Building2 },
  { key: "notifications", label: "Notifications",    icon: Bell },
  { key: "team",          label: "Team",             icon: Users },
  { key: "security",      label: "Security",         icon: Shield },
];

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const [name,     setName]     = useState("Divejikan Yuvarajah");
  const [biz,      setBiz]      = useState("Ceylon Tech Solutions");
  const [industry, setIndustry] = useState("Technology");
  const [revenue,  setRevenue]  = useState("1M–5M LKR/mo");
  const [saved,    setSaved]    = useState(false);

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div className="space-y-4">
      <SectionCard title="Business details">
        {[
          { label: "Business name",     value: biz,      set: setBiz },
          { label: "Owner / contact",   value: name,     set: setName },
          { label: "Industry",          value: industry, set: setIndustry },
        ].map(({ label, value, set }) => (
          <div key={label} className="py-3 border-b border-border last:border-0">
            <label className="text-xs text-ink-muted block mb-1">{label}</label>
            <input
              className="w-full bg-bg-inset border border-border rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-pilot-500"
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </div>
        ))}
        <div className="py-3">
          <label className="text-xs text-ink-muted block mb-1">Monthly revenue band</label>
          <select
            className="w-full bg-bg-inset border border-border rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-pilot-500"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          >
            {["< 500k LKR/mo", "500k–1M LKR/mo", "1M–5M LKR/mo", "5M–20M LKR/mo", "> 20M LKR/mo"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </SectionCard>
      <button
        onClick={save}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-semibold transition-all"
      >
        {saved ? <CheckCircle2 className="h-4 w-4" /> : null}
        {saved ? "Saved!" : "Save changes"}
      </button>
    </div>
  );
}

// ─── Seylan tab ───────────────────────────────────────────────────────────────

function SeylanTab() {
  return (
    <div className="space-y-4">
      <SectionCard title="Connection status">
        <SettingRow label="Account connection" sub="Seylan Bank sandbox API">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-signal-healthy animate-pulse" />
            <span className="text-sm text-signal-healthy font-medium">Connected</span>
          </div>
        </SettingRow>
        <SettingRow label="Account number" sub="Masked for security">
          <span className="font-mono text-sm text-ink-primary">****1234</span>
        </SettingRow>
        <SettingRow label="Account holder" sub="Verified">
          <span className="text-sm text-ink-secondary">Ceylon Tech Solutions</span>
        </SettingRow>
        <SettingRow label="Last synced" sub="Balance + transactions">
          <span className="text-sm text-ink-muted flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> 2 min ago
          </span>
        </SettingRow>
      </SectionCard>
      <SectionCard title="API settings">
        <SettingRow label="Sandbox mode" sub="Using Seylan Bank test environment">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-watch/10 text-signal-watch border border-signal-watch/20 uppercase">Sandbox</span>
        </SettingRow>
        <SettingRow label="Auto-refresh interval" sub="Balance polling frequency">
          <span className="text-sm text-ink-secondary">Every 30 seconds</span>
        </SettingRow>
      </SectionCard>
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:bg-bg-raised transition-colors">
        <Wifi className="h-4 w-4" /> Reconnect account
      </button>
    </div>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────

const NOTIF_EVENTS = [
  { label: "Invoice overdue",       sub: "When a client invoice passes due date" },
  { label: "Cash crisis alert",     sub: "Runway drops below 7 days" },
  { label: "Payment received",      sub: "JustPay or CEFTS credit received" },
  { label: "Anomaly detected",      sub: "Expense significantly above baseline" },
  { label: "Supplier payment due",  sub: "Obligation due within 3 days" },
  { label: "Weekly summary",        sub: "Every Monday 8am" },
];

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<string, Record<string, boolean>>>(() => {
    const s: Record<string, Record<string, boolean>> = {};
    NOTIF_EVENTS.forEach((e) => {
      s[e.label] = { email: true, sms: false, inApp: true };
    });
    return s;
  });

  function toggle(event: string, channel: string) {
    setSettings((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event][channel] },
    }));
  }

  return (
    <SectionCard title="Notification preferences">
      <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 py-2 border-b border-border">
        <span className="text-xs text-ink-muted">Event</span>
        {["Email", "SMS", "In-app"].map((c) => (
          <span key={c} className="text-[10px] text-ink-muted text-center uppercase tracking-wide">{c}</span>
        ))}
      </div>
      {NOTIF_EVENTS.map((ev) => (
        <div key={ev.label} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center py-3 border-b border-border last:border-0">
          <div>
            <p className="text-sm font-medium text-ink-primary">{ev.label}</p>
            <p className="text-[11px] text-ink-muted">{ev.sub}</p>
          </div>
          {(["email", "sms", "inApp"] as const).map((ch) => (
            <div key={ch} className="flex justify-center">
              <Toggle checked={settings[ev.label][ch]} onChange={() => toggle(ev.label, ch)} />
            </div>
          ))}
        </div>
      ))}
    </SectionCard>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  return (
    <div className="space-y-4">
      <SectionCard title="Team members">
        <div className="flex items-center gap-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pilot-500/20">
            <User className="h-4 w-4 text-pilot-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-primary">Divejikan Yuvarajah</p>
            <p className="text-xs text-ink-muted">divejikan@ceylontech.lk · Owner</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-pilot-500/10 text-pilot-400 border border-pilot-500/20">Admin</span>
        </div>
      </SectionCard>
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-ink-muted hover:border-pilot-500/40 hover:text-pilot-400 transition-colors w-full justify-center">
        <Plus className="h-4 w-4" /> Invite team member
      </button>
      <p className="text-xs text-ink-muted text-center">Multi-member teams available on Growth plan and above</p>
    </div>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────
// Real implementation lives in ./security/security-client.tsx — backed by
// Supabase Auth (password change, MFA enrollment, auth.sessions list).
const SecurityTab = SecurityClient;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    profile:       <ProfileTab />,
    seylan:        <SeylanTab />,
    notifications: <NotificationsTab />,
    team:          <TeamTab />,
    security:      <SecurityTab />,
  };

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Settings</h1>
        <p className="text-sm text-ink-secondary mt-1">Manage your account, integrations, and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
              tab === key
                ? "border-pilot-500 text-pilot-400"
                : "border-transparent text-ink-muted hover:text-ink-secondary",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {TAB_CONTENT[tab]}
    </div>
  );
}
