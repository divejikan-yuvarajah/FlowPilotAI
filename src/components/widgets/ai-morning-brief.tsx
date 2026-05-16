"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ThumbsUp, ThumbsDown, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AiMorningBriefProps {
  bullets: string[];
  generatedAt: string; // ISO date string
  model: string;
  onRegenerate?: () => Promise<void>;
  className?: string;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export function AiMorningBrief({
  bullets,
  generatedAt,
  model,
  onRegenerate,
  className,
}: AiMorningBriefProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function handleRegenerate() {
    if (!onRegenerate || isRegenerating) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  }

  const generatedDate = new Date(generatedAt);
  const relativeTime = formatDistanceToNow(generatedDate, { addSuffix: true });

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg flex flex-col h-full",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-signal-ai shrink-0" />
          <span className="font-medium text-sm text-ink-primary">AI Morning Brief</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock className="h-3 w-3" />
          <span>{relativeTime}</span>
        </div>
      </div>

      {/* Bullets */}
      <div className="flex-1 px-5 py-4">
        <AnimatePresence mode="wait">
          {bullets.length > 0 ? (
            <motion.ul
              key="bullets"
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {bullets.map((bullet, i) => (
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-start gap-2.5 text-sm text-ink-secondary leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-signal-ai shrink-0" />
                  <span>{bullet}</span>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-ink-muted italic"
            >
              No brief available for today. Click regenerate to generate one.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
          Generate new briefing
        </button>

        <div className="flex items-center gap-1">
          <span className="text-xs text-ink-muted mr-1">Was this useful?</span>
          <button
            onClick={() => setFeedback("up")}
            className={cn(
              "p-1.5 rounded transition-colors",
              feedback === "up"
                ? "text-signal-healthy bg-signal-healthy/10"
                : "text-ink-muted hover:text-signal-healthy hover:bg-signal-healthy/10",
            )}
            aria-label="Helpful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFeedback("down")}
            className={cn(
              "p-1.5 rounded transition-colors",
              feedback === "down"
                ? "text-signal-danger bg-signal-danger/10"
                : "text-ink-muted hover:text-signal-danger hover:bg-signal-danger/10",
            )}
            aria-label="Not helpful"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
