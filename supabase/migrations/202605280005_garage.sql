-- Migration 202605280005_garage.sql

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plate text not null,
  brand text not null,
  model text not null,
  year int,
  km int default 0,
  last_service_date date,
  next_service_km int default 0,
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.vehicles enable row level security;

create policy "Organization can read vehicles"
  on public.vehicles for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert vehicles"
  on public.vehicles for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update vehicles"
  on public.vehicles for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete vehicles"
  on public.vehicles for delete using (organization_id = auth.uid()::uuid);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null,
  description text,
  date date not null,
  cost numeric default 0,
  parts_used jsonb default '[]'::jsonb,
  status text not null check (status in ('devis','en cours','terminé','livré')),
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.interventions enable row level security;

create policy "Organization can read interventions"
  on public.interventions for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert interventions"
  on public.interventions for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update interventions"
  on public.interventions for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete interventions"
  on public.interventions for delete using (organization_id = auth.uid()::uuid);
