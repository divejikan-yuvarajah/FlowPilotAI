"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Moon,
  Search,
  Settings,
  Sun,
  TrendingDown,
  TrendingUp,
  User,
  LogOut,
} from "lucide-react";
// Dialog/Header imports no longer needed here (command palette moved to shell)
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
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            dotColor,
          )}
        />
        <span
          className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColor)}
        />
      </span>

      <TrendIcon className={cn("h-3.5 w-3.5 shrink-0", trendColor)} />

      <AnimatedNumber
        value={displayBalance}
        format={(v) => `LKR ${v.toLocaleString()}`}
        className={cn(
          "font-mono text-sm tabular-nums",
          isStressActive ? "text-signal-danger" : "text-ink-primary",
        )}
      />

      {/* LIVE badge */}
      <span className="text-[10px] px-1.5 py-0.5 bg-signal-healthy/20 text-signal-healthy rounded-full font-semibold tracking-wider shrink-0">
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
              <span className="font-mono font-semibold text-ink-primary tabular-nums">
                LKR {(liveData?.balance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Ledger</span>
              <span className="font-mono text-ink-secondary tabular-nums">
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

// CommandPalette is now in src/components/shell/command-palette.tsx
// — opened via commandPaletteEvents.open() from the search button

// ─── TopNav ────────────────────────────────────────────────────────────────

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasNotifications] = useState(true); // static for MVP
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
      <header className="h-16 shrink-0 sticky top-0 z-30 flex items-center px-6 gap-4 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
        {/* Left — page title */}
        <h1 className="font-display font-semibold text-ink-primary text-base truncate">
          {getPageTitle(pathname)}
        </h1>

        {/* Center — command palette trigger */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => commandPaletteEvents.open()}
            className="flex items-center gap-2 px-3 h-8 w-full max-w-xs rounded-md border border-border bg-bg-subtle text-ink-muted text-sm hover:border-border-strong transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left text-xs">Search or run a command…</span>
            <kbd className="hidden sm:inline-flex font-mono text-[10px] opacity-50 bg-bg-muted px-1 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Balance pill */}
          <BalancePill />

          {/* Notifications */}
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-ink-primary hover:bg-bg-raised transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-signal-danger ring-1 ring-bg-base" />
            )}
          </button>

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
