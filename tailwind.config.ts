import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Background ───────────────────────────────────────────────
        "bg-base": "hsl(var(--bg-base))",
        "bg-subtle": "hsl(var(--bg-subtle))",
        "bg-muted": "hsl(var(--bg-muted))",
        "bg-emphasis": "hsl(var(--bg-emphasis))",

        // ─── Ink (text) ───────────────────────────────────────────────
        "ink-primary": "hsl(var(--ink-primary))",
        "ink-secondary": "hsl(var(--ink-secondary))",
        "ink-muted": "hsl(var(--ink-muted))",
        "ink-inverted": "hsl(var(--ink-inverted))",

        // ─── Brand ────────────────────────────────────────────────────
        "brand-DEFAULT": "hsl(var(--brand))",
        "brand-hover": "hsl(var(--brand-hover))",
        "brand-muted": "hsl(var(--brand-muted))",
        "brand-fg": "hsl(var(--brand-fg))",

        // ─── Semantic ─────────────────────────────────────────────────
        "success-DEFAULT": "hsl(var(--success))",
        "success-muted": "hsl(var(--success-muted))",
        "warning-DEFAULT": "hsl(var(--warning))",
        "warning-muted": "hsl(var(--warning-muted))",
        "danger-DEFAULT": "hsl(var(--danger))",
        "danger-muted": "hsl(var(--danger-muted))",
        "info-DEFAULT": "hsl(var(--info))",
        "info-muted": "hsl(var(--info-muted))",

        // ─── Border / Surface ─────────────────────────────────────────
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        surface: "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        "surface-overlay": "hsl(var(--surface-overlay))",

        // ─── bg-surface alias (enables bg-bg-surface class) ───────────
        "bg-surface": "hsl(var(--surface))",

        // ─── Glass ────────────────────────────────────────────────────
        "bg-glass": "hsl(var(--bg-glass) / <alpha-value>)",

        // ─── Pilot brand scale ────────────────────────────────────────
        pilot: {
          400: "hsl(var(--pilot-400))",
          500: "hsl(var(--pilot-500))",
          600: "hsl(var(--pilot-600))",
        },

        // ─── Signal status colors ─────────────────────────────────────
        signal: {
          healthy: "hsl(var(--signal-healthy))",
          watch: "hsl(var(--signal-watch))",
          danger: "hsl(var(--signal-danger))",
          critical: "hsl(var(--signal-critical))",
          ai: "hsl(var(--signal-ai))",
          neutral: "hsl(var(--signal-neutral))",
        },

        // ─── ink-tertiary alias ───────────────────────────────────────
        "ink-tertiary": "hsl(var(--ink-muted))",

        // ─── Shell layout aliases ─────────────────────────────────────
        "border-subtle": "hsl(var(--border))",        // → border-border-subtle
        "bg-raised": "hsl(var(--surface-raised))",    // → bg-bg-raised

        // ─── shadcn compatibility ──────────────────────────────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-top": "slide-in-from-top 0.25s ease-out",
        "slide-in-bottom": "slide-in-from-bottom 0.25s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
