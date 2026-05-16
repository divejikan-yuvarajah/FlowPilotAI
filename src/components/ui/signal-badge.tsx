import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const signalBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium leading-none",
  {
    variants: {
      variant: {
        healthy: "bg-signal-healthy/20 text-signal-healthy",
        watch: "bg-signal-watch/20 text-signal-watch",
        danger: "bg-signal-danger/20 text-signal-danger",
        critical: "bg-signal-critical/20 text-signal-critical",
        ai: "bg-signal-ai/20 text-signal-ai",
        neutral: "bg-signal-neutral/20 text-signal-neutral",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

interface SignalBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof signalBadgeVariants> {}

export function SignalBadge({
  variant,
  size,
  className,
  children,
  ...props
}: SignalBadgeProps) {
  return (
    <span
      className={cn(signalBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
