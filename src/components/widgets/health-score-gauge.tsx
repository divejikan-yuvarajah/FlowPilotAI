"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type HealthStatus = "healthy" | "watch" | "danger" | "critical";

interface HealthScoreGaugeProps {
  score: number;
  status: HealthStatus;
  grade: string;
  className?: string;
}

// 270° arc gauge — starts at 7 o'clock, ends at 5 o'clock
const R = 48;
const CX = 60;
const CY = 62;
const CIRCUMFERENCE = 2 * Math.PI * R;
const ARC = CIRCUMFERENCE * 0.75; // 270° = 75% of full circle
const GAP = CIRCUMFERENCE - ARC;

const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy:  "hsl(142 71% 45%)",
  watch:    "hsl(38 92% 50%)",
  danger:   "hsl(0 84% 60%)",
  critical: "hsl(0 72% 45%)",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy:  "Healthy",
  watch:    "Watch",
  danger:   "Danger",
  critical: "Critical",
};

export function HealthScoreGauge({
  score,
  status,
  grade,
  className,
}: HealthScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = ARC * (1 - clampedScore / 100);
  const color = STATUS_COLOR[status];

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg p-6 flex flex-col gap-3",
        className,
      )}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs uppercase tracking-wider text-ink-tertiary font-medium">
          Health Score
        </span>
      </div>

      {/* Gauge */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="120" height="110" viewBox="0 0 120 124" fill="none">
            {/* Track */}
            <circle
              r={R}
              cx={CX}
              cy={CY}
              stroke="hsl(217 33% 17%)"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${GAP}`}
              transform={`rotate(135, ${CX}, ${CY})`}
              fill="none"
            />
            {/* Progress */}
            <motion.circle
              r={R}
              cx={CX}
              cy={CY}
              stroke={color}
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${GAP}`}
              transform={`rotate(135, ${CX}, ${CY})`}
              fill="none"
              initial={{ strokeDashoffset: ARC }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            />
            {/* Score text */}
            <text
              x={CX}
              y={CY + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              fontSize="22"
              fontWeight="700"
              fontFamily="var(--font-display, sans-serif)"
              className="fill-ink-primary"
            >
              {Math.round(clampedScore)}
            </text>
            {/* Grade */}
            <text
              x={CX}
              y={CY + 22}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize="12"
              fontWeight="600"
            >
              {grade}
            </text>
          </svg>
        </div>

        {/* Right info */}
        <div className="space-y-1.5 min-w-0">
          <p className="text-2xl font-display font-semibold leading-none tabular-nums" style={{ color }}>
            {Math.round(clampedScore)}
            <span className="text-sm text-ink-muted font-normal ml-1">/100</span>
          </p>
          <p className="text-xs font-medium" style={{ color }}>
            {STATUS_LABEL[status]}
          </p>
          <p className="text-xs text-ink-muted">
            Grade {grade} — updated today
          </p>
        </div>
      </div>
    </div>
  );
}
