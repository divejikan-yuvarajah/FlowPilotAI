"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./change-password-dialog";
import { TwoFaDialog } from "./twofa-dialog";
import { SessionsList } from "./sessions-list";

// ─── Local primitives ────────────────────────────────────────────────────────
// (Copied from settings/page.tsx so this component is self-contained.)

function Toggle({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
        checked ? "bg-pilot-500" : "bg-bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
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

// ─── Main ────────────────────────────────────────────────────────────────────

export function SecurityClient() {
  const supabase = createClient();
  const router = useRouter();

  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [twoFaDialogOpen, setTwoFaDialogOpen] = useState(false);

  const [isOAuthOnly, setIsOAuthOnly] = useState(false);
  const [pwdChangedAt, setPwdChangedAt] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(true);

  const [twoFaEnrolled, setTwoFaEnrolled] = useState(false);
  const [twoFaFactorId, setTwoFaFactorId] = useState<string | null>(null);
  const [twoFaLoading, setTwoFaLoading] = useState(true);

  const [signingOutAll, setSigningOutAll] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // ── Load user info to detect OAuth-only and read password_changed_at ────
  const refreshUser = useCallback(async () => {
    setPwdLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setPwdLoading(false);
      return;
    }
    const providers =
      (user.app_metadata?.providers as string[] | undefined) ??
      (user.app_metadata?.provider ? [user.app_metadata.provider as string] : []);
    setIsOAuthOnly(providers.length > 0 && !providers.includes("email"));
    setPwdChangedAt(
      (user.user_metadata?.password_changed_at as string | undefined) ?? null,
    );
    setPwdLoading(false);
  }, [supabase]);

  // ── Load MFA factors ─────────────────────────────────────────────────────
  const refreshMfa = useCallback(async () => {
    setTwoFaLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setTwoFaLoading(false);
      return;
    }
    const verified = (data?.totp ?? []).find((f) => f.status === "verified");
    setTwoFaEnrolled(Boolean(verified));
    setTwoFaFactorId(verified?.id ?? null);
    setTwoFaLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refreshUser();
    void refreshMfa();
  }, [refreshUser, refreshMfa]);

  function handleToggleTwoFa() {
    if (twoFaLoading) return;
    setTwoFaDialogOpen(true);
  }

  async function handleSignOutEverywhere() {
    setSigningOutAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSigningOutAll(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out from all devices");
    router.push("/sign-in");
    router.refresh();
  }

  async function handleRevokeOthers() {
    setRevokingOthers(true);
    try {
      const res = await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        revoked?: number;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(
        json.revoked ? `Revoked ${json.revoked} other session${json.revoked === 1 ? "" : "s"}` : "No other sessions to revoke",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke sessions");
    } finally {
      setRevokingOthers(false);
    }
  }

  // Derived "last changed" label.
  const pwdLabel = pwdLoading
    ? "Loading…"
    : isOAuthOnly && !pwdChangedAt
      ? "No password set — sign in with Google"
      : pwdChangedAt
        ? `Last changed ${formatDistanceToNow(new Date(pwdChangedAt), { addSuffix: true })}`
        : "Password is set";

  return (
    <>
      <div className="space-y-4">
        {/* ── Authentication ─────────────────────────────────────────────── */}
        <SectionCard title="Authentication">
          <SettingRow
            label="Two-factor authentication"
            sub="Adds an extra layer of security to your account"
          >
            {twoFaLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />
            ) : (
              <Toggle checked={twoFaEnrolled} onClick={handleToggleTwoFa} />
            )}
          </SettingRow>
          <SettingRow
            label={isOAuthOnly && !pwdChangedAt ? "Password" : "Password"}
            sub={pwdLabel}
          >
            <button
              type="button"
              onClick={() => setPwdDialogOpen(true)}
              className="text-xs text-pilot-400 hover:underline flex items-center gap-1"
            >
              {isOAuthOnly && !pwdChangedAt ? "Set" : "Change"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </SettingRow>
        </SectionCard>

        {/* ── Active sessions ────────────────────────────────────────────── */}
        <SectionCard title="Active sessions">
          <SessionsList />
        </SectionCard>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleRevokeOthers}
            disabled={revokingOthers}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:bg-bg-raised transition-colors disabled:opacity-60"
          >
            {revokingOthers ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign out other devices
          </button>
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={signingOutAll}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-signal-danger/30 text-sm font-medium text-signal-danger hover:bg-signal-danger/5 transition-colors disabled:opacity-60"
          >
            {signingOutAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Sign out everywhere
          </button>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <ChangePasswordDialog
        open={pwdDialogOpen}
        onOpenChange={setPwdDialogOpen}
        isOAuthOnly={isOAuthOnly && !pwdChangedAt}
        onSuccess={refreshUser}
      />
      <TwoFaDialog
        open={twoFaDialogOpen}
        onOpenChange={setTwoFaDialogOpen}
        enrolled={twoFaEnrolled}
        factorId={twoFaFactorId}
        onSuccess={refreshMfa}
      />
    </>
  );
}
