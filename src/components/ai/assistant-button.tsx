"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/store/assistant-store";

export function AssistantButton() {
  const { toggleOpen, hasUnreadSuggestions } = useAssistantStore();
  const unread = hasUnreadSuggestions();

  return (
    <button
      onClick={toggleOpen}
      aria-label="Open AI Assistant"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-pilot-500 to-violet-600",
        "shadow-lg shadow-pilot-500/40",
        "transition-all duration-200",
        "hover:scale-105 hover:shadow-xl hover:shadow-pilot-500/60",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-pilot-500 focus-visible:ring-offset-2",
      )}
    >
      <Sparkles className="h-6 w-6 text-white" />

      {/* Unread pulse dot */}
      {unread && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-watch opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-signal-watch" />
        </span>
      )}
    </button>
  );
}
