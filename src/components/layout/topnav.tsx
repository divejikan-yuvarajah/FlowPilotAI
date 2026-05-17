"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  TrendingDown,
  TrendingUp,
  User,
  LogOut,
  AlertTriangle,
  Zap,
  CreditCard,
  Activity,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useStressTestStore } from "@/store/stress-test";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { commandPaletteEvents } from "@/components/shell/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Page title map ────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/war-room": "War Room",
  "/cfo": "AI CFO Dashboard",
  "/health": "Business Health",
  "/timeline": "Cash Flow Timeline",
  "/simulator": "Runway Simulator",
  "/calendar": "Cash Flow Calendar",
  "/overdue": "Overdue Radar",
  "/recovery": "Recovery Center",
  "/recommendations": "Financial Recommendations",
  "/expenses": "Expense Intelligence",
  "/payments": "Payments Hub",
  "/transactions": "Transaction Feed",
  "/automation": "Automation Rules",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "FlowPilot AI";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Theme toggle ──────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-raised transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ─── Balance pill (live Seylan data) ───────────────────────────────────────

interface LiveBalance {
  balance: number;
  ledgerBalance: number;
  currency: string;
  accountNumber: string;
  accountHolder?: string;
  asOf: string;
  cached?: boolean;
}

function BalancePill() {
  const { balance: stressBalance, isStressActive } = useStressTestStore();
  const [liveData, setLiveData] = useState<LiveBalance | null>(null);
  const [lastSync, setLastSync] = useState<number>(Date.now());
  const [, forceTick] = useState(0); // re-render every 30s to refresh relative time

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/seylan/balance", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as LiveBalance;
      setLiveData(data);
      setLastSync(Date.now());
    } catch {
      // silent fallback — keep showing last known value
    }
  };

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, 60_000); // poll every 60s
    return () => clearInterval(id);
  }, []);

  // tick every 30s so "Xs ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Stress test overrides live data with simulated value
  const displayBalance = isStressActive
    ? stressBalance
    : (liveData?.balance ?? 0);

  const syncAgeSec = (Date.now() - lastSync) / 1000;
  const dotColor =
    syncAgeSec < 90
      ? "bg-signal-healthy"
      : syncAgeSec < 180
        ? "bg-signal-watch"
        : "bg-signal-danger";

  const TrendIcon = isStressActive ? TrendingDown : TrendingUp;
  const trendColor = isStressActive ? "text-signal-danger" : "text-signal-healthy";

  const pillContent = (
    <div
      className={cn(
        "flex items-center gap-2 px-3 h-8 rounded-full border transition-colors cursor-help",
        isStressActive
          ? "border-signal-danger/40 bg-signal-danger/5"
          : "border-border bg-bg-subtle",
      )}
    >
      {/* Live status dot */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColor)} />
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColor)} />
      </span>

      <TrendIcon className={cn("h-3.5 w-3.5 shrink-0", trendColor)} />

      {/* On mobile: show abbreviated amount */}
      <AnimatedNumber
        value={displayBalance}
        format={(v) => {
          if (typeof window !== "undefined" && window.innerWidth < 640) {
            return `LKR ${(v / 1000).toFixed(0)}k`;
          }
          return `LKR ${v.toLocaleString()}`;
        }}
        className={cn(
          "font-display font-semibold text-xs sm:text-sm tabular-nums tracking-tight",
          isStressActive ? "text-signal-danger" : "text-ink-primary",
        )}
      />

      {/* LIVE badge — hidden on small screens */}
      <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-signal-healthy/20 text-signal-healthy rounded-full font-semibold tracking-wider shrink-0">
        LIVE
      </span>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Balance details">
            {pillContent}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="bg-surface border border-border text-ink-primary p-3 min-w-[240px] shadow-xl"
        >
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
              <span className="text-ink-muted">Available</span>
              <span className="font-display font-semibold text-ink-primary tabular-nums tracking-tight">
                LKR {(liveData?.balance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Ledger</span>
              <span className="font-display font-medium text-ink-secondary tabular-nums tracking-tight">
                LKR {(liveData?.ledgerBalance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Account</span>
              <span className="font-mono text-ink-secondary">
                {liveData?.accountNumber ?? "—"}
              </span>
            </div>
            {liveData?.accountHolder && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-ink-muted">Holder</span>
                <span className="text-ink-secondary truncate max-w-[140px]">
                  {liveData.accountHolder}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
              <span className="text-ink-muted">Last synced</span>
              <span className={cn("font-medium tabular-nums", dotColor.replace("bg-", "text-"))}>
                {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
              </span>
            </div>
            {isStressActive && (
              <p className="text-signal-danger text-[10px] italic">
                Stress test active — displaying simulated balance
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Notification panel ────────────────────────────────────────────────────

interface AlertRow {
  id: string;
  rule_name: string;
  triggered_at: string;
  outcome: string;
  action_taken: string | null;
  metadata: Record<string, unknown> | null;
}

const OUTCOME_ICON: Record<string, React.ElementType> = {
  success: CheckCheck,
  no_response: AlertTriangle,
  overdue: AlertTriangle,
  payment_received: CreditCard,
  anomaly: Activity,
};

const OUTCOME_COLOR: Record<string, string> = {
  success: "text-signal-healthy bg-signal-healthy/10",
  no_response: "text-signal-watch bg-signal-watch/10",
  overdue: "text-signal-danger bg-signal-danger/10",
  payment_received: "text-signal-ai bg-signal-ai/10",
  anomaly: "text-signal-watch bg-signal-watch/10",
};

function NotificationPanel() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    setLoading(true);
    supabase
      .from("alert_log")
      .select("id, rule_name, triggered_at, outcome, action_taken, metadata")
      .order("triggered_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setAlerts((data ?? []) as AlertRow[]);
        setLoading(false);
      });
  }, [open]);

  function markAllRead() {
    const ids = new Set<string>();
    alerts.forEach((a) => ids.add(a.id));
    setReadIds(ids);
    toast.success("All notifications marked as read");
  }

  const unreadCount = mounted ? alerts.filter((a) => !readIds.has(a.id)).length : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-raised transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {mounted && unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-danger opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-danger" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 bg-bg-surface border-border shadow-raised rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ink-muted" />
            <p className="text-sm font-semibold text-ink-primary">Notifications</p>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-signal-danger/10 text-signal-danger">
                {unreadCount}
              </span>
            )}
          </div>
          {alerts.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-pilot-400 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-pilot-500 border-t-transparent" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <Bell className="h-6 w-6 text-ink-muted/30 mx-auto" />
              <p className="text-sm text-ink-muted">No notifications yet</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isRead = readIds.has(alert.id);
              const Icon = OUTCOME_ICON[alert.outcome] ?? Zap;
              const colors = OUTCOME_COLOR[alert.outcome] ?? "text-ink-muted bg-bg-muted";

              return (
                <div
                  key={alert.id}
                  onClick={() => setReadIds((prev) => { const s = new Set(prev); s.add(alert.id); return s; })}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-bg-raised transition-colors",
                    !isRead && "bg-pilot-500/[0.03]",
                  )}
                >
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5", colors)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={cn("text-xs font-medium text-ink-primary leading-snug", !isRead && "font-semibold")}>
                      {alert.rule_name}
                    </p>
                    {alert.action_taken && (
                      <p className="text-[11px] text-ink-secondary truncate">{alert.action_taken}</p>
                    )}
                    <p className="text-[10px] text-ink-muted">
                      {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-pilot-500 shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <a
            href="/automation"
            className="text-xs text-pilot-400 hover:underline flex items-center gap-1"
          >
            View automation rules & full log →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// CommandPalette is now in src/components/shell/command-palette.tsx
// — opened via commandPaletteEvents.open() from the search button

// ─── TopNav ────────────────────────────────────────────────────────────────

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata as Record<string, string> | undefined;
        setUserName(
          meta?.owner_name ??
            meta?.full_name ??
            data.user.email?.split("@")[0] ??
            "User",
        );
      }
    });
  }, []);

  // ⌘K is now handled inside CommandPalette component

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed. Please try again.");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <>
      <header className="h-14 shrink-0 sticky top-0 z-30 flex items-center px-3 sm:px-6 gap-2 sm:gap-3 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
        {/* Mobile: hamburger menu */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-bg-raised transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Left — page title (hidden on very small screens to save space) */}
        <h1 className="hidden sm:block font-display font-semibold text-ink-primary text-sm truncate shrink-0 max-w-[120px] lg:max-w-none">
          {getPageTitle(pathname)}
        </h1>

        {/* Center — command palette trigger */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => commandPaletteEvents.open()}
            className="flex items-center gap-2 px-2.5 h-8 w-full rounded-md border border-border bg-bg-subtle text-ink-muted hover:border-border-strong transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left text-[11px] sm:text-xs truncate">Search…</span>
            <kbd className="hidden md:inline-flex font-mono text-[10px] opacity-50 bg-bg-muted px-1 py-0.5 rounded shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Balance pill — compact on mobile */}
          <BalancePill />

          {/* Notifications */}
          <NotificationPanel />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User avatar + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 rounded-full ring-1 ring-border hover:ring-pilot-500 transition-all"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-pilot-500/20 text-pilot-400">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 border-b border-border mb-1">
                <p className="text-sm font-medium text-ink-primary truncate">
                  {userName}
                </p>
              </div>
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 text-signal-danger focus:text-signal-danger focus:bg-signal-danger/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

    </>
  );
}
