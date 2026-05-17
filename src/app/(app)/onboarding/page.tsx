"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  "Technology", "Retail", "Manufacturing", "Food & Beverage",
  "Construction", "Healthcare", "Education", "Export / Import",
  "Hospitality", "Professional Services", "Agriculture", "Other",
];

const REVENUE_BANDS = [
  "< 500k LKR/mo",
  "500k – 1M LKR/mo",
  "1M – 5M LKR/mo",
  "5M – 20M LKR/mo",
  "> 20M LKR/mo",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("there");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, string> | undefined;
      const name = meta?.owner_name ?? meta?.full_name ?? data.user?.email?.split("@")[0] ?? "there";
      setUserName(name);
    });
  }, []);

  async function handleFinish() {
    if (!industry || !revenue) {
      toast.error("Please pick an industry and revenue band");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const existing = (user.user_metadata ?? {}) as Record<string, string>;
      await supabase.auth.updateUser({
        data: {
          ...existing,
          industry,
          revenue_band: revenue,
        },
      });
    }
    setSaving(false);
    toast.success("Profile complete! Welcome to FlowPilot AI");
    router.push("/war-room");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pilot-500 shadow-lg shadow-pilot-500/30">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                s < step
                  ? "bg-signal-healthy text-white"
                  : s === step
                    ? "bg-pilot-500 text-white"
                    : "bg-bg-muted text-ink-muted",
              )}>
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 2 && <div className={cn("h-px w-8", step > s ? "bg-signal-healthy" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Welcome ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center space-y-4">
            <h1 className="font-display text-3xl font-bold text-ink-primary">
              Welcome, {userName.split(" ")[0]}! 👋
            </h1>
            <p className="text-ink-secondary max-w-md mx-auto">
              Your account is ready. Let&apos;s take 30 seconds to personalise your
              FlowPilot AI experience so the AI can give you better insights.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pilot-500 hover:bg-pilot-600 text-white font-semibold transition-colors"
              >
                Set up my profile
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <a href="/war-room" className="block text-xs text-ink-muted hover:text-ink-secondary transition-colors mt-2">
              Skip for now →
            </a>
          </div>
        )}

        {/* ── Step 2: Industry + Revenue ───────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-display text-2xl font-bold text-ink-primary">
                Tell us about your business
              </h2>
              <p className="text-sm text-ink-secondary">
                This helps FlowPilot AI tune its analysis to your sector.
              </p>
            </div>

            {/* Industry picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-primary">
                Industry <span className="text-signal-danger">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setIndustry(ind)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left",
                      industry === ind
                        ? "border-pilot-500 bg-pilot-500/10 text-pilot-400"
                        : "border-border text-ink-secondary hover:border-pilot-500/40 hover:bg-bg-raised",
                    )}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Revenue band */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-primary">
                Monthly revenue band <span className="text-signal-danger">*</span>
              </label>
              <div className="space-y-2">
                {REVENUE_BANDS.map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setRevenue(band)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      revenue === band
                        ? "border-pilot-500 bg-pilot-500/10 text-pilot-400"
                        : "border-border text-ink-secondary hover:border-pilot-500/40 hover:bg-bg-raised",
                    )}
                  >
                    {band}
                    {revenue === band && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={!industry || !revenue || saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-pilot-500 hover:bg-pilot-600 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Go to War Room →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
