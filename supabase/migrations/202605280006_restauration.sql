-- Migration 202605280006_restauration.sql

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  unit text not null,
  stock_qty numeric default 0,
  min_qty numeric default 0,
  supplier text,
  allergens text[] default array[]::text[],
  expiry_date date,
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.ingredients enable row level security;

create policy "Organization can read ingredients"
  on public.ingredients for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert ingredients"
  on public.ingredients for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update ingredients"
  on public.ingredients for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete ingredients"
  on public.ingredients for delete using (organization_id = auth.uid()::uuid);

create table if not exists public.haccp_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zone text not null,
  check_type text not null,
  value text not null,
  unit text not null,
  result text not null check (result in ('conforme','non_conforme')),
  checked_by text not null,
  checked_at timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.haccp_checks enable row level security;

create policy "Organization can read haccp checks"
  on public.haccp_checks for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert haccp checks"
  on public.haccp_checks for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update haccp checks"
  on public.haccp_checks for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete haccp checks"
  on public.haccp_checks for delete using (organization_id = auth.uid()::uuid);
