"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current enrolled state — drives whether we show enroll or unenroll flow. */
  enrolled: boolean;
  /** Verified factor ID (only present when enrolled === true). */
  factorId: string | null;
  onSuccess: () => void;
}

export function TwoFaDialog({ open, onOpenChange, enrolled, factorId, onSuccess }: Props) {
  if (enrolled) {
    return (
      <UnenrollDialog
        open={open}
        onOpenChange={onOpenChange}
        factorId={factorId}
        onSuccess={onSuccess}
      />
    );
  }
  return <EnrollDialog open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />;
}

// ─── Enroll flow ─────────────────────────────────────────────────────────────

function EnrollDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [step, setStep] = useState<"loading" | "scan" | "verify">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrolledOnceRef = useRef(false);

  // Start enrollment when the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (enrolledOnceRef.current) return;
    enrolledOnceRef.current = true;

    let cancelled = false;
    (async () => {
      // Cleanup any stale unverified factor first — Supabase rejects new
      // enrollment if one already exists in 'unverified' state.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = (factors?.totp ?? []).filter((f) => f.status !== "verified");
      await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
      });
      if (cancelled) return;
      if (enrollError || !data) {
        setError(enrollError?.message ?? "Could not start enrollment");
        return;
      }
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("scan");
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Reset when dialog closes.
  useEffect(() => {
    if (open) return;
    enrolledOnceRef.current = false;
    setStep("loading");
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your app");
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    toast.success("Two-factor authentication enabled");
    onSuccess();
    onOpenChange(false);
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Secret copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function handleCancel() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleCancel())}>
      <DialogContent className="bg-bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-pilot-400" />
            Enable two-factor authentication
          </DialogTitle>
          <DialogDescription className="text-ink-secondary">
            Use Google Authenticator, Authy, or any TOTP app to scan the QR code, then enter the 6-digit code.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-pilot-400" />
          </div>
        )}

        {step === "scan" && qr && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div
                className="rounded-lg bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </div>

            {secret && (
              <div className="space-y-1">
                <Label className="text-xs text-ink-muted">Or enter this code manually</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-bg-inset border border-border rounded-md px-3 py-2 text-ink-primary truncate">
                    {secret}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="totp-code">6-digit code</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  className="font-mono tracking-widest text-center text-lg"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <p className="text-xs text-ink-muted leading-relaxed">
                Heads up: 2FA is optional for now. You can still sign in without it until your admin makes it required.
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="bg-pilot-500 hover:bg-pilot-600 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify and enable"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "scan" && !qr && error && (
          <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Unenroll flow ───────────────────────────────────────────────────────────

function UnenrollDialog({
  open,
  onOpenChange,
  factorId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  factorId: string | null;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnenroll() {
    if (!factorId) return;
    setSubmitting(true);
    setError(null);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setSubmitting(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    toast.success("Two-factor authentication disabled");
    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-signal-watch" />
            Disable two-factor authentication?
          </DialogTitle>
          <DialogDescription className="text-ink-secondary">
            Anyone who knows your password will be able to sign in without an authenticator code. You can re-enable 2FA at any time.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "flex items-start gap-3 rounded-lg border border-signal-watch/30 bg-signal-watch/5 p-3 text-sm",
        )}>
          <Smartphone className="h-4 w-4 text-signal-watch shrink-0 mt-0.5" />
          <p className="text-ink-secondary leading-relaxed">
            You may also want to remove the FlowPilot AI entry from your authenticator app.
          </p>
        </div>

        {error && (
          <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Keep 2FA on
          </Button>
          <Button
            type="button"
            onClick={handleUnenroll}
            disabled={submitting || !factorId}
            className="bg-signal-danger hover:bg-signal-danger/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disabling…
              </>
            ) : (
              "Disable 2FA"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
