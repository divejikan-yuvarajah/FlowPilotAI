/**
 * FlowPilot AI — Supplier Seeder
 * POST /api/seed/suppliers
 *
 * Idempotent: skips if suppliers already exist for this user.
 * Use when the main /api/seed has already run and you only need
 * to add the Supplier Trust Mirror demo data.
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === "production";
}

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

function tsOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

export async function POST() {
  if (isProductionEnv()) {
    return NextResponse.json(
      { error: "Seeder is disabled in production" },
      { status: 403 },
    );
  }

  const sessionClient = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const db = createAdminClient();

  // ── Idempotency: skip if suppliers already exist ────────────────────────────
  const { data: existing, error: existingErr } = await db
    .from("suppliers")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingErr) {
    return NextResponse.json(
      {
        error: `Cannot read suppliers table — did you run the migration? ${existingErr.message}`,
      },
      { status: 500 },
    );
  }

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { alreadySeeded: true, message: "Suppliers already exist for this user" },
      { status: 200 },
    );
  }

  // ── Insert suppliers ────────────────────────────────────────────────────────
  const { data: insertedSuppliers, error: supplierErr } = await db
    .from("suppliers")
    .insert([
      {
        user_id: userId,
        name: "Lanka Logistics",
        business_type: "logistics",
        payment_reliability_score: 64,
        trend: "worsening",
        relationship_status: "strained",
        notes:
          "We've been 3-5 days late on last 4 invoices. Relationship strained.",
        ai_relationship_insight:
          "Consistent late payments are eroding trust. Lanka Logistics may tighten credit terms if pattern continues.",
      },
      {
        user_id: userId,
        name: "Ceylon Inventory Co",
        business_type: "inventory",
        payment_reliability_score: 82,
        trend: "stable",
        relationship_status: "active",
        notes: "Reliable payer relationship. Supplier offers 30-day terms.",
        ai_relationship_insight:
          "Strong payment track record. Consider negotiating extended 45-day terms given reliability.",
      },
      {
        user_id: userId,
        name: "Dialog Axiata",
        business_type: "utilities",
        payment_reliability_score: 95,
        trend: "improving",
        relationship_status: "excellent",
        notes: "Auto-debit. Always on time.",
        ai_relationship_insight:
          "Auto-debit ensures perfect punctuality. Excellent standing with this critical utility provider.",
      },
      {
        user_id: userId,
        name: "Office Pro Stationery",
        business_type: "software",
        payment_reliability_score: 71,
        trend: "stable",
        relationship_status: "active",
        notes: "Small supplier. Occasionally pay 1-2 days late.",
        ai_relationship_insight:
          "Minor delays have been tolerated so far. Keeping payments within 2 days of due date will maintain goodwill.",
      },
    ])
    .select("id, name");

  if (supplierErr) {
    return NextResponse.json(
      { error: `Supplier seed failed: ${supplierErr.message}` },
      { status: 500 },
    );
  }

  const supplierMap = Object.fromEntries(
    (insertedSuppliers ?? []).map((s) => [s.name as string, s.id as string]),
  );

  // ── Insert obligations ──────────────────────────────────────────────────────
  const obligationRows = [
    // Lanka Logistics — 4 obligations
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0095",
      amount: 48_500,
      due_date: dateStr(-30),
      status: "paid",
      paid_at: tsOffset(-25),
      paid_amount: 48_500,
      description: "Freight charges — March batch",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0096",
      amount: 63_200,
      due_date: dateStr(-20),
      status: "paid",
      paid_at: tsOffset(-16),
      paid_amount: 63_200,
      description: "Warehousing — March",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0097",
      amount: 51_800,
      due_date: dateStr(-10),
      status: "paid",
      paid_at: tsOffset(-7),
      paid_amount: 51_800,
      description: "Last-mile delivery — April batch",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Lanka Logistics"],
      reference: "OBL-0098",
      amount: 72_400,
      due_date: dateStr(-5),
      status: "overdue",
      paid_at: null,
      paid_amount: null,
      description: "April freight — URGENT",
    },
    // Ceylon Inventory Co — 3 obligations
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0101",
      amount: 185_000,
      due_date: dateStr(-15),
      status: "paid",
      paid_at: tsOffset(-15),
      paid_amount: 185_000,
      description: "Inventory restock — April",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0102",
      amount: 142_500,
      due_date: dateStr(7),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "May inventory order",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Ceylon Inventory Co"],
      reference: "OBL-0103",
      amount: 96_800,
      due_date: dateStr(15),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "Packaging materials — May",
    },
    // Dialog Axiata — 2 obligations
    {
      user_id: userId,
      supplier_id: supplierMap["Dialog Axiata"],
      reference: "OBL-0110",
      amount: 12_450,
      due_date: dateStr(-25),
      status: "paid",
      paid_at: tsOffset(-26),
      paid_amount: 12_450,
      description: "Monthly broadband — March",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Dialog Axiata"],
      reference: "OBL-0111",
      amount: 12_450,
      due_date: dateStr(5),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "Monthly broadband — May",
    },
    // Office Pro Stationery — 3 obligations
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0120",
      amount: 18_700,
      due_date: dateStr(-18),
      status: "paid",
      paid_at: tsOffset(-16),
      paid_amount: 18_700,
      description: "Office supplies — Q1",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0121",
      amount: 22_300,
      due_date: dateStr(-8),
      status: "paid",
      paid_at: tsOffset(-7),
      paid_amount: 22_300,
      description: "Printer cartridges + stationery",
    },
    {
      user_id: userId,
      supplier_id: supplierMap["Office Pro Stationery"],
      reference: "OBL-0122",
      amount: 15_600,
      due_date: dateStr(3),
      status: "pending",
      paid_at: null,
      paid_amount: null,
      description: "May office supplies order",
    },
  ];

  const { error: oblErr } = await db
    .from("supplier_obligations")
    .insert(obligationRows);

  if (oblErr) {
    return NextResponse.json(
      { error: `Obligation seed failed: ${oblErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      seeded: true,
      suppliers: (insertedSuppliers ?? []).length,
      supplierObligations: obligationRows.length,
    },
    { status: 201 },
  );
}
