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
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useStressTestStore } from "@/store/stress-test";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// ─── Balance pill ──────────────────────────────────────────────────────────

function BalancePill() {
  const { balance, isStressActive } = useStressTestStore();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 h-8 rounded-full border transition-colors",
        isStressActive
          ? "border-signal-danger/40 bg-signal-danger/5"
          : "border-border bg-bg-subtle",
      )}
    >
      {isStressActive ? (
        <TrendingDown className="h-3.5 w-3.5 text-signal-danger shrink-0" />
      ) : (
        <TrendingUp className="h-3.5 w-3.5 text-signal-healthy shrink-0" />
      )}
      <AnimatedNumber
        value={balance}
        format={(v) => `LKR ${v.toLocaleString()}`}
        className={cn(
          "font-mono text-sm tabular-nums",
          isStressActive ? "text-signal-danger" : "text-ink-primary",
        )}
      />
    </div>
  );
}

// ─── Command palette ───────────────────────────────────────────────────────

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Command palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
          <Search className="h-4 w-4 text-ink-muted shrink-0" />
          <input
            autoFocus
            placeholder="Search or run a command…"
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none"
          />
        </div>
        <p className="text-sm text-ink-muted text-center py-6">
          Command palette coming soon.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── TopNav ────────────────────────────────────────────────────────────────

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
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

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
            onClick={() => setCmdOpen(true)}
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

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
