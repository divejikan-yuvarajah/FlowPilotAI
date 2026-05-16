/**
 * FlowPilot AI — OpenAI Cached & Audited Wrapper
 * CTO Blueprint §7.1
 *
 * All AI calls in the application go through this single function.
 * It provides:
 *   - ai_cache read-through (skip network if fresh hit)
 *   - Automatic cache write after every successful call
 *   - Structured error handling (never throws — returns { error })
 *   - Latency tracking for generation_time_ms
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenRouterOptions {
  /** OpenRouter model string, e.g. "mistralai/mistral-7b-instruct" */
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Deterministic key for cache lookup. Include all variable inputs. */
  cacheKey: string;
  userId: string;
  maxTokens?: number;
  temperature?: number;
  /** Seconds until cache entry expires. Default: 7 days. */
  cacheTtlSeconds?: number;
  /** If true, request JSON output format from the model. */
  jsonMode?: boolean;
}

export interface OpenRouterSuccess {
  ok: true;
  content: string;
  cached: boolean;
  model: string;
  cacheKey: string;
  latencyMs: number;
}

export interface OpenRouterFailure {
  ok: false;
  error: string;
  cacheKey: string;
}

export type OpenRouterResult = OpenRouterSuccess | OpenRouterFailure;

// ─── Constants ────────────────────────────────────────────────────────────────

const OR_BASE = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TTL_S = 60 * 60 * 24 * 7; // 7 days
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TEMPERATURE = 0.3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract content string from a JSON response body, tolerating variations. */
function extractContent(
  body: unknown,
): string | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const choices = b.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as Record<string, unknown>;
  const message = first.message as Record<string, unknown> | undefined;
  return typeof message?.content === "string" ? message.content.trim() : null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callOpenRouter(
  options: OpenRouterOptions,
): Promise<OpenRouterResult> {
  const {
    model,
    systemPrompt,
    userPrompt,
    cacheKey,
    userId,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    cacheTtlSeconds = DEFAULT_TTL_S,
    jsonMode = false,
  } = options;

  const db = createAdminClient();
  const t0 = Date.now();

  // ── 1. Cache read ──────────────────────────────────────────────────────────

  try {
    const { data: hit } = await db
      .from("ai_cache")
      .select("response, model")
      .eq("cache_key", cacheKey)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (hit?.response) {
      const cached = hit.response as { content?: string };
      if (typeof cached.content === "string") {
        return {
          ok: true,
          content: cached.content,
          cached: true,
          model: (hit.model as string) ?? model,
          cacheKey,
          latencyMs: Date.now() - t0,
        };
      }
    }
  } catch {
    // Cache miss on error — proceed to live call
  }

  // ── 2. Guard: require API key ──────────────────────────────────────────────

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured",
      cacheKey,
    };
  }

  // ── 3. Live OpenRouter call ────────────────────────────────────────────────

  let content: string;

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(OR_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return { ok: false, error: `OpenRouter ${res.status}: ${errText}`, cacheKey };
    }

    const json: unknown = await res.json();
    const extracted = extractContent(json);

    if (!extracted) {
      return { ok: false, error: "OpenRouter returned empty content", cacheKey };
    }

    content = extracted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: `OpenRouter fetch failed: ${msg}`, cacheKey };
  }

  const latencyMs = Date.now() - t0;

  // ── 4. Cache write ─────────────────────────────────────────────────────────

  try {
    const expiresAt = new Date(Date.now() + cacheTtlSeconds * 1000).toISOString();
    await db.from("ai_cache").upsert(
      {
        cache_key: cacheKey,
        user_id: userId,
        model,
        prompt_preview: userPrompt.slice(0, 200),
        response: { content },
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // Cache write failure is non-fatal
  }

  return { ok: true, content, cached: false, model, cacheKey, latencyMs };
}

// ─── Convenience: parse JSON from AI response ─────────────────────────────────
//
// AI models sometimes wrap JSON in markdown fences. This helper strips them
// and attempts a parse, returning null on failure.

export function parseAiJson<T>(content: string): T | null {
  // Strip markdown code fences
  const stripped = content
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Try extracting the first {...} block
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
