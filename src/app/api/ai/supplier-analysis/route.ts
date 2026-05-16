/**
 * FlowPilot AI — Supplier Relationship Analysis
 * POST /api/ai/supplier-analysis
 *
 * For a given supplier_id, fetches the supplier + their obligations,
 * calls AI with a supplier-relationship-analysis system prompt, and
 * returns a structured assessment of the SME's payment reliability.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callOpenRouter, parseAiJson } from "@/lib/ai/openrouter";
import {
  SUPPLIER_ANALYSIS_SYSTEM,
  buildSupplierAnalysisUserPrompt,
  type SupplierAnalysisContext,
} from "@/lib/ai/prompts";
import {
  SupplierAnalysisRequestSchema,
  SupplierAnalysisSchema,
} from "@/lib/ai/schemas";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await session.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ────────────────────────────────────────────────────────
    const body: unknown = await req.json();
    const parsed = SupplierAnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { supplierId } = parsed.data;

    // ── Fetch supplier ────────────────────────────────────────────────────────
    const { data: supplier, error: supplierErr } = await session
      .from("suppliers")
      .select("id, name, business_type, payment_reliability_score, trend, notes")
      .eq("id", supplierId)
      .single();

    if (supplierErr || !supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // ── Fetch obligations ─────────────────────────────────────────────────────
    const { data: obligations } = await session
      .from("supplier_obligations")
      .select("reference, amount, due_date, status, paid_at")
      .eq("supplier_id", supplierId)
      .order("due_date", { ascending: false })
      .limit(10);

    const now = Date.now();
    const sixMonthsAgo = now - 180 * 86_400_000;

    const mappedObligations = (obligations ?? []).map(
      (o: {
        reference: string;
        amount: number;
        due_date: string;
        status: string;
        paid_at: string | null;
      }) => {
        const dueMs = new Date(o.due_date as string).getTime();
        const paidMs = o.paid_at ? new Date(o.paid_at as string).getTime() : null;
        const daysLate =
          paidMs !== null
            ? Math.max(0, Math.floor((paidMs - dueMs) / 86_400_000))
            : o.status === "overdue"
              ? Math.floor((now - dueMs) / 86_400_000)
              : 0;
        return {
          reference: o.reference as string,
          amount: Number(o.amount),
          dueDate: o.due_date as string,
          status: o.status as string,
          daysLate,
        };
      },
    );

    // Obligations in the last 6 months that were paid late
    const latePaymentCount = (obligations ?? []).filter(
      (o: { status: string; due_date: string; paid_at: string | null }) => {
        const dueMs = new Date(o.due_date as string).getTime();
        if (dueMs < sixMonthsAgo) return false;
        if (o.status === "overdue") return true;
        if (!o.paid_at) return false;
        return new Date(o.paid_at as string).getTime() > dueMs;
      },
    ).length;

    const totalOutstanding = (obligations ?? [])
      .filter(
        (o: { status: string }) =>
          o.status === "pending" || o.status === "overdue",
      )
      .reduce((s: number, o: { amount: number }) => s + Number(o.amount), 0);

    const overdueCount = (obligations ?? []).filter(
      (o: { status: string }) => o.status === "overdue",
    ).length;

    // ── Build context + call AI ───────────────────────────────────────────────
    const ctx: SupplierAnalysisContext = {
      supplier: {
        name: supplier.name as string,
        businessType: supplier.business_type as string,
        reliabilityScore: Number(supplier.payment_reliability_score),
        trend: supplier.trend as string,
        notes: supplier.notes as string | null,
      },
      obligations: mappedObligations,
      totalOutstanding,
      overdueCount,
      latePaymentCount,
    };

    const cacheKey = `supplier-analysis:${supplierId}`;
    const result = await callOpenRouter({
      model: "mistralai/mistral-7b-instruct",
      systemPrompt: SUPPLIER_ANALYSIS_SYSTEM,
      userPrompt: buildSupplierAnalysisUserPrompt(ctx),
      cacheKey,
      userId: user.id,
      maxTokens: 350,
      temperature: 0.2,
      jsonMode: true,
      cacheTtlSeconds: 60 * 60 * 6, // 6h
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // ── Validate AI output ────────────────────────────────────────────────────
    const raw = parseAiJson<unknown>(result.content);
    const validated = SupplierAnalysisSchema.safeParse(raw);

    if (!validated.success) {
      return NextResponse.json(
        { error: "AI output validation failed", raw: result.content },
        { status: 502 },
      );
    }

    // ── Persist ai_relationship_insight to supplier ───────────────────────────
    const db = createAdminClient();
    await db
      .from("suppliers")
      .update({
        ai_relationship_insight: validated.data.recommended_action,
      })
      .eq("id", supplierId);

    return NextResponse.json(
      {
        supplierId,
        cached: result.cached,
        latencyMs: result.latencyMs,
        analysis: validated.data,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[supplier-analysis]", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
