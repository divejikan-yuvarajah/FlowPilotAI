/**
 * FlowPilot AI — Zod output schemas for all AI-generated JSON
 *
 * Each schema mirrors the JSON structure specified in the system prompt.
 * Parse AI responses through these to catch hallucinated fields early.
 */

import { z } from "zod";

// ─── Risk Analysis ────────────────────────────────────────────────────────────

export const RiskAnalysisSchema = z.object({
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  risk_score: z.number().int().min(0).max(100),
  default_probability: z.number().min(0).max(1),
  primary_reasoning: z.string().min(10),
  recommended_stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  recommended_action: z.string().min(5),
});

export type RiskAnalysisOutput = z.infer<typeof RiskAnalysisSchema>;

// ─── Recovery Message ─────────────────────────────────────────────────────────
// Recovery is free-form text, not JSON — schema wraps it for API response shape

export const RecoveryOutputSchema = z.object({
  message: z.string().min(10),
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  language: z.enum(["en", "si", "ta"]),
  invoiceNumber: z.string(),
});

export type RecoveryOutput = z.infer<typeof RecoveryOutputSchema>;

// ─── CFO Brief ────────────────────────────────────────────────────────────────

export const CFOBriefAnomalySchema = z.object({
  vendor: z.string(),
  category: z.string(),
  delta_pct: z.number(),
});

export const CFOBriefRecommendationSchema = z.object({
  priority: z.number().int().min(1),
  action: z.string().min(5),
});

export const CFOBriefSchema = z.object({
  bullets: z.array(z.string()).min(1).max(8),
  anomalies: z.array(CFOBriefAnomalySchema).default([]),
  recommendations: z.array(CFOBriefRecommendationSchema).min(1),
});

export type CFOBriefOutput = z.infer<typeof CFOBriefSchema>;

// ─── Survival Plan ────────────────────────────────────────────────────────────

export const SurvivalActionSchema = z.object({
  priority: z.number().int().min(1).max(5),
  category: z.string(),
  action: z.string().min(10),
  impact: z.string(),
  timeframe: z.string(),
});

export const SurvivalPlanSchema = z.object({
  severity: z.enum(["watch", "danger", "critical"]),
  runwayWithShock: z.number().int().min(0),
  actions: z.array(SurvivalActionSchema).length(5),
});

export type SurvivalPlanOutput = z.infer<typeof SurvivalPlanSchema>;

// ─── Supplier Analysis ────────────────────────────────────────────────────────

export const SupplierAnalysisSchema = z.object({
  relationship_health: z.enum(["excellent", "good", "strained", "critical"]),
  primary_concern: z.string().min(5),
  recommended_action: z.string().min(5),
  estimated_impact: z.enum(["low", "medium", "high"]),
});

export type SupplierAnalysisOutput = z.infer<typeof SupplierAnalysisSchema>;

// ─── API request schemas (input validation) ───────────────────────────────────

export const AnalyzeRiskRequestSchema = z.object({
  invoiceId: z.string().uuid("invoiceId must be a valid UUID"),
});

export const DraftRecoveryRequestSchema = z.object({
  invoiceId: z.string().uuid("invoiceId must be a valid UUID"),
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  language: z.enum(["en", "si", "ta"]).default("en"),
});

export const CfoBriefRequestSchema = z.object({
  date: z.string().optional().default("today"),
});

export const SurvivalPlanRequestSchema = z.object({
  defaultedClientIds: z.array(z.string().uuid()).min(1),
  expenseShockPct: z.number().min(0).max(200).default(0),
  revenueShockPct: z.number().min(0).max(100).default(0),
});

export const SupplierAnalysisRequestSchema = z.object({
  supplierId: z.string().uuid("supplierId must be a valid UUID"),
});
