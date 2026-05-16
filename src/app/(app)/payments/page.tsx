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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

export default function PaymentsPage() {
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
          Initiate CEFTS interbank transfers via Seylan Bank
        </p>
      </div>

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
    </div>
  );
}
