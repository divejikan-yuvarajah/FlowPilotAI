"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCw, Workflow, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Ticker store (module-level so any component can reset lastSync) ─────────

let globalLastSync = Date.now();
const syncListeners = new Set<(t: number) => void>();

export function resetLastSync() {
  globalLastSync = Date.now();
  syncListeners.forEach((l) => l(globalLastSync));
}

// ─── Ticker component ─────────────────────────────────────────────────────────

export function ActivityTicker() {
  const [lastSync, setLastSync] = useState(globalLastSync);
  const [mounted, setMounted] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    setMounted(true);
    setLastSync(Date.now());
  }, []);

  // Subscribe to external sync resets
  useEffect(() => {
    syncListeners.add(setLastSync);
    return () => { syncListeners.delete(setLastSync); };
  }, []);

  // Re-render every 10s to keep "Xs ago" fresh
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const syncAge = mounted
    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    : "just now";

  return (
    <div className="h-7 shrink-0 border-b border-border-subtle bg-bg-surface flex items-center gap-4 px-4 sm:px-8 overflow-hidden text-xs text-ink-secondary">
      {/* Connected status — always visible */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-healthy opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal-healthy" />
        </span>
        <span className="hidden sm:inline">Connected to Seylan Bank</span>
        <span className="sm:hidden">Live</span>
      </div>

      {/* Last sync */}
      <div className="flex items-center gap-1.5 shrink-0">
        <RotateCw className="h-3 w-3 text-ink-tertiary" />
        <span>Sync: <span className="text-ink-primary font-medium">{syncAge}</span></span>
      </div>

      {/* Rules — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <Workflow className="h-3 w-3 text-ink-tertiary" />
        <span>12 rules active</span>
      </div>

      {/* AI cache — push to right, hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1.5 ml-auto shrink-0">
        <Sparkles className="h-3 w-3 text-signal-ai" />
        <span>AI cache active</span>
      </div>
    </div>
  );
}
