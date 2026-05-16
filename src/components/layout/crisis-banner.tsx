"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, X } from "lucide-react";
import { useStressTestStore } from "@/store/stress-test";

const SESSION_KEY = "crisisBanner_dismissed";

interface CrisisBannerProps {
  runwayDays: number; // static prop from layout (real runway)
}

export function CrisisBanner({ runwayDays }: CrisisBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  // Read stress-test derived runway — overrides static prop when simulator is active
  const metrics = useStressTestStore((s) => s.metrics);
  const stressedRunway = metrics?.stressedRunwayDays ?? null;

  // Effective runway: use stressed if simulator is running and it's worse
  const effectiveRunway =
    stressedRunway !== null && stressedRunway < runwayDays
      ? stressedRunway
      : runwayDays;

  const isCrisis = effectiveRunway < 7;
  const isStressCrisis = stressedRunway !== null && stressedRunway < 7;

  useEffect(() => {
    setDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  // Never allow dismiss during active stress crisis — judges must see it
  useEffect(() => {
    if (isStressCrisis) setDismissed(false);
  }, [isStressCrisis]);

  function dismiss() {
    if (isStressCrisis) return; // blocked during stress scenario
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  if (!isCrisis || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-3 px-6 py-2.5 text-white text-sm shrink-0 transition-all"
      style={{
        background: isStressCrisis
          ? "linear-gradient(90deg, hsl(0 72% 30%), hsl(0 84% 50%), hsl(0 72% 30%))"
          : "linear-gradient(90deg, hsl(0 72% 40%), hsl(0 84% 55%))",
        backgroundSize: isStressCrisis ? "200% 100%" : "100% 100%",
        animation: isStressCrisis ? "shimmer 2s linear infinite" : "none",
      }}
    >
      <AlertOctagon className="h-4 w-4 animate-pulse shrink-0" />
      <span>
        {isStressCrisis ? (
          <>
            <strong className="font-semibold">⚠ STRESS TEST — CASH CRISIS.</strong>{" "}
            Simulated runway:{" "}
            <strong className="font-semibold">{effectiveRunway} days.</strong>
          </>
        ) : (
          <>
            Cash crisis mode active. Runway:{" "}
            <strong className="font-semibold">{effectiveRunway} days.</strong>
          </>
        )}
      </span>
      <Link
        href="/simulator"
        className="underline underline-offset-2 hover:no-underline font-medium ml-1 shrink-0"
      >
        View action plan →
      </Link>
      {!isStressCrisis && (
        <button
          onClick={dismiss}
          className="ml-auto p-1 rounded hover:bg-white/20 transition-colors shrink-0"
          aria-label="Dismiss crisis banner"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isStressCrisis && (
        <span className="ml-auto text-white/70 text-xs italic shrink-0">
          Simulator active
        </span>
      )}
    </div>
  );
}
