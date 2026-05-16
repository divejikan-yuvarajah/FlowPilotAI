"use client";

import { AssistantButton } from "./assistant-button";
import { AssistantPanel } from "./assistant-panel";

export function AssistantMount() {
  return (
    <>
      <AssistantPanel />
      <AssistantButton />
    </>
  );
}
