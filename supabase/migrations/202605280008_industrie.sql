-- Migration 202605280008_industrie.sql

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  reference text not null,
  location text,
  install_date date,
  last_maintenance date,
  next_maintenance date,
  status text not null check (status in ('opérationnel','en panne','maintenance')),
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.machines enable row level security;

create policy "Organization can read machines"
  on public.machines for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert machines"
  on public.machines for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update machines"
  on public.machines for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete machines"
  on public.machines for delete using (organization_id = auth.uid()::uuid);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  type text not null check (type in ('préventive','corrective')),
  description text,
  technician text,
  duration_minutes int default 0,
  parts_used jsonb default '[]'::jsonb,
  date date not null,
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.maintenance_logs enable row level security;

create policy "Organization can read maintenance logs"
  on public.maintenance_logs for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert maintenance logs"
  on public.maintenance_logs for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update maintenance logs"
  on public.maintenance_logs for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete maintenance logs"
  on public.maintenance_logs for delete using (organization_id = auth.uid()::uuid);
