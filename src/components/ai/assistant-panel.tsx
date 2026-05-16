"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowUp, Sparkles, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { useAssistantStore } from "@/store/assistant-store";
import type { AssistantMessage } from "@/store/assistant-store";

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "How is Nexus doing?",
  "What changed this week?",
  "Why is my health score low?",
  "What should I focus on today?",
];

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// Renders **bold** and bullet lists without a heavy dep

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const isBullet = line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
    const content = isBullet ? line.trimStart().slice(2) : line;

    const parts = content.split(/\*\*(.+?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="font-semibold text-ink-primary">
          {part}
        </strong>
      ) : (
        part
      ),
    );

    if (isBullet) {
      elements.push(
        <li key={i} className="ml-3 list-disc">
          {rendered}
        </li>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(<p key={i}>{rendered}</p>);
    }
  });

  return <>{elements}</>;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: AssistantMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const isEmpty = !message.content && !isStreaming;

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pilot-500/20 mt-1">
          <Sparkles className="h-3 w-3 text-pilot-400" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-pilot-500/20 border border-pilot-500/40 rounded-br-sm text-ink-primary"
            : "bg-bg-raised border border-border rounded-bl-sm text-ink-secondary",
        )}
      >
        {isEmpty ? (
          <span className="text-ink-muted text-xs">Thinking…</span>
        ) : (
          <div className="space-y-0.5">
            {renderMarkdown(message.content)}
            {!isUser && isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-pilot-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AssistantPanel() {
  const {
    isOpen,
    setOpen,
    messages,
    isStreaming,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    clearChat,
    markSuggestionsRead,
  } = useAssistantStore();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Mark suggestions read when panel opens
  useEffect(() => {
    if (isOpen) markSuggestionsRead();
  }, [isOpen, markSuggestionsRead]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setInput("");

      // Add user message
      addMessage({ role: "user", content: trimmed });

      // Add empty assistant placeholder
      addMessage({ role: "assistant", content: "" });
      setStreaming(true);

      // Build history from store (exclude the empty placeholder we just added)
      const history = messages
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, conversationHistory: history }),
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          updateLastAssistantMessage(
            err.error ?? "Something went wrong. Please try again.",
          );
          return;
        }

        // Stream tokens
        const reader = res.body?.getReader();
        if (!reader) {
          updateLastAssistantMessage("Stream unavailable. Please retry.");
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === "data: [DONE]") break;
            if (!trimmedLine.startsWith("data: ")) continue;

            try {
              const parsed = JSON.parse(trimmedLine.slice(6)) as { token?: string };
              if (parsed.token) {
                accumulated += parsed.token;
                updateLastAssistantMessage(accumulated);
              }
            } catch {
              // Skip malformed
            }
          }
        }

        reader.releaseLock();
      } catch {
        updateLastAssistantMessage(
          "Connection error. Check your network and try again.",
        );
      } finally {
        setStreaming(false);
      }
    },
    [isStreaming, messages, addMessage, updateLastAssistantMessage, setStreaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full lg:w-[440px] p-0 flex flex-col bg-bg-surface border-l border-border gap-0"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pilot-500 to-violet-600">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-ink-primary leading-tight">
                  FlowPilot AI Assistant
                </p>
                <p className="text-[10px] text-ink-muted">Ask anything about your finances</p>
              </div>
              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-bg-muted text-ink-muted border border-border uppercase tracking-wide">
                GPT-4o mini
              </span>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="p-1.5 rounded-md text-ink-muted hover:text-ink-secondary hover:bg-bg-raised transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-ink-muted hover:text-ink-secondary hover:bg-bg-raised transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Suggested prompts — only show when no messages */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-bg-muted border border-border text-ink-secondary hover:bg-pilot-500/10 hover:border-pilot-500/30 hover:text-pilot-400 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </SheetHeader>

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <Sparkles className="h-10 w-10 text-ink-muted/30" />
              <p className="text-sm text-ink-muted text-center">
                Ask me anything about your business
              </p>
              <p className="text-xs text-ink-muted/60 text-center max-w-[240px]">
                Try "What&apos;s my biggest risk?" or "How is Nexus doing?"
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ──────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border px-4 py-3 bg-bg-surface">
          <div className="flex items-end gap-2 bg-bg-inset border border-border rounded-xl px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none leading-relaxed max-h-24 disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                input.trim() && !isStreaming
                  ? "bg-pilot-500 text-white hover:bg-pilot-600"
                  : "bg-bg-muted text-ink-muted cursor-not-allowed",
              )}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-ink-muted/60 mt-1.5 text-center">
            AI references real account data. Not financial advice.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
