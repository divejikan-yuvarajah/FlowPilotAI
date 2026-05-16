"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface CategorySlice {
  category: string;
  amount: number;
  color: string;
}

interface ExpenseDonutProps {
  data: CategorySlice[];
  totalAmount: number;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CategorySlice;
  return (
    <div
      className="rounded-lg border border-border bg-surface shadow-lg px-3 py-2.5 text-xs"
      style={{ background: "hsl(217 33% 12%)", borderColor: "hsl(217 33% 17%)" }}
    >
      <p className="font-medium text-ink-primary mb-1">{d.category}</p>
      <p className="font-mono text-ink-secondary tabular-nums">
        LKR {d.amount.toLocaleString()}
      </p>
    </div>
  );
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function ExpenseDonut({
  data,
  totalAmount,
  selectedCategory,
  onSelectCategory,
}: ExpenseDonutProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-ink-primary">Expense Breakdown</h3>
        <p className="text-xs text-ink-muted mt-0.5">By category · this month</p>
      </div>

      <div className="flex-1 min-h-0 flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={74}
                paddingAngle={2}
                dataKey="amount"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(entry: any) =>
                  onSelectCategory(
                    selectedCategory === (entry as CategorySlice).category ? null : (entry as CategorySlice).category,
                  )
                }
                cursor="pointer"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={entry.color}
                    opacity={
                      selectedCategory === null || selectedCategory === entry.category
                        ? 1
                        : 0.25
                    }
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="font-mono text-sm font-bold text-ink-primary tabular-nums">
              {formatShort(totalAmount)}
            </p>
            <p className="text-[10px] text-ink-muted">this month</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-1.5 overflow-y-auto max-h-[160px]">
          {data.map((entry) => {
            const pct = totalAmount > 0
              ? Math.round((entry.amount / totalAmount) * 100)
              : 0;
            const active =
              selectedCategory === null || selectedCategory === entry.category;
            return (
              <button
                key={entry.category}
                onClick={() =>
                  onSelectCategory(
                    selectedCategory === entry.category ? null : entry.category,
                  )
                }
                className={`w-full flex items-center gap-2 text-left transition-opacity ${
                  active ? "opacity-100" : "opacity-40"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: entry.color }}
                />
                <span className="text-xs text-ink-secondary truncate flex-1">
                  {entry.category}
                </span>
                <span className="text-xs text-ink-muted tabular-nums shrink-0">
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategory && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            Filtered: <span className="text-ink-primary font-medium">{selectedCategory}</span>
          </span>
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs text-pilot-500 hover:text-pilot-400 transition-colors"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
