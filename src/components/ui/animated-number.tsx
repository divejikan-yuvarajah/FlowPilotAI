"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  format,
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(value, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return format ? format(rounded) : rounded.toLocaleString();
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={cn(className)}>{display}</motion.span>;
}
