"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
  Gavel,
  Handshake,
  Heart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
  AlertCircle,
  Mail,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";
import { useRecoveryStore, type RecoveryLanguage } from "@/store/recovery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  riskScore: number | null;
  justpayLink: string | null;
  aiRiskReasoning: string | null;
  lastRecoveryMessage: string | null;
  escalationStage: string | null;
  client: {
    id: string;
    name: string;
    businessType: string;
    trustScore: number;
    trustTrend: string;
    riskTier: string;
    whatsappPhone: string | null;
    email: string | null;
  };
}

export interface RecoveryEntry {
  id: string;
  triggeredAt: string;
  channel: string;
  actionTaken: string;
  outcome: string;
}

type Stage = 1 | 2 | 3;
type Channel = "whatsapp" | "email" | "sms";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJustPayLink(invoice: InvoiceDetail): string {
  if (invoice.justpayLink) return invoice.justpayLink;
  const token = btoa(invoice.id).replace(/[+=]/g, "");
  return `https://justpay.seylan.lk/pay/${invoice.invoiceNumber}-${token}`;
}

function stageToApiStage(stage: Stage): 1 | 2 | 3 {
  return stage;
}

function sliderToStage(value: number): Stage {
  if (value <= 33) return 1;
  if (value <= 66) return 2;
  return 3;
}

function getRiskColor(score: number | null): string {
  const s = score ?? 50;
  if (s >= 80) return "text-signal-critical";
  if (s >= 60) return "text-signal-danger";
  if (s >= 40) return "text-signal-watch";
  return "text-signal-healthy";
}

function getTierVariant(tier: string): React.ComponentProps<typeof SignalBadge>["variant"] {
  switch (tier) {
    case "A": case "B": return "healthy";
    case "C": return "watch";
    case "D": return "danger";
    default:  return "critical";
  }
}

function outcomeToVariant(outcome: string): React.ComponentProps<typeof SignalBadge>["variant"] {
  switch (outcome) {
    case "success": return "healthy";
    case "no_response": return "watch";
    case "pending": return "watch";
    default: return "neutral";
  }
}

// ─── WhatsApp phone preview ───────────────────────────────────────────────────

function WhatsAppPreview({ message, clientName, language }: { message: string; clientName: string; language: RecoveryLanguage }) {
  const preview = message.slice(0, 300) + (message.length > 300 ? "…" : "");
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex justify-center py-2">
      <div className="bg-[#111] rounded-[2.5rem] p-3 w-[260px] border border-white/10 shadow-2xl">
        {/* Notch */}
        <div className="flex justify-center mb-3">
          <div className="bg-[#1a1a1a] h-4 w-24 rounded-full" />
        </div>
        {/* Screen */}
        <div className="bg-[#111b21] rounded-[1.75rem] overflow-hidden min-h-[220px]">
          {/* WA header */}
          <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-signal-ai/30 flex items-center justify-center text-xs font-bold text-white">
              {clientName[0]}
            </div>
            <div>
              <p className="text-white text-xs font-medium leading-none">{clientName}</p>
              <p className="text-white/40 text-[9px] mt-0.5">WhatsApp Business</p>
            </div>
          </div>
          {/* Message area */}
          <div className="p-3 bg-[#0a1929] min-h-[130px] flex items-end">
            <div className="bg-[#005c4b] rounded-lg rounded-tl-none px-3 py-2 max-w-[220px] ml-auto">
              <p
                className="text-white text-[10px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ fontFamily: language === "si" ? "'Noto Sans Sinhala', sans-serif" : language === "ta" ? "'Noto Sans Tamil', sans-serif" : undefined }}
              >
                {preview || "Generating message…"}
              </p>
              <p className="text-white/40 text-[8px] text-right mt-1">{time} ✓✓</p>
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center mt-3">
          <div className="bg-white/20 h-1 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── SMS phone preview ────────────────────────────────────────────────────────

function SMSPreview({
  message,
  phone,
  language,
}: {
  message: string;
  phone: string | null;
  language: RecoveryLanguage;
}) {
  // SMS messages get truncated by carriers — show realistic 320-char limit warning.
  const preview = message.slice(0, 480) + (message.length > 480 ? "…" : "");
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const segments = Math.ceil((message.length || 1) / 160);

  return (
    <div className="flex justify-center py-2">
      <div className="bg-[#111] rounded-[2.5rem] p-3 w-[260px] border border-white/10 shadow-2xl">
        {/* Notch */}
        <div className="flex justify-center mb-3">
          <div className="bg-[#1a1a1a] h-4 w-24 rounded-full" />
        </div>
        {/* Screen */}
        <div className="bg-white rounded-[1.75rem] overflow-hidden min-h-[220px]">
          {/* iOS-style SMS header */}
          <div className="bg-[#f6f6f6] px-3 py-2.5 flex items-center justify-between border-b border-black/5">
            <span className="text-[#007AFF] text-[10px]">‹ Messages</span>
            <div className="text-center">
              <p className="text-black text-[10px] font-medium leading-none">Text Message</p>
              <p className="text-black/40 text-[8px] mt-0.5">
                {phone ? `+${phone.replace(/\D/g, "")}` : "Recipient"}
              </p>
            </div>
            <span className="text-[#007AFF] text-[10px] opacity-0">‹</span>
          </div>
          {/* Message area */}
          <div className="p-3 bg-white min-h-[140px] flex flex-col justify-end gap-1">
            <p className="text-black/40 text-[8px] text-center mb-1">Today {time}</p>
            <div className="flex justify-end">
              <div className="bg-[#34C759] rounded-2xl rounded-br-sm px-3 py-2 max-w-[200px]">
                <p
                  className="text-white text-[10px] leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    fontFamily:
                      language === "si"
                        ? "'Noto Sans Sinhala', sans-serif"
                        : language === "ta"
                          ? "'Noto Sans Tamil', sans-serif"
                          : undefined,
                  }}
                >
                  {preview || "Generating message…"}
                </p>
              </div>
            </div>
            <p className="text-black/40 text-[8px] text-right mt-1">
              Delivered · {segments} SMS segment{segments === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center mt-3">
          <div className="bg-white/20 h-1 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Recovery history timeline ────────────────────────────────────────────────

function RecoveryHistoryCard({ entries }: { entries: RecoveryEntry[] }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-ink-primary flex items-center gap-2">
          <Clock className="h-4 w-4 text-ink-tertiary" />
          Recovery History
        </h3>
      </div>
      <div className="divide-y divide-border">
        {entries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-muted">No outreach attempts yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-border mt-1.5" />
                <div className="w-px flex-1 bg-border mt-1" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-ink-secondary capitalize">
                    {entry.channel}
                  </span>
                  <SignalBadge variant={outcomeToVariant(entry.outcome)} size="sm">
                    {entry.outcome}
                  </SignalBadge>
                </div>
                <p className="text-xs text-ink-muted truncate">{entry.actionTaken}</p>
                <p className="text-[10px] text-ink-muted">
                  {formatDistanceToNow(new Date(entry.triggeredAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── AI Risk card ─────────────────────────────────────────────────────────────

function AiRiskCard({ invoice }: { invoice: InvoiceDetail }) {
  const [expanded, setExpanded] = useState(false);
  const score = invoice.riskScore ?? 50;
  const defaultProb = Math.round(score * 0.9);

  return (
    <div className="bg-surface border border-border border-l-2 border-l-signal-ai rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-signal-ai flex items-center gap-2">
          ✦ AI Risk Analysis
        </h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={cn("text-3xl font-display font-bold tabular-nums", getRiskColor(score))}>
              {score}
            </p>
            <p className="text-xs text-ink-muted">risk score</p>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="text-center">
            <p className={cn("text-3xl font-display font-bold tabular-nums", getRiskColor(score))}>
              {defaultProb}%
            </p>
            <p className="text-xs text-ink-muted">default prob.</p>
          </div>
        </div>
        {invoice.aiRiskReasoning && (
          <>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {expanded
                ? invoice.aiRiskReasoning
                : invoice.aiRiskReasoning.slice(0, 100) + "…"}
            </p>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "View full reasoning"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

const STAGE_CONFIG = [
  { stage: 1 as Stage, label: "Warm Reminder",  Icon: Heart,     color: "text-signal-healthy", underline: "bg-signal-healthy" },
  { stage: 2 as Stage, label: "Firm + Flexible", Icon: Handshake, color: "text-signal-watch",   underline: "bg-signal-watch"   },
  { stage: 3 as Stage, label: "Formal Demand",   Icon: Gavel,     color: "text-signal-danger",  underline: "bg-signal-danger"  },
] as const;

const CHANNEL_CONFIG = [
  { key: "whatsapp" as Channel, label: "WhatsApp" },
  { key: "email"    as Channel, label: "Email"    },
  { key: "sms"      as Channel, label: "SMS"      },
];

const LANGUAGE_CONFIG: { key: RecoveryLanguage; label: string; native: string; flag: string }[] = [
  { key: "en", label: "English",  native: "English",  flag: "🇬🇧" },
  { key: "si", label: "Sinhala",  native: "සිංහල",    flag: "🇱🇰" },
  { key: "ta", label: "Tamil",    native: "தமிழ்",    flag: "🇱🇰" },
];

function getTextareaFont(language: RecoveryLanguage): string {
  if (language === "si") return "'Noto Sans Sinhala', system-ui, sans-serif";
  if (language === "ta") return "'Noto Sans Tamil', system-ui, sans-serif";
  return "var(--font-sans), system-ui, sans-serif";
}

export function RecoveryClient({
  invoice,
  history,
  cardPaymentLink,
}: {
  invoice: InvoiceDetail;
  history: RecoveryEntry[];
  cardPaymentLink?: string;
}) {
  const { preferredLanguage, setPreferredLanguage } = useRecoveryStore();

  const [stage, setStage] = useState<Stage>(
    invoice.escalationStage === "3" ? 3 : invoice.escalationStage === "2" ? 2 : 1,
  );
  const [language, setLanguage] = useState<RecoveryLanguage>(preferredLanguage);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [message, setMessage] = useState(invoice.lastRecoveryMessage ?? "");
  const [isGenerating, setIsGenerating] = useState(!invoice.lastRecoveryMessage);
  const [toneValue, setToneValue] = useState((stage - 1) * 50);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const justpayLink = getJustPayLink(invoice);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-dim the pulsing after 4 s
  useEffect(() => {
    const t = setTimeout(() => setIsFirstLoad(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Word-by-word typing effect
  async function typeMessage(text: string, signal: AbortSignal) {
    setMessage("");
    const words = text.split(" ");
    let current = "";
    for (const word of words) {
      if (signal.aborted) return;
      current += (current ? " " : "") + word;
      setMessage(current);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  const generateMessage = useCallback(
    async (forStage: Stage, forLanguage: RecoveryLanguage = language) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsGenerating(true);
      setMessage("");

      try {
        const res = await fetch("/api/ai/draft-recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: invoice.id,
            stage: stageToApiStage(forStage),
            language: forLanguage,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          toast.error(err.error ?? "Failed to generate message");
          setIsGenerating(false);
          return;
        }

        const data = (await res.json()) as { message?: string };
        const text = data.message ?? "";

        await typeMessage(text, controller.signal);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          toast.error("Network error — please try again");
        }
      } finally {
        if (!controller.signal.aborted) setIsGenerating(false);
      }
    },
    [invoice.id],
  );

  // Generate on mount if no cached message
  useEffect(() => {
    if (!invoice.lastRecoveryMessage) {
      generateMessage(stage, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLanguageChange(lang: RecoveryLanguage) {
    setLanguage(lang);
    setPreferredLanguage(lang); // persist to Zustand store
    generateMessage(stage, lang);
  }

  function handleStageChange(s: Stage) {
    setStage(s);
    setToneValue((s - 1) * 50);
    generateMessage(s, language);
  }

  function handleSliderRelease() {
    const newStage = sliderToStage(toneValue);
    if (newStage !== stage) {
      setStage(newStage);
      generateMessage(newStage, language);
    }
  }

  async function handleCopyMessage() {
    await navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(justpayLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleWhatsApp() {
    const phone = invoice.client.whatsappPhone?.replace(/\D/g, "") ?? "";
    const text = encodeURIComponent(message);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function handleEmail() {
    const to = invoice.client.email ?? "";
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} — Payment Reminder`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function handleSms() {
    const phone = invoice.client.whatsappPhone?.replace(/\D/g, "") ?? "";
    const body = encodeURIComponent(message);
    // sms: URI works on mobile; on desktop most OSes will offer to open the
    // configured handler (Phone Link on Windows 11, Messages on macOS).
    const url = phone ? `sms:+${phone}?&body=${body}` : `sms:?&body=${body}`;
    window.location.href = url;
  }

  function handleMarkDisputed() {
    toast.success("Marked as disputed — removed from Overdue Radar");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* ── LEFT: Message composer ───────────────────────────────────────── */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Language selector */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 border-b border-border space-y-2">
            <div className="flex gap-1.5 sm:gap-2">
              {LANGUAGE_CONFIG.map(({ key, native, flag }) => (
                <button
                  key={key}
                  onClick={() => handleLanguageChange(key)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 rounded-md border text-xs sm:text-sm font-medium transition-colors",
                    language === key
                      ? "bg-pilot-500/20 border-pilot-500 text-pilot-400"
                      : "bg-bg-subtle border-border text-ink-secondary hover:bg-bg-raised hover:text-ink-primary",
                  )}
                >
                  <span className="text-sm">{flag}</span>
                  <span>{native}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-muted hidden sm:block">
              AI will draft in the selected language. Numbers and technical terms remain in English.
            </p>
          </div>

          {/* Tone tabs */}
          <div className="flex border-b border-border">
            {STAGE_CONFIG.map(({ stage: s, label, Icon, color, underline }) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-colors relative",
                  stage === s ? color : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{label}</span>
                <span className="sm:hidden text-[10px] leading-tight text-center">{label.split(" ")[0]}</span>
                {stage === s && (
                  <motion.div
                    layoutId="tone-underline"
                    className={cn("absolute bottom-0 left-0 right-0 h-0.5", underline)}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="p-4 space-y-3">
            <div className="relative">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-[300px] rounded-lg bg-bg-muted animate-pulse p-4 space-y-3"
                  >
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-3 bg-bg-emphasis/30 rounded"
                        style={{ width: `${65 + (i % 3) * 12}%` }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative"
                  >
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={cn(
                        "w-full min-h-[200px] sm:min-h-[300px] bg-bg-subtle rounded-lg p-3 sm:p-4 text-sm text-ink-primary",
                        "border-l-2 border-l-signal-ai border border-border",
                        "focus:outline-none focus:ring-1 focus:ring-signal-ai/50 resize-none",
                        "leading-relaxed",
                      )}
                      style={{ fontFamily: getTextareaFont(language) }}
                      placeholder="AI-drafted message will appear here…"
                    />
                    {/* Typing cursor */}
                    {message.length > 0 && isGenerating && (
                      <span className="inline-flex items-center gap-[3px] ml-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="inline-block h-1.5 w-1.5 rounded-full bg-signal-ai"
                            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                          />
                        ))}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Char count */}
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{message.length} characters</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-ai" />
                Generated by gpt-4o-mini
              </span>
            </div>

            {/* Tone slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Soft</span>
                <span className="font-medium text-ink-secondary">
                  {STAGE_CONFIG[stage - 1].label}
                </span>
                <span>Firm</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={toneValue}
                onChange={(e) => setToneValue(Number(e.target.value))}
                onPointerUp={handleSliderRelease}
                className="w-full accent-pilot-500 cursor-pointer h-1"
              />
            </div>
          </div>

          {/* Channel tabs */}
          <div className="flex border-t border-border">
            {CHANNEL_CONFIG.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChannel(key)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-medium transition-colors",
                  channel === key
                    ? "text-ink-primary bg-bg-raised"
                    : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Preview */}
          {channel === "whatsapp" && !isGenerating && (
            <div className="border-t border-border bg-bg-subtle py-4">
              <WhatsAppPreview message={message} clientName={invoice.client.name} language={language} />
            </div>
          )}

          {channel === "email" && !isGenerating && (
            <div className="border-t border-border bg-bg-subtle p-4">
              <div className="bg-surface rounded-lg border border-border p-4 space-y-2 text-sm max-w-sm mx-auto">
                <p className="text-xs text-ink-muted">To: {invoice.client.email ?? invoice.client.name.toLowerCase().replace(/\s/g, ".") + "@example.com"}</p>
                <p className="font-medium text-ink-primary text-xs">Subject: Invoice {invoice.invoiceNumber} — Payment Reminder</p>
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-ink-secondary leading-relaxed">{message.slice(0, 150)}…</p>
                </div>
              </div>
            </div>
          )}

          {channel === "sms" && !isGenerating && (
            <div className="border-t border-border bg-bg-subtle py-4">
              <SMSPreview
                message={message}
                phone={invoice.client.whatsappPhone}
                language={language}
              />
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg-subtle flex-wrap">
            <button
              onClick={handleCopyMessage}
              disabled={!message || isGenerating}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary px-3 py-2 rounded-md border border-border hover:bg-bg-raised transition-colors disabled:opacity-40"
            >
              {copiedMsg ? <Check className="h-3.5 w-3.5 text-signal-healthy" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </button>

            {/* Channel-aware send button */}
            <motion.div
              animate={isFirstLoad
                ? { boxShadow: ["0 0 0 0 hsl(243 75% 65% / 0.4)", "0 0 0 8px hsl(243 75% 65% / 0)", "0 0 0 0 hsl(243 75% 65% / 0)"] }
                : { boxShadow: "0 0 0 0 transparent" }
              }
              transition={{ duration: 1.2, repeat: isFirstLoad ? 3 : 0 }}
              className="rounded-lg"
            >
              {channel === "whatsapp" && (
                <button
                  onClick={handleWhatsApp}
                  disabled={!message || isGenerating}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white transition-colors disabled:opacity-40"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open in WhatsApp
                </button>
              )}
              {channel === "email" && (
                <button
                  onClick={handleEmail}
                  disabled={!message || isGenerating}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white transition-colors disabled:opacity-40"
                >
                  <Mail className="h-4 w-4" />
                  Open email client
                </button>
              )}
              {channel === "sms" && (
                <button
                  onClick={handleSms}
                  disabled={!message || isGenerating}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-pilot-500 hover:bg-pilot-600 text-white transition-colors disabled:opacity-40"
                >
                  <Smartphone className="h-4 w-4" />
                  Open SMS app
                </button>
              )}
            </motion.div>

            <button
              onClick={() => generateMessage(stage, language)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary px-3 py-2 rounded-md border border-border hover:bg-bg-raised transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Context panel — shows ABOVE composer on mobile ─────────── */}
      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 lg:self-start order-first lg:order-last">
        {/* Invoice summary */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-ink-primary">Invoice Summary</h3>
          </div>
          <div className="px-4 py-4 space-y-4">
            {/* Client */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink-primary truncate">{invoice.client.name}</p>
                  <SignalBadge variant={getTierVariant(invoice.client.riskTier)} size="sm">
                    {invoice.client.riskTier}
                  </SignalBadge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">{invoice.client.businessType}</p>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="font-mono text-lg sm:text-2xl font-semibold text-ink-primary tabular-nums">
                LKR {invoice.amount.toLocaleString()}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">{invoice.invoiceNumber}</p>
            </div>

            {/* Overdue info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-subtle rounded-lg p-3">
                <p className="text-xs text-ink-muted">Days overdue</p>
                <p className={cn(
                  "text-xl font-display font-bold tabular-nums mt-0.5",
                  invoice.daysOverdue >= 14 ? "text-signal-critical" : invoice.daysOverdue >= 7 ? "text-signal-danger" : "text-signal-watch"
                )}>
                  {invoice.daysOverdue}d
                </p>
              </div>
              <div className="bg-bg-subtle rounded-lg p-3">
                <p className="text-xs text-ink-muted">Due date</p>
                <p className="text-sm font-medium text-ink-primary mt-0.5">
                  {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Payment links */}
            <div className="space-y-2">
              <p className="text-xs text-ink-tertiary uppercase tracking-wider font-medium">Payment Links</p>

              {/* JustPay */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-signal-ai/20 text-signal-ai">JustPay</span>
                  <span className="text-[10px] text-ink-muted">Seylan customers</span>
                </div>
                <div className="flex items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2 border border-border">
                  <p className="flex-1 text-xs font-mono text-ink-secondary truncate">{justpayLink}</p>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-signal-healthy" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <a href={justpayLink} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-ink-muted hover:text-pilot-500 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Card (MPGS) */}
              {cardPaymentLink && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-pilot-500/20 text-pilot-400">Card</span>
                    <span className="text-[10px] text-ink-muted">Visa / Mastercard, worldwide</span>
                  </div>
                  <div className="flex items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2 border border-border">
                    <p className="flex-1 text-xs font-mono text-ink-secondary truncate">{cardPaymentLink}</p>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(cardPaymentLink);
                      }}
                      className="shrink-0 text-ink-muted hover:text-ink-primary transition-colors"
                      title="Copy card payment link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a href={cardPaymentLink} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-ink-muted hover:text-pilot-500 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Risk */}
        <AiRiskCard invoice={invoice} />

        {/* Recovery history */}
        <RecoveryHistoryCard entries={history} />

        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-ink-primary">Quick Actions</h3>
          </div>
          <div className="divide-y divide-border">
            <Link
              href="/payments"
              className="flex items-center gap-3 px-4 py-3 text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors"
            >
              <Send className="h-4 w-4 text-signal-healthy" />
              Generate CEFTS payment request
            </Link>
            <button
              onClick={handleMarkDisputed}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-secondary hover:text-ink-primary hover:bg-bg-raised transition-colors text-left"
            >
              <AlertCircle className="h-4 w-4 text-signal-watch" />
              Mark as disputed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
