import type { SeylanTransaction, TransactionCategory } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idSeq = 1;

function txId(): string {
  return `SIM-TXN-${String(_idSeq++).padStart(6, "0")}`;
}

function ref(): string {
  return `REF${Math.floor(100000000 + Math.random() * 900000000)}`;
}

function isoDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour = 9,
  minute = 0,
): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function tx(
  postedAt: string,
  type: "credit" | "debit",
  amount: number,
  counterparty: string,
  description: string,
  category: TransactionCategory,
): SeylanTransaction {
  return {
    id: txId(),
    postedAt,
    type,
    amount,
    reference: ref(),
    counterparty,
    description,
    category,
  };
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

export default function getFixtureTransactions(): SeylanTransaction[] {
  _idSeq = 1; // reset so IDs are deterministic on each call

  return [
    // ── December 2025 ────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2025, 12, 2, 10, 30), "credit", 485_000, "Nexus Traders", "Invoice #INV-2025-088 payment — Q4 supply batch", "client_payment"),
    tx(isoDate(2025, 12, 5, 14, 0),  "credit", 320_000, "Summit Retail", "Invoice #INV-2025-089 — Nov retail consignment", "client_payment"),
    tx(isoDate(2025, 12, 12, 9, 15), "credit", 612_000, "Blue Wave Exports", "Export settlement #EXP-2025-041 USD 1,850", "client_payment"),

    // Salaries
    tx(isoDate(2025, 12, 28, 9, 0),  "debit", 385_000, "Staff Payroll Dec 2025", "Monthly salary disbursement — 12 employees", "salaries"),

    // Inventory
    tx(isoDate(2025, 12, 3, 11, 0),  "debit", 248_000, "Janashakthi Distributors", "Raw material batch #RM-445 — polypropylene", "inventory"),
    tx(isoDate(2025, 12, 10, 10, 0), "debit", 185_000, "Cargills Ceylon PLC", "Stock replenishment — consumer goods", "inventory"),
    tx(isoDate(2025, 12, 18, 13, 0), "debit", 124_500, "Unilever Lanka Ltd", "FMCG inventory top-up Dec", "inventory"),

    // Rent
    tx(isoDate(2025, 12, 1, 9, 0),   "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent Dec 2025 — Peliyagoda", "rent"),

    // Logistics
    tx(isoDate(2025, 12, 6, 8, 0),   "debit", 42_500, "Lanka Logistics (Pvt) Ltd", "Delivery batch — Kandy region Dec-1", "logistics"),
    tx(isoDate(2025, 12, 15, 8, 0),  "debit", 38_000, "Lanka Logistics (Pvt) Ltd", "Delivery batch — Southern province Dec-2", "logistics"),

    // Utilities
    tx(isoDate(2025, 12, 8, 10, 0),  "debit", 34_200, "Ceylon Electricity Board", "Monthly electricity — warehouse Dec", "utilities"),

    // Software
    tx(isoDate(2025, 12, 1, 0, 0),   "debit", 12_800, "Dialog Axiata PLC", "Business broadband + SaaS bundle Dec", "software"),

    // Taxes
    tx(isoDate(2025, 12, 20, 9, 0),  "debit", 58_400, "Inland Revenue Dept", "VAT payment — Nov 2025 period", "taxes"),

    // Marketing
    tx(isoDate(2025, 12, 7, 11, 0),  "debit", 28_000, "Meta Platforms Inc", "Facebook/Instagram ad spend Dec", "marketing"),

    // ── January 2026 ─────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2026, 1, 4, 11, 0),   "credit", 540_000, "Nexus Traders", "Invoice #INV-2026-001 — Jan supply batch", "client_payment"),
    tx(isoDate(2026, 1, 9, 14, 30),  "credit", 298_000, "Summit Retail", "Invoice #INV-2026-002 — Dec retail balance", "client_payment"),
    tx(isoDate(2026, 1, 14, 9, 0),   "credit", 445_000, "Blue Wave Exports", "Export settlement #EXP-2026-002 USD 1,350", "client_payment"),

    // Salaries
    tx(isoDate(2026, 1, 29, 9, 0),   "debit", 392_000, "Staff Payroll Jan 2026", "Monthly salary disbursement — 12 employees", "salaries"),

    // Inventory
    tx(isoDate(2026, 1, 6, 10, 30),  "debit", 312_000, "Janashakthi Distributors", "Raw material batch #RM-446 — Q1 stock", "inventory"),
    tx(isoDate(2026, 1, 13, 11, 0),  "debit", 198_500, "Cargills Ceylon PLC", "Consumer goods restock Jan", "inventory"),
    tx(isoDate(2026, 1, 21, 13, 0),  "debit", 88_000, "Hemas Holdings PLC", "Health & personal care lines", "inventory"),

    // Rent
    tx(isoDate(2026, 1, 2, 9, 0),    "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent Jan 2026 — Peliyagoda", "rent"),

    // Logistics
    tx(isoDate(2026, 1, 8, 7, 30),   "debit", 55_000, "Lanka Logistics (Pvt) Ltd", "Jan distribution run — North + East", "logistics"),

    // Utilities
    tx(isoDate(2026, 1, 7, 10, 0),   "debit", 31_800, "Ceylon Electricity Board", "Monthly electricity Jan", "utilities"),

    // Software
    tx(isoDate(2026, 1, 1, 0, 0),    "debit", 14_200, "Dialog Axiata PLC", "Business broadband + SaaS bundle Jan", "software"),

    // Taxes
    tx(isoDate(2026, 1, 20, 9, 0),   "debit", 46_200, "Inland Revenue Dept", "VAT payment — Dec 2025 period", "taxes"),
    tx(isoDate(2026, 1, 22, 9, 0),   "debit", 38_500, "Dept of Labour — EPF", "EPF contribution Dec 2025", "taxes"),

    // Marketing
    tx(isoDate(2026, 1, 5, 11, 0),   "debit", 35_000, "Google LLC", "Google Ads — Jan campaign", "marketing"),

    // ── February 2026 ────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2026, 2, 3, 10, 0),   "credit", 380_000, "Nexus Traders", "Invoice #INV-2026-009 — Feb supply", "client_payment"),
    tx(isoDate(2026, 2, 11, 14, 0),  "credit", 510_000, "Blue Wave Exports", "Export settlement #EXP-2026-007 USD 1,550", "client_payment"),
    tx(isoDate(2026, 2, 18, 9, 30),  "credit", 265_000, "Summit Retail", "Invoice #INV-2026-011 — Jan balance + Feb partial", "client_payment"),

    // Salaries
    tx(isoDate(2026, 2, 27, 9, 0),   "debit", 398_000, "Staff Payroll Feb 2026", "Monthly salary disbursement — 12 employees", "salaries"),

    // Inventory
    tx(isoDate(2026, 2, 4, 10, 0),   "debit", 275_000, "Janashakthi Distributors", "Raw material batch #RM-447", "inventory"),
    tx(isoDate(2026, 2, 12, 11, 30), "debit", 162_000, "Cargills Ceylon PLC", "Feb consumer goods restock", "inventory"),
    tx(isoDate(2026, 2, 20, 13, 0),  "debit", 95_000, "Unilever Lanka Ltd", "FMCG top-up Feb", "inventory"),

    // Rent
    tx(isoDate(2026, 2, 2, 9, 0),    "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent Feb 2026", "rent"),

    // Logistics
    tx(isoDate(2026, 2, 7, 8, 0),    "debit", 48_500, "Lanka Logistics (Pvt) Ltd", "Feb distribution — Central province", "logistics"),
    tx(isoDate(2026, 2, 19, 8, 0),   "debit", 41_000, "Lanka Logistics (Pvt) Ltd", "Feb distribution — Gampaha batch", "logistics"),

    // Utilities
    tx(isoDate(2026, 2, 6, 10, 0),   "debit", 29_400, "Ceylon Electricity Board", "Monthly electricity Feb", "utilities"),
    tx(isoDate(2026, 2, 14, 10, 0),  "debit", 8_500, "National Water Supply Board", "Water usage Feb 2026", "utilities"),

    // Software
    tx(isoDate(2026, 2, 1, 0, 0),    "debit", 14_200, "Dialog Axiata PLC", "Business broadband + SaaS bundle Feb", "software"),

    // Taxes
    tx(isoDate(2026, 2, 20, 9, 0),   "debit", 52_800, "Inland Revenue Dept", "VAT payment — Jan 2026 period", "taxes"),

    // Marketing
    tx(isoDate(2026, 2, 10, 11, 0),  "debit", 22_000, "Meta Platforms Inc", "Facebook/Instagram ad spend Feb", "marketing"),

    // ── March 2026 ───────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2026, 3, 2, 10, 30),  "credit", 620_000, "Nexus Traders", "Invoice #INV-2026-018 — Q1 bulk order", "client_payment"),
    tx(isoDate(2026, 3, 7, 14, 0),   "credit", 195_000, "Summit Retail", "Invoice #INV-2026-019 — March retail", "client_payment"),
    tx(isoDate(2026, 3, 14, 9, 0),   "credit", 480_000, "Blue Wave Exports", "Export settlement #EXP-2026-012 USD 1,450", "client_payment"),

    // Salaries
    tx(isoDate(2026, 3, 28, 9, 0),   "debit", 405_000, "Staff Payroll Mar 2026", "Monthly salary disbursement — 13 employees", "salaries"),

    // Inventory
    tx(isoDate(2026, 3, 3, 10, 0),   "debit", 338_000, "Janashakthi Distributors", "Raw material — Q1 final batch #RM-448", "inventory"),
    tx(isoDate(2026, 3, 10, 11, 0),  "debit", 215_000, "Cargills Ceylon PLC", "Consumer goods — Avurudu season stock", "inventory"),
    tx(isoDate(2026, 3, 18, 13, 30), "debit", 145_000, "Hemas Holdings PLC", "Health products — Avurudu seasonal", "inventory"),
    tx(isoDate(2026, 3, 25, 10, 0),  "debit", 78_500, "Unilever Lanka Ltd", "FMCG seasonal top-up", "inventory"),

    // Rent
    tx(isoDate(2026, 3, 3, 9, 0),    "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent Mar 2026", "rent"),

    // Logistics
    tx(isoDate(2026, 3, 6, 8, 0),    "debit", 62_000, "Lanka Logistics (Pvt) Ltd", "Mar distribution — island-wide Avurudu push", "logistics"),
    tx(isoDate(2026, 3, 22, 8, 0),   "debit", 44_000, "SriLankan Cargo Ltd", "Air cargo — priority export shipment", "logistics"),

    // Utilities
    tx(isoDate(2026, 3, 5, 10, 0),   "debit", 36_800, "Ceylon Electricity Board", "Monthly electricity Mar (AC load increase)", "utilities"),

    // Software
    tx(isoDate(2026, 3, 1, 0, 0),    "debit", 14_200, "Dialog Axiata PLC", "Business broadband + SaaS bundle Mar", "software"),
    tx(isoDate(2026, 3, 15, 10, 0),  "debit", 28_500, "Microsoft Corp", "Microsoft 365 Business — annual renewal", "software"),

    // Taxes
    tx(isoDate(2026, 3, 20, 9, 0),   "debit", 61_400, "Inland Revenue Dept", "VAT payment — Feb 2026 period", "taxes"),
    tx(isoDate(2026, 3, 21, 9, 0),   "debit", 42_800, "Dept of Labour — EPF", "EPF + ETF contribution Feb 2026", "taxes"),

    // Marketing
    tx(isoDate(2026, 3, 8, 11, 0),   "debit", 55_000, "Meta Platforms Inc", "Avurudu campaign — Facebook + Instagram", "marketing"),
    tx(isoDate(2026, 3, 12, 11, 0),  "debit", 32_000, "Google LLC", "Avurudu Google Ads campaign", "marketing"),

    // ── April 2026 ───────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2026, 4, 4, 10, 0),   "credit", 425_000, "Nexus Traders", "Invoice #INV-2026-028 — Apr supply batch", "client_payment"),
    tx(isoDate(2026, 4, 10, 9, 30),  "credit", 342_000, "Blue Wave Exports", "Export settlement #EXP-2026-018 USD 1,040", "client_payment"),
    tx(isoDate(2026, 4, 17, 14, 0),  "credit", 178_000, "Summit Retail", "Invoice #INV-2026-031 — post-Avurudu settle", "client_payment"),

    // Salaries
    tx(isoDate(2026, 4, 29, 9, 0),   "debit", 405_000, "Staff Payroll Apr 2026", "Monthly salary disbursement — 13 employees", "salaries"),

    // Inventory
    tx(isoDate(2026, 4, 5, 10, 0),   "debit", 228_000, "Janashakthi Distributors", "Raw material batch #RM-449 — Apr", "inventory"),
    tx(isoDate(2026, 4, 14, 11, 0),  "debit", 188_500, "Cargills Ceylon PLC", "Post-Avurudu restock", "inventory"),
    tx(isoDate(2026, 4, 22, 13, 0),  "debit", 92_000, "Unilever Lanka Ltd", "FMCG Apr top-up", "inventory"),

    // Rent
    tx(isoDate(2026, 4, 1, 9, 0),    "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent Apr 2026", "rent"),

    // Logistics
    tx(isoDate(2026, 4, 8, 8, 0),    "debit", 51_500, "Lanka Logistics (Pvt) Ltd", "Apr distribution — Western province", "logistics"),

    // Utilities
    tx(isoDate(2026, 4, 7, 10, 0),   "debit", 33_200, "Ceylon Electricity Board", "Monthly electricity Apr", "utilities"),

    // Software
    tx(isoDate(2026, 4, 1, 0, 0),    "debit", 14_200, "Dialog Axiata PLC", "Business broadband + SaaS bundle Apr", "software"),

    // Taxes
    tx(isoDate(2026, 4, 20, 9, 0),   "debit", 54_600, "Inland Revenue Dept", "VAT payment — Mar 2026 period", "taxes"),

    // ── May 2026 ─────────────────────────────────────────────────────────────

    // Credits
    tx(isoDate(2026, 5, 2, 10, 0),   "credit", 395_000, "Nexus Traders", "Invoice #INV-2026-038 — May supply partial", "client_payment"),
    tx(isoDate(2026, 5, 8, 14, 0),   "credit", 285_000, "Blue Wave Exports", "Export settlement #EXP-2026-023 USD 865", "client_payment"),

    // Salaries
    tx(isoDate(2026, 5, 29, 9, 0),   "debit", 412_000, "Staff Payroll May 2026", "Monthly salary disbursement — 13 employees", "salaries"),

    // Inventory
    tx(isoDate(2026, 5, 5, 10, 0),   "debit", 195_000, "Janashakthi Distributors", "Raw material batch #RM-450 — May", "inventory"),
    tx(isoDate(2026, 5, 12, 11, 0),  "debit", 142_000, "Cargills Ceylon PLC", "Consumer goods May restock", "inventory"),

    // Rent
    tx(isoDate(2026, 5, 2, 9, 0),    "debit", 95_000, "Colombo Commercial Properties", "Warehouse rent May 2026", "rent"),

    // Logistics
    tx(isoDate(2026, 5, 7, 8, 0),    "debit", 46_000, "Lanka Logistics (Pvt) Ltd", "May distribution run", "logistics"),

    // Utilities
    tx(isoDate(2026, 5, 6, 10, 0),   "debit", 31_500, "Ceylon Electricity Board", "Monthly electricity May", "utilities"),

    // Software
    tx(isoDate(2026, 5, 1, 0, 0),    "debit", 14_200, "Dialog Axiata PLC", "Business broadband + SaaS bundle May", "software"),

    // Taxes
    tx(isoDate(2026, 5, 20, 9, 0),   "debit", 48_200, "Inland Revenue Dept", "VAT payment — Apr 2026 period", "taxes"),
    tx(isoDate(2026, 5, 21, 9, 0),   "debit", 45_600, "Dept of Labour — EPF", "EPF + ETF contribution Apr 2026", "taxes"),

    // Marketing
    tx(isoDate(2026, 5, 10, 11, 0),  "debit", 18_500, "Meta Platforms Inc", "Facebook ad spend May", "marketing"),
  ].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()); // newest first
}
