"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Building2,
  FlaskConical,
  Home,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Workflow,
  Settings,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/store/assistant-store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "War Room",         icon: Home,        href: "/war-room" },
  { label: "AI CFO Dashboard", icon: Briefcase,   href: "/cfo" },
  { label: "Overdue Radar",    icon: AlertCircle, href: "/overdue" },
  { label: "Stress Simulator", icon: FlaskConical,href: "/simulator" },
  { label: "Supplier Trust",   icon: Building2,   href: "/suppliers" },
  { label: "Payments Hub",     icon: Send,        href: "/payments" },
  { label: "Automation Rules", icon: Workflow,    href: "/automation" },
  { label: "Expense Intelligence", icon: Receipt, href: "/expenses" },
  { label: "Business Health",  icon: Activity,    href: "/health" },
  { label: "Settings",         icon: Settings,    href: "/settings" },
];

// ─── Zustand store for open state ────────────────────────────────────────────
// We export a tiny event bus so TopNav search button can open it

type Listener = () => void;
const listeners = new Set<Listener>();
export const commandPaletteEvents = {
  open: () => listeners.forEach((l) => l()),
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

// ─── CommandPalette component ─────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const { setOpen: openAssistant, addMessage } = useAssistantStore();

  const isDev = process.env.NODE_ENV === "development";

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Subscribe to external open events (from TopNav)
  useEffect(() => {
    const unsub = commandPaletteEvents.subscribe(() => setOpen(true));
    return () => unsub();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  function navigate(href: string) {
    close();
    router.push(href);
  }

  async function runAction(key: string, label: string) {
    setLoading(key);
    try {
      if (key === "cfo-brief") {
        const res = await fetch("/api/ai/cfo-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: "today" }) });
        if (res.ok) toast.success("CFO brief regenerated");
        else toast.error("Failed to regenerate brief");
      } else if (key === "refresh-balance") {
        const res = await fetch("/api/seylan/balance", { cache: "no-store" });
        if (res.ok) { const d = await res.json() as { balance: number }; toast.success(`Balance: LKR ${d.balance.toLocaleString()}`); }
        else toast.error("Balance refresh failed");
      } else if (key === "reseed") {
        const res = await fetch("/api/seed", { method: "POST" });
        const d = await res.json() as { alreadySeeded?: boolean; seeded?: boolean };
        if (d.alreadySeeded) toast.info("Already seeded"); else toast.success("Demo data reseeded");
      }
    } catch {
      toast.error(`${label} failed`);
    } finally {
      setLoading(null);
      close();
    }
  }

  function askAssistant(text: string) {
    close();
    openAssistant(true);
    // Small delay to let panel open first
    setTimeout(() => {
      addMessage({ role: "user", content: text });
      // The panel will pick up the new message and auto-send via its streaming logic
    }, 100);
  }

  const showAskItem = query.length > 2;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden bg-bg-surface border border-border shadow-2xl rounded-xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-tertiary [&_[cmdk-group-heading]]:font-medium"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search className="h-4 w-4 text-ink-muted shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or run a command…"
              className="flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[10px] text-ink-muted hover:text-ink-secondary px-1.5 py-0.5 rounded border border-border">
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <Command.List className="max-h-[420px] overflow-y-auto py-2">
            <Command.Empty className="py-12 text-center text-sm text-ink-muted">
              No results found.
            </Command.Empty>

            {/* Ask FlowPilot */}
            {showAskItem && (
              <Command.Group heading="Ask FlowPilot AI">
                <Command.Item
                  value={`ask-${query}`}
                  onSelect={() => askAssistant(query)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer aria-selected:bg-pilot-500/10 rounded-lg mx-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pilot-500 to-violet-600">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary">Ask: &quot;{query}&quot;</p>
                    <p className="text-xs text-ink-muted">Open AI assistant with this query</p>
                  </div>
                </Command.Item>
              </Command.Group>
            )}

            {/* Navigate */}
            <Command.Group heading="Navigate">
              {NAV_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`nav-${item.label}`}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer aria-selected:bg-bg-raised rounded-lg mx-2"
                >
                  <item.icon className="h-4 w-4 text-ink-muted shrink-0" />
                  <span className="text-sm text-ink-secondary">{item.label}</span>
                  <span className="ml-auto text-[10px] text-ink-muted font-mono">{item.href}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions */}
            <Command.Group heading="Actions">
              {[
                { key: "cfo-brief",       label: "Generate today's CFO brief",  icon: Sparkles },
                { key: "refresh-balance", label: "Refresh bank balance",        icon: RefreshCw },
                ...(isDev ? [{ key: "reseed", label: "Reseed demo data", icon: Database }] : []),
              ].map((action) => (
                <Command.Item
                  key={action.key}
                  value={`action-${action.label}`}
                  onSelect={() => void runAction(action.key, action.label)}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer aria-selected:bg-bg-raised rounded-lg mx-2"
                >
                  {loading === action.key
                    ? <Loader2 className="h-4 w-4 text-pilot-400 animate-spin shrink-0" />
                    : <action.icon className="h-4 w-4 text-pilot-400 shrink-0" />}
                  <span className="text-sm text-ink-secondary">{action.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border text-[10px] text-ink-muted">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
            <span className="ml-auto flex items-center gap-1">
              <kbd className="font-mono bg-bg-muted px-1 py-0.5 rounded">⌘K</kbd>
              to open
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
