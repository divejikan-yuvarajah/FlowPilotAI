"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  Info,
  RotateCcw,
  Link as LinkIcon,
  QrCode,
  FileText,
  Clock,
  AlertTriangle,
  Plus,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Stub data for non-CEFTS tabs ────────────────────────────────────────────

const JUSTPAY_LINKS = [
  { ref: "INV-2047", recipient: "Nexus Traders",    amount: 185_000, created: "2 days ago", clicks: 3,  status: "active" },
  { ref: "INV-2048", recipient: "Nexus Traders",    amount: 142_000, created: "5 days ago", clicks: 1,  status: "active" },
  { ref: "INV-2051", recipient: "Summit Retail",    amount: 215_000, created: "6 days ago", clicks: 0,  status: "active" },
  { ref: "INV-2053", recipient: "Blue Wave Exports", amount: 425_000, created: "12 days ago", clicks: 7, status: "paid" },
];

const LPOPP_PAYMENTS = [
  { type: "EPF",  period: "Apr 2026", amount: 28_400, due: "May 15, 2026", status: "due_soon" },
  { type: "ETF",  period: "Apr 2026", amount: 7_100,  due: "May 15, 2026", status: "due_soon" },
  { type: "VAT",  period: "Q1 2026",  amount: 63_200, due: "Jun 30, 2026", status: "upcoming" },
  { type: "IRD",  period: "FY 2025",  amount: 124_500, due: "Sep 30, 2026", status: "upcoming" },
];

// ─── JustPay tab ─────────────────────────────────────────────────────────────

function JustPayTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">Payment links sent to clients via WhatsApp or email</p>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors shrink-0">
          <Plus className="h-3.5 w-3.5" /> New link
        </button>
      </div>
      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
        {JUSTPAY_LINKS.map((link) => (
          <div key={link.ref} className="flex items-center gap-4 px-5 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pilot-500/10">
              <LinkIcon className="h-4 w-4 text-pilot-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-primary">{link.ref} — {link.recipient}</p>
              <p className="text-xs text-ink-muted">Created {link.created} · {link.clicks} click{link.clicks !== 1 ? "s" : ""}</p>
            </div>
            <p className="font-mono text-sm font-semibold tabular-nums text-ink-primary">LKR {link.amount.toLocaleString()}</p>
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded",
              link.status === "paid" ? "bg-signal-healthy/10 text-signal-healthy" : "bg-pilot-500/10 text-pilot-400")}>
              {link.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QR Codes tab ─────────────────────────────────────────────────────────────

function QrCodesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">SeylanPay QR codes for walk-in or display payments</p>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors shrink-0">
          <Plus className="h-3.5 w-3.5" /> Generate QR
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Store Counter",   amount: 0,       note: "Any amount", date: "Active" },
          { label: "INV-2047 Fixed",  amount: 185_000, note: "One-time",   date: "2 days ago" },
          { label: "Monthly Rent",    amount: 85_000,  note: "Recurring",  date: "5 days ago" },
        ].map((qr) => (
          <div key={qr.label} className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-3">
            <div className="w-24 h-24 bg-gradient-to-br from-pilot-500/20 to-violet-500/20 rounded-xl border border-border flex items-center justify-center">
              <QrCode className="h-10 w-10 text-ink-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-primary">{qr.label}</p>
              {qr.amount > 0 && <p className="text-xs font-mono text-ink-secondary">LKR {qr.amount.toLocaleString()}</p>}
              <p className="text-[11px] text-ink-muted">{qr.note} · {qr.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LPOPP tab ────────────────────────────────────────────────────────────────

function LpoppTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-secondary">Statutory government payments — EPF, ETF, VAT, IRD</p>
      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
        {LPOPP_PAYMENTS.map((p) => (
          <div key={`${p.type}-${p.period}`} className="flex items-center gap-4 px-5 py-4">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              p.status === "due_soon" ? "bg-signal-danger/10" : "bg-signal-watch/10")}>
              {p.status === "due_soon"
                ? <AlertTriangle className="h-4 w-4 text-signal-danger" />
                : <Clock className="h-4 w-4 text-signal-watch" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-primary">{p.type} — {p.period}</p>
              <p className="text-xs text-ink-muted">Due {p.due}</p>
            </div>
            <p className="font-mono text-sm font-semibold tabular-nums text-ink-primary">LKR {p.amount.toLocaleString()}</p>
            <button className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              p.status === "due_soon"
                ? "bg-signal-danger hover:bg-signal-danger/90 text-white"
                : "border border-border text-ink-secondary hover:bg-bg-raised")}>
              {p.status === "due_soon" ? "Pay now" : "Schedule"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bank dropdown ────────────────────────────────────────────────────────────

const BANKS = [
  { code: "6990", name: "Bank of Ceylon" },
  { code: "6000", name: "Commercial Bank" },
  { code: "6287", name: "People's Bank" },
  { code: "7287", name: "Seylan Bank" },
  { code: "7056", name: "Sampath Bank" },
];

// ─── Defaults from spec (env-mirrored) ────────────────────────────────────────

const DEFAULT_DEST_ACCOUNT = "12345678";
const DEFAULT_DEST_BANK = "6990";

// ─── Card (MPGS) tab ─────────────────────────────────────────────────────────

const CARD_STATS = [
  { label: "Received this month", value: "LKR 0" },
  { label: "Success rate",        value: "—" },
  { label: "Avg transaction",     value: "—" },
];

function CardTab() {
  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        {CARD_STATS.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-ink-muted mb-1">{s.label}</p>
            <p className="text-xl font-display font-semibold text-ink-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table placeholder */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-ink-muted" />
            <p className="text-sm font-medium text-ink-primary">Card payments</p>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pilot-500/10 text-pilot-400 font-semibold tracking-wider">
            MPGS
          </span>
        </div>
        <div className="px-5 py-12 text-center">
          <CreditCard className="h-10 w-10 text-ink-muted/30 mx-auto mb-3" />
          <p className="text-sm text-ink-secondary font-medium">No card payments yet</p>
          <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto">
            Customers can pay invoices by Visa or Mastercard using the link in Recovery Center messages.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">How card payments work</p>
        <div className="space-y-2">
          {[
            "Open Recovery Center for any overdue invoice",
            "Copy the Card payment link from the Payment Links section",
            "Share it in your recovery message — clients pay with any Visa or Mastercard",
            "Payment is verified by Mastercard Payment Gateway · Seylan Bank",
            "Invoice status updates to Paid automatically",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-xs text-ink-secondary">
              <span className="shrink-0 h-4 w-4 rounded-full bg-pilot-500/20 text-pilot-400 flex items-center justify-center text-[9px] font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border text-xs text-ink-muted">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Test card: 5123 4500 0000 0008 · Expiry 05/30 · CVV 123
        </div>
      </div>
    </div>
  );
}

interface CEFTSResult {
  status: "completed" | "failed" | "pending";
  externalRef?: string;
  transactionId?: string;
  approvalNumber?: string;
  completedAt?: string;
  reason?: string;
  code?: string;
  responseDesc?: string;
  error?: string;
}

type PaymentTab = "cefts" | "justpay" | "card" | "qr" | "lpopp";

const PAYMENT_TABS: { key: PaymentTab; label: string; icon: React.ElementType }[] = [
  { key: "cefts",   label: "CEFTS Transfers", icon: Send },
  { key: "justpay", label: "JustPay Links",   icon: LinkIcon },
  { key: "card",    label: "Card (MPGS)",     icon: CreditCard },
  { key: "qr",      label: "QR Codes",        icon: QrCode },
  { key: "lpopp",   label: "Govt Payments",   icon: FileText },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("cefts");
  const [recipientName, setRecipientName] = useState("");
  const [destAccount, setDestAccount] = useState("");
  const [destBank, setDestBank] = useState(DEFAULT_DEST_BANK);
  const [amount, setAmount] = useState("1.00");
  const [reference, setReference] = useState(`FlowPilot-${Date.now()}`);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CEFTSResult | null>(null);

  function useTestAccount() {
    setDestAccount(DEFAULT_DEST_ACCOUNT);
    setDestBank(DEFAULT_DEST_BANK);
  }

  function resetForm() {
    setRecipientName("");
    setDestAccount("");
    setDestBank(DEFAULT_DEST_BANK);
    setAmount("1.00");
    setReference(`FlowPilot-${Date.now()}`);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountNum > 1000) {
      toast.error("For safety, demo amounts must be ≤ LKR 1,000");
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/seylan/cefts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          destinationAccount: destAccount.trim() || undefined,
          destinationBankCode: destBank,
          amount: amountNum,
          reference: reference.trim(),
        }),
      });

      const data = (await res.json()) as CEFTSResult;

      if (!res.ok || data.status === "failed") {
        setResult({
          status: "failed",
          reason: data.reason ?? data.error ?? "Transfer failed",
          code: data.code,
        });
        toast.error(data.reason ?? data.error ?? "CEFTS transfer failed");
        return;
      }

      setResult(data);
      toast.success(`CEFTS transfer to ${recipientName} completed`);

      // Auto-reset after 8s for next demo
      setTimeout(() => {
        setResult(null);
        setReference(`FlowPilot-${Date.now()}`);
      }, 8000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setResult({ status: "failed", reason: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary flex items-center gap-2">
          Payments Hub
          <span className="text-[10px] px-1.5 py-0.5 bg-signal-healthy/20 text-signal-healthy rounded-full font-semibold tracking-wider">
            LIVE
          </span>
        </h1>
        <p className="text-sm text-ink-secondary mt-0.5">
          CEFTS transfers, JustPay links, QR codes, and statutory payments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-bg-muted rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
        {PAYMENT_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start",
              activeTab === key
                ? "bg-surface text-ink-primary shadow-sm"
                : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab: JustPay */}
      {activeTab === "justpay" && <JustPayTab />}
      {/* Tab: Card (MPGS) */}
      {activeTab === "card" && <CardTab />}
      {/* Tab: QR */}
      {activeTab === "qr" && <QrCodesTab />}
      {/* Tab: LPOPP */}
      {activeTab === "lpopp" && <LpoppTab />}

      {/* Tab: CEFTS (existing full implementation) */}
      {activeTab === "cefts" && <CeftsContent
        recipientName={recipientName} setRecipientName={setRecipientName}
        destAccount={destAccount} setDestAccount={setDestAccount}
        destBank={destBank} setDestBank={setDestBank}
        amount={amount} setAmount={setAmount}
        reference={reference} setReference={setReference}
        submitting={submitting} result={result}
        useTestAccount={useTestAccount} resetForm={resetForm}
        handleSubmit={handleSubmit}
      />}
    </div>
  );
}

// ─── CEFTS content (extracted to fix JSX nesting) ─────────────────────────────

function CeftsContent({
  recipientName, setRecipientName, destAccount, setDestAccount,
  destBank, setDestBank, amount, setAmount, reference, setReference,
  submitting, result, useTestAccount, resetForm, handleSubmit,
}: {
  recipientName: string; setRecipientName: (v: string) => void;
  destAccount: string; setDestAccount: (v: string) => void;
  destBank: string; setDestBank: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  reference: string; setReference: (v: string) => void;
  submitting: boolean; result: CEFTSResult | null;
  useTestAccount: () => void; resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-12 gap-6">
        {/* ── LEFT: CEFTS form ─────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Building2 className="h-4 w-4 text-pilot-400" />
              <h2 className="text-sm font-medium text-ink-primary">
                CEFTS Interbank Transfer
              </h2>
            </div>

            {/* Demo tip banner */}
            <div className="px-5 py-3 bg-pilot-500/5 border-b border-pilot-500/20 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-pilot-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-secondary leading-relaxed">
                <span className="text-pilot-400 font-medium">Demo tip:</span>{" "}
                Use LKR 1.00 amounts. This is a real CEFTS transfer to the
                Seylan Bank sandbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Recipient Name */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
                  Recipient Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-pilot-500 focus:outline-none focus:ring-1 focus:ring-pilot-500/30 text-sm text-ink-primary placeholder:text-ink-muted transition-colors disabled:opacity-50"
                  placeholder="e.g. Lanka Logistics"
                />
              </div>

              {/* Destination Account */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
                    Destination Account
                  </label>
                  <button
                    type="button"
                    onClick={useTestAccount}
                    className="text-[10px] text-pilot-500 hover:text-pilot-400 transition-colors"
                  >
                    Use test account →
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-pilot-500 focus:outline-none focus:ring-1 focus:ring-pilot-500/30 text-sm text-ink-primary font-mono placeholder:text-ink-muted transition-colors disabled:opacity-50"
                  placeholder="12345678"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Bank */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
                    Bank
                  </label>
                  <select
                    required
                    value={destBank}
                    onChange={(e) => setDestBank(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-pilot-500 focus:outline-none focus:ring-1 focus:ring-pilot-500/30 text-sm text-ink-primary transition-colors disabled:opacity-50"
                  >
                    {BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
                    Amount (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-pilot-500 focus:outline-none focus:ring-1 focus:ring-pilot-500/30 text-sm text-ink-primary font-mono tabular-nums transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
                  Reference
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-md bg-bg-subtle border border-border focus:border-pilot-500 focus:outline-none focus:ring-1 focus:ring-pilot-500/30 text-sm text-ink-primary font-mono placeholder:text-ink-muted transition-colors disabled:opacity-50"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !recipientName.trim() || !destAccount.trim()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Initiating transfer…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send LKR {parseFloat(amount || "0").toFixed(2)} via CEFTS
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm text-ink-muted hover:text-ink-primary hover:bg-bg-raised transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Result card ───────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-surface border border-border border-dashed rounded-lg p-8 text-center"
              >
                <Send className="h-8 w-8 text-ink-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-ink-muted">
                  Transfer details will appear here
                </p>
                <p className="text-xs text-ink-tertiary mt-1">
                  Fill in the form and submit to initiate a CEFTS transfer
                </p>
              </motion.div>
            ) : result.status === "completed" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                className="bg-surface border border-signal-healthy/40 border-l-4 border-l-signal-healthy rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-4 bg-signal-healthy/5 flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="h-8 w-8 text-signal-healthy" />
                  </motion.div>
                  <div>
                    <p className="font-display text-base font-semibold text-signal-healthy">
                      Transfer initiated
                    </p>
                    <p className="text-xs text-ink-secondary">
                      LKR {parseFloat(amount).toFixed(2)} sent via CEFTS
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3 text-xs">
                  {result.transactionId && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-ink-muted shrink-0">
                        Transaction ID
                      </span>
                      <span className="font-mono text-ink-primary text-right break-all">
                        {result.transactionId}
                      </span>
                    </div>
                  )}
                  {result.approvalNumber && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-ink-muted shrink-0">
                        Approval #
                      </span>
                      <span className="font-mono text-ink-primary">
                        {result.approvalNumber}
                      </span>
                    </div>
                  )}
                  {result.externalRef && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-ink-muted shrink-0">
                        Reference
                      </span>
                      <span className="font-mono text-ink-primary text-right break-all">
                        {result.externalRef}
                      </span>
                    </div>
                  )}
                  {result.completedAt && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-ink-muted shrink-0">Completed</span>
                      <span className="text-ink-primary text-right">
                        {(() => {
                          try {
                            return format(
                              new Date(result.completedAt),
                              "MMM d, h:mm:ss a",
                            );
                          } catch {
                            return result.completedAt;
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  {result.responseDesc && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-ink-muted mb-1">Response</p>
                      <p className="text-ink-secondary text-xs">
                        {result.responseDesc}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-surface border border-signal-danger/40 border-l-4 border-l-signal-danger rounded-lg overflow-hidden"
              >
                <div className="px-5 py-4 bg-signal-danger/5 flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-signal-danger shrink-0" />
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-signal-danger">
                      Transfer failed
                    </p>
                    <p className="text-xs text-ink-secondary truncate">
                      {result.reason ?? "Unknown error"}
                    </p>
                  </div>
                </div>
                {result.code && (
                  <div className="px-5 py-3 text-xs border-t border-border">
                    <p className="text-ink-muted">Error code</p>
                    <p className="font-mono text-ink-primary mt-0.5">
                      {result.code}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
}
