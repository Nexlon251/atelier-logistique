-- Migration 202605280007_transport.sql

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  date date not null,
  driver text,
  vehicle text,
  status text not null check (status in ('prévue','en cours','terminée')),
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.routes enable row level security;

create policy "Organization can read routes"
  on public.routes for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert routes"
  on public.routes for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update routes"
  on public.routes for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete routes"
  on public.routes for delete using (organization_id = auth.uid()::uuid);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  address text not null,
  lat numeric,
  lng numeric,
  order_index int not null,
  status text not null check (status in ('à livrer','livré','absent')),
  notes text,
  arrived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.stops enable row level security;

create policy "Organization can read stops"
  on public.stops for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert stops"
  on public.stops for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update stops"
  on public.stops for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete stops"
  on public.stops for delete using (organization_id = auth.uid()::uuid);
