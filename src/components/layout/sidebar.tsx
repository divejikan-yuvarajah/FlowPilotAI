"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  FlaskConical,
  Home,
  List,
  MessageSquare,
  Receipt,
  Send,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  Workflow,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Nav data ──────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  soon?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    title: "Command Center",
    items: [
      { label: "War Room", icon: Home, href: "/war-room" },
      { label: "AI CFO Dashboard", icon: Briefcase, href: "/cfo" },
      { label: "Business Health", icon: Activity, href: "/health" },
    ],
  },
  {
    title: "Cash Flow",
    items: [
      { label: "Cash Flow Timeline", icon: TrendingUp, href: "/timeline" },
      { label: "Runway Simulator", icon: FlaskConical, href: "/simulator" },
      { label: "Cash Flow Calendar", icon: Calendar, href: "/calendar" },
    ],
  },
  {
    title: "Receivables",
    items: [
      { label: "Overdue Radar", icon: AlertCircle, href: "/overdue" },
      { label: "Recovery Center", icon: MessageSquare, href: "/recovery" },
      { label: "Financial Recs", icon: Sparkles, href: "/recommendations", soon: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Expense Intelligence", icon: Receipt, href: "/expenses" },
      { label: "Payments Hub", icon: Send, href: "/payments" },
      { label: "Supplier Trust", icon: Store, href: "/suppliers" },
      { label: "Transaction Feed", icon: List, href: "/transactions" },
      { label: "Automation Rules", icon: Workflow, href: "/automation" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

// ─── Nav item ──────────────────────────────────────────────────────────────

function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  if (item.soon) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm opacity-60 pointer-events-none select-none text-ink-secondary">
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-muted text-ink-muted leading-none">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 py-1.5 rounded-md text-sm transition-colors",
        "px-3",
        isActive
          ? [
              "-ml-px",
              "pl-[calc(0.75rem+1px)]",
              "border-l-2 border-pilot-500",
              "bg-pilot-500/10 text-pilot-400 font-medium",
            ]
          : "text-ink-secondary hover:bg-bg-raised hover:text-ink-primary",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

// ─── Sidebar inner content ─────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-bg-surface overflow-y-auto">
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pilot-500">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display text-base font-semibold text-ink-primary tracking-tight">
            FlowPilot AI
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:bg-bg-raised transition-colors md:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Workspace switcher ─────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 px-2 py-2 rounded-md hover:bg-bg-raised transition-colors text-left">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-pilot-500/20 shrink-0">
                <Building2 className="h-3.5 w-3.5 text-pilot-400" />
              </div>
              <span className="flex-1 text-sm font-medium text-ink-primary truncate">
                My Business
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-muted shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem disabled className="text-xs text-ink-muted">
              Add workspace… (coming soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-4">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-xs uppercase tracking-wider text-ink-tertiary font-medium">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <div key={item.href} onClick={onClose}>
                  <SidebarNavItem item={item} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

// ─── Main sidebar ──────────────────────────────────────────────────────────

export function Sidebar({ onMobileClose }: { onMobileClose?: () => void }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col h-screen border-r border-border-subtle overflow-y-auto">
      <SidebarContent />
    </aside>
  );
}

// ─── Mobile sidebar (Sheet) ────────────────────────────────────────────────

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="left" className="p-0 w-64 border-r border-border-subtle bg-bg-surface">
        <SidebarContent onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
