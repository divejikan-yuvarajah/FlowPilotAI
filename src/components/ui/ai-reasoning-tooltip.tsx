"use client";

import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIReasoningTooltipProps {
  model?: string;
  reasoning: string | null | undefined;
  generatedAt?: string | null;
  children: React.ReactNode;
}

export function AIReasoningTooltip({
  model = "Mistral 7B",
  reasoning,
  generatedAt,
  children,
}: AIReasoningTooltipProps) {
  if (!reasoning) return <>{children}</>;

  const relTime = generatedAt
    ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex items-center">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs bg-bg-surface border border-border p-3 shadow-xl"
        >
          {/* Model badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-signal-ai" />
            <span className="text-[10px] font-semibold bg-signal-ai/10 text-signal-ai px-1.5 py-0.5 rounded">
              {model}
            </span>
            {relTime && (
              <span className="text-[10px] text-ink-muted ml-auto">{relTime}</span>
            )}
          </div>
          {/* Reasoning */}
          <p className="text-xs text-ink-secondary leading-relaxed">{reasoning}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
