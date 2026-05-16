import { z } from "zod";

const envSchema = z.object({
  // ─── Supabase (public) ───────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // ─── Supabase (server-only) ──────────────────────────────────────────────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ─── OpenAI (server-only) ────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),

  // ─── Seylan Bank (server-only) ───────────────────────────────────────────
  SEYLAN_API_BASE_URL: z.string().url().default("https://api.seylan.lk/v1"),
  SEYLAN_API_KEY: z.string().min(1),
  SEYLAN_MODE: z.enum(["live", "simulator"]).default("simulator"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${missing}`);
  }

  return result.data;
}

export const env = parseEnv();
