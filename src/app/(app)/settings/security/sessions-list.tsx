"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, RefreshCcw, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { parseUserAgent } from "@/lib/auth/parse-user-agent";

interface SessionItem {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  refreshedAt: string | null;
  userAgent: string | null;
  ip: string | null;
  notAfter: string | null;
  isCurrent: boolean;
}

interface ApiResponse {
  currentSessionId: string | null;
  sessions: SessionItem[];
}

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ApiResponse;
      setSessions(json.sessions);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void load();

    pollTimer.current = window.setInterval(() => {
      void load();
    }, 30_000);

    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      toast.success("Session revoked");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke session");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-pilot-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-sm text-signal-danger flex items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="text-pilot-400 hover:underline flex items-center gap-1 text-xs"
        >
          <RefreshCcw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return <p className="py-4 text-sm text-ink-muted">No active sessions.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {sessions.map((s) => {
        const ua = parseUserAgent(s.userAgent);
        const lastActiveIso = s.refreshedAt ?? s.updatedAt ?? s.createdAt;
        const lastActiveLabel =
          mounted && lastActiveIso
            ? formatDistanceToNow(new Date(lastActiveIso), { addSuffix: true })
            : "—";

        return (
          <div key={s.id} className="flex items-center gap-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-muted">
              {ua.isMobile ? (
                <Smartphone className="h-4 w-4 text-ink-muted" />
              ) : (
                <Globe className="h-4 w-4 text-ink-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-primary truncate">
                {ua.browser} on {ua.os}
              </p>
              <p className="text-[11px] text-ink-muted truncate">
                {s.ip ? `${s.ip} · ` : ""}
                {s.isCurrent ? "Now" : lastActiveLabel}
              </p>
            </div>
            {s.isCurrent ? (
              <span className="text-[10px] text-signal-healthy font-medium">Current</span>
            ) : (
              <button
                type="button"
                disabled={revokingId === s.id}
                onClick={() => revoke(s.id)}
                className="text-[11px] text-signal-danger hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
              >
                {revokingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {revokingId === s.id ? "Revoking…" : "Revoke"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
