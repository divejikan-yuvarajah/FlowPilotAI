import { z } from "zod";

const envSchema = z.object({
  // ─── Supabase ────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ─── OpenAI ──────────────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),

  // ─── Vercel Cron ─────────────────────────────────────────────────────────
  CRON_SECRET: z.string().min(1).optional(),

  // ─── Seylan Bank sandbox ─────────────────────────────────────────────────
  SEYLAN_API_BASE_URL: z.string().url().default("http://34.21.206.87:3000"),
  SEYLAN_API_KEY: z.string().min(1),
  SEYLAN_MODE: z.enum(["live", "simulator"]).default("simulator"),
  SEYLAN_TEST_SOURCE_ACCOUNT: z.string().min(1).default("064000012548001"),
  SEYLAN_TEST_INTERNAL_DEST: z.string().min(1).default("001213437904100"),
  SEYLAN_TEST_CEFTS_DEST_ACCOUNT: z.string().min(1).default("12345678"),
  SEYLAN_TEST_CEFTS_DEST_BANK: z.string().min(1).default("6990"),
  SEYLAN_REQUEST_TIMEOUT_MS: z.coerce.number().default(20000),

  // ─── Mastercard Payment Gateway (MPGS) ───────────────────────────────────
  MPGS_BASE_URL: z.string().url().default("https://test-seylan.mtf.gateway.mastercard.com"),
  MPGS_API_VERSION: z.string().min(1).default("73"),
  MPGS_MERCHANT_ID: z.string().min(1).default("TESTCURSOR2"),
  MPGS_API_PASSWORD: z.string().default(""),
  MPGS_RETURN_URL_BASE: z.string().url().default("http://localhost:3000"),
  MPGS_CURRENCY: z.string().default("LKR"),
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
