"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

function getPasswordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

function StrengthBars({ score }: { score: number }) {
  const barColor = (i: number) => {
    if (i >= score) return "bg-border";
    if (score === 1) return "bg-signal-danger";
    if (score === 2 || score === 3) return "bg-signal-watch";
    return "bg-signal-healthy";
  };
  const label =
    score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const labelColor =
    score === 0 ? "" : score === 1 ? "text-signal-danger" : score <= 3 ? "text-signal-watch" : "text-signal-healthy";

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", barColor(i))} />
        ))}
      </div>
      {label && <p className={cn("text-xs font-medium", labelColor)}>{label}</p>}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the user has no current password (Google-only sign-up) — skip the verify input. */
  isOAuthOnly: boolean;
  /** Called after a successful password change so parent can refresh "last changed" label. */
  onSuccess: () => void;
}

export function ChangePasswordDialog({ open, onOpenChange, isOAuthOnly, onSuccess }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = getPasswordScore(next);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowCurrent(false);
    setShowNext(false);
    setError(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!isOAuthOnly && !current) {
      setError("Enter your current password");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: isOAuthOnly ? undefined : current,
          newPassword: next,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not change password");
        return;
      }
      toast.success(isOAuthOnly ? "Password set successfully" : "Password changed successfully");
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink-primary flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-pilot-400" />
            {isOAuthOnly ? "Set a password" : "Change password"}
          </DialogTitle>
          <DialogDescription className="text-ink-secondary">
            {isOAuthOnly
              ? "You signed in with Google. Setting a password lets you also sign in with email."
              : "Enter your current password, then choose a new one."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isOAuthOnly && (
            <div className="space-y-1.5">
              <Label htmlFor="current-pwd">Current password</Label>
              <div className="relative">
                <Input
                  id="current-pwd"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">New password</Label>
            <div className="relative">
              <Input
                id="new-pwd"
                type={showNext ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pr-10"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label={showNext ? "Hide password" : "Show password"}
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {next.length > 0 && <StrengthBars score={score} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Confirm new password</Label>
            <Input
              id="confirm-pwd"
              type={showNext ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-signal-danger bg-signal-danger/10 border border-signal-danger/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !next || !confirm || (!isOAuthOnly && !current)}
              className="bg-pilot-500 hover:bg-pilot-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isOAuthOnly ? "Setting…" : "Changing…"}
                </>
              ) : isOAuthOnly ? (
                "Set password"
              ) : (
                "Change password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
