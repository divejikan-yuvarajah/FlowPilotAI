"use client";

import { useState } from "react";
import { Sparkles, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SignalBadge } from "@/components/ui/signal-badge";

interface AIInsightCardProps {
  model: string;
  generatedAt: Date;
  reasoning?: string;
  children: React.ReactNode;
  className?: string;
}

export function AIInsightCard({
  model,
  generatedAt,
  reasoning,
  children,
  className,
}: AIInsightCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <div
      className={cn(
        "border-l-2 border-l-signal-ai bg-purple-950/10 rounded-lg p-4 flex flex-col gap-3",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-signal-ai shrink-0" />
          <span className="text-sm font-medium text-signal-ai">AI Analysis</span>
        </div>
        <span className="text-xs text-ink-muted tabular-nums">
          {formatDistanceToNow(generatedAt, { addSuffix: true })}
        </span>
      </div>

      {/* Body */}
      <div className="text-sm text-ink-secondary leading-relaxed">{children}</div>

      {/* Collapsible reasoning */}
      {reasoning && (
        <div className="border-t border-border/50 pt-2">
          <button
            onClick={() => setReasoningOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary transition-colors"
          >
            {reasoningOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {reasoningOpen ? "Hide" : "Show"} reasoning
          </button>
          {reasoningOpen && (
            <p className="mt-2 text-xs text-ink-muted leading-relaxed font-mono bg-bg-muted/40 rounded p-2">
              {reasoning}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <SignalBadge variant="ai" size="sm">
          {model}
        </SignalBadge>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded text-ink-muted hover:text-signal-healthy hover:bg-signal-healthy/10 transition-colors"
            aria-label="Helpful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 rounded text-ink-muted hover:text-signal-danger hover:bg-signal-danger/10 transition-colors"
            aria-label="Not helpful"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
