"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, X } from "lucide-react";

const SESSION_KEY = "crisisBanner_dismissed";

interface CrisisBannerProps {
  runwayDays: number;
}

export function CrisisBanner({ runwayDays }: CrisisBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    // Read from sessionStorage — resets on new browser session
    setDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  if (runwayDays >= 7 || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-3 px-6 py-2.5 text-white text-sm shrink-0"
      style={{
        background:
          "linear-gradient(90deg, hsl(0 72% 40%), hsl(0 84% 55%))",
      }}
    >
      <AlertOctagon className="h-4 w-4 animate-pulse shrink-0" />
      <span>
        Cash crisis mode active. Runway:{" "}
        <strong className="font-semibold">{runwayDays} days.</strong>
      </span>
      <Link
        href="/simulator"
        className="underline underline-offset-2 hover:no-underline font-medium ml-1 shrink-0"
      >
        View action plan →
      </Link>
      <button
        onClick={dismiss}
        className="ml-auto p-1 rounded hover:bg-white/20 transition-colors shrink-0"
        aria-label="Dismiss crisis banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
