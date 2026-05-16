import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ProactiveSuggestion {
  id: string;
  text: string;
  read: boolean;
}

interface AssistantStore {
  isOpen: boolean;
  messages: AssistantMessage[];
  isStreaming: boolean;
  suggestions: ProactiveSuggestion[];

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  addMessage: (msg: Omit<AssistantMessage, "id" | "timestamp">) => string;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearChat: () => void;
  addSuggestion: (text: string) => void;
  markSuggestionsRead: () => void;
  hasUnreadSuggestions: () => boolean;
}

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      isStreaming: false,
      suggestions: [],

      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),

      addMessage: (msg) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id, timestamp: new Date().toISOString() },
          ],
        }));
        return id;
      },

      updateLastAssistantMessage: (content) => {
        set((s) => {
          const msgs = [...s.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "assistant") {
              msgs[i] = { ...msgs[i], content };
              break;
            }
          }
          return { messages: msgs };
        });
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearChat: () => set({ messages: [] }),

      addSuggestion: (text) => {
        const id = `sug-${Date.now()}`;
        set((s) => ({
          suggestions: [
            ...s.suggestions.slice(-4), // keep last 4
            { id, text, read: false },
          ],
        }));
      },

      markSuggestionsRead: () =>
        set((s) => ({
          suggestions: s.suggestions.map((sug) => ({ ...sug, read: true })),
        })),

      hasUnreadSuggestions: () =>
        get().suggestions.some((s) => !s.read),
    }),
    {
      name: "flowpilot-assistant",
      partialize: (s) => ({ messages: s.messages, suggestions: s.suggestions }),
    },
  ),
);
