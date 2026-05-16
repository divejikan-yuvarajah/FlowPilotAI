"use client";

import { useState } from "react";
import {
  addDays, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, format, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Stub cash flow data ─────────────────────────────────────────────────────

function buildCashFlowMap(): Map<string, { net: number; events: Array<{ label: string; amount: number; type: "in" | "out" }> }> {
  const map = new Map<string, { net: number; events: Array<{ label: string; amount: number; type: "in" | "out" }> }>();
  const today = new Date();

  const seed = [
    // Inflows
    { offset: -25, label: "Blue Wave Exports — INV-2053", amount: 425_000, type: "in" as const },
    { offset: -18, label: "Summit Retail — partial",      amount: 88_000,  type: "in" as const },
    { offset: -10, label: "Blue Wave Exports — advance",  amount: 150_000, type: "in" as const },
    { offset: 5,   label: "Summit Retail — INV-2052",     amount: 88_000,  type: "in" as const },
    { offset: 15,  label: "Blue Wave Exports — INV-2054", amount: 380_000, type: "in" as const },
    // Outflows
    { offset: -28, label: "Janashakthi Distributors",  amount: -338_000, type: "out" as const },
    { offset: -20, label: "Salary payroll Apr",         amount: -280_000, type: "out" as const },
    { offset: -15, label: "Lanka Logistics",            amount: -63_200,  type: "out" as const },
    { offset: -8,  label: "Dialog Axiata",              amount: -12_450,  type: "out" as const },
    { offset: -5,  label: "Office Pro Stationery",      amount: -18_700,  type: "out" as const },
    { offset: 3,   label: "Ceylon Inventory Co",        amount: -142_500, type: "out" as const },
    { offset: 7,   label: "Lanka Logistics OBL-0098",   amount: -72_400,  type: "out" as const },
    { offset: 12,  label: "Salary payroll May",         amount: -280_000, type: "out" as const },
  ];

  for (const item of seed) {
    const d = addDays(today, item.offset);
    const key = format(d, "yyyy-MM-dd");
    const existing = map.get(key) ?? { net: 0, events: [] };
    existing.net += item.amount;
    existing.events.push({ label: item.label, amount: Math.abs(item.amount), type: item.type });
    map.set(key, existing);
  }

  return map;
}

const CASH_FLOW = buildCashFlowMap();

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  date,
  currentMonth,
  onSelect,
  selected,
}: {
  date: Date;
  currentMonth: Date;
  onSelect: (d: Date) => void;
  selected: boolean;
}) {
  const key = format(date, "yyyy-MM-dd");
  const cf = CASH_FLOW.get(key);
  const inMonth = isSameMonth(date, currentMonth);
  const todayFlag = isToday(date);

  const bgClass = !inMonth
    ? ""
    : cf
      ? cf.net > 0
        ? "bg-signal-healthy/10"
        : cf.net < 0
          ? "bg-signal-danger/10"
          : ""
      : "";

  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        "relative h-14 sm:h-16 flex flex-col items-start justify-start p-1.5 rounded-lg border transition-all text-left",
        inMonth ? "border-border hover:border-border-hover" : "border-transparent opacity-30",
        selected && "border-pilot-500 ring-1 ring-pilot-500/30",
        todayFlag && !selected && "border-pilot-500/40",
        bgClass,
      )}
    >
      <span className={cn(
        "text-xs font-medium leading-none",
        todayFlag ? "text-pilot-400 font-bold" : inMonth ? "text-ink-secondary" : "text-ink-muted",
      )}>
        {format(date, "d")}
      </span>
      {cf && inMonth && (
        <span className={cn(
          "text-[9px] font-mono mt-auto truncate w-full",
          cf.net > 0 ? "text-signal-healthy" : "text-signal-danger",
        )}>
          {cf.net > 0 ? "+" : ""}
          {(cf.net / 1000).toFixed(0)}k
        </span>
      )}
    </button>
  );
}

// ─── Side drawer ─────────────────────────────────────────────────────────────

function DayDrawer({ date, onClose }: { date: Date; onClose: () => void }) {
  const key = format(date, "yyyy-MM-dd");
  const cf = CASH_FLOW.get(key);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-bg-surface border-l border-border shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="font-display font-semibold text-ink-primary">{format(date, "MMMM d, yyyy")}</p>
          <p className="text-xs text-ink-muted">{isToday(date) ? "Today" : format(date, "EEEE")}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-raised transition-colors">
          <X className="h-4 w-4 text-ink-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!cf ? (
          <p className="text-sm text-ink-muted text-center py-8">No transactions on this day</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted pb-2 border-b border-border">
              <span>Net cash flow</span>
              <span className={cn("font-mono font-bold", cf.net >= 0 ? "text-signal-healthy" : "text-signal-danger")}>
                {cf.net >= 0 ? "+" : ""}LKR {Math.abs(cf.net).toLocaleString()}
              </span>
            </div>
            {cf.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  ev.type === "in" ? "bg-signal-healthy/10" : "bg-signal-danger/10")}>
                  {ev.type === "in"
                    ? <ArrowDownLeft className="h-3.5 w-3.5 text-signal-healthy" />
                    : <ArrowUpRight className="h-3.5 w-3.5 text-signal-danger" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink-primary truncate">{ev.label}</p>
                </div>
                <p className={cn("font-mono text-xs font-semibold shrink-0", ev.type === "in" ? "text-signal-healthy" : "text-signal-danger")}>
                  {ev.type === "in" ? "+" : "-"}LKR {ev.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const start = startOfWeek(startOfMonth(currentMonth));
  const end = endOfWeek(endOfMonth(currentMonth));

  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const monthNet = days
    .filter((d) => isSameMonth(d, currentMonth))
    .reduce((s, d) => {
      const key = format(d, "yyyy-MM-dd");
      return s + (CASH_FLOW.get(key)?.net ?? 0);
    }, 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Cash Flow Calendar</h1>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-watch/10 text-signal-watch border border-signal-watch/20 uppercase tracking-wide">
          Preview
        </span>
      </div>
      <p className="text-sm text-ink-secondary -mt-4">Daily cash inflows and outflows — click any day for details</p>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-ink-muted flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-signal-healthy/20 border border-signal-healthy/30" />Net inflow day</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-signal-danger/20 border border-signal-danger/30" />Net outflow day</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-pilot-500/40" />Today</span>
        <span className="ml-auto font-medium text-ink-secondary">
          Month net: <span className={cn("font-mono", monthNet >= 0 ? "text-signal-healthy" : "text-signal-danger")}>
            {monthNet >= 0 ? "+" : ""}LKR {Math.abs(monthNet).toLocaleString()}
          </span>
        </span>
      </div>

      {/* Calendar */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-bg-raised transition-colors">
            <ChevronLeft className="h-4 w-4 text-ink-secondary" />
          </button>
          <p className="font-display font-semibold text-ink-primary">{format(currentMonth, "MMMM yyyy")}</p>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-bg-raised transition-colors">
            <ChevronRight className="h-4 w-4 text-ink-secondary" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] uppercase tracking-wider text-ink-tertiary font-medium">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 p-2">
          {days.map((d) => (
            <DayCell
              key={format(d, "yyyy-MM-dd")}
              date={d}
              currentMonth={currentMonth}
              selected={selectedDay ? isSameDay(d, selectedDay) : false}
              onSelect={(day) => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
            />
          ))}
        </div>
      </div>

      {/* Side drawer overlay */}
      {selectedDay && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedDay(null)} />
          <DayDrawer date={selectedDay} onClose={() => setSelectedDay(null)} />
        </>
      )}
    </div>
  );
}
