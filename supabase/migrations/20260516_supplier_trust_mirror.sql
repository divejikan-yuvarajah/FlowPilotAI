-- FlowPilot AI — Supplier Trust Mirror
-- Migration: suppliers + supplier_obligations tables
--
-- Run via Supabase dashboard SQL editor or:
--   supabase db push

-- ─── Suppliers ────────────────────────────────────────────────────────────────

create table if not exists public.suppliers (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  name                      text not null,
  business_type             text not null,           -- e.g. logistics, inventory, utilities
  payment_reliability_score integer not null default 70 check (payment_reliability_score between 0 and 100),
  trend                     text not null default 'stable' check (trend in ('improving', 'stable', 'worsening')),
  relationship_status       text not null default 'active' check (relationship_status in ('active', 'strained', 'critical', 'excellent')),
  notes                     text,
  ai_relationship_insight   text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "Users can manage their own suppliers"
  on public.suppliers for all
  using (auth.uid() = user_id);

-- ─── Supplier Obligations ─────────────────────────────────────────────────────

create table if not exists public.supplier_obligations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  reference    text not null,
  amount       numeric(12, 2) not null check (amount > 0),
  due_date     date not null,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  paid_at      timestamptz,
  paid_amount  numeric(12, 2),
  description  text,
  created_at   timestamptz not null default now()
);

alter table public.supplier_obligations enable row level security;

create policy "Users can manage their own supplier obligations"
  on public.supplier_obligations for all
  using (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_suppliers_user_id on public.suppliers(user_id);
create index if not exists idx_supplier_obligations_user_id on public.supplier_obligations(user_id);
create index if not exists idx_supplier_obligations_supplier_id on public.supplier_obligations(supplier_id);
create index if not exists idx_supplier_obligations_status on public.supplier_obligations(status);
create index if not exists idx_supplier_obligations_due_date on public.supplier_obligations(due_date);
