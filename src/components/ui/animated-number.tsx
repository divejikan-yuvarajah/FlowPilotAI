"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** Serializable prefix string e.g. "LKR " */
  prefix?: string;
  /** Serializable suffix string e.g. " days" */
  suffix?: string;
  /** Number of decimal places (default 0) */
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });

  const display = useTransform(spring, (current) => {
    const rounded = decimals > 0
      ? current.toFixed(decimals)
      : Math.round(current).toLocaleString();
    return `${prefix}${rounded}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={cn(className)}>{display}</motion.span>;
}
