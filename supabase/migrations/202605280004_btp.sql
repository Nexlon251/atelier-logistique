-- Migration 202605280004_btp.sql

create table if not exists public.worksites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('en cours','terminé','en retard')),
  budget numeric not null default 0,
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table public.worksites enable row level security;

create policy "Organization can read worksites"
  on public.worksites for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert worksites"
  on public.worksites for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update worksites"
  on public.worksites for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete worksites"
  on public.worksites for delete using (organization_id = auth.uid()::uuid);

create table if not exists public.worksite_tasks (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid not null references public.worksites(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  assigned_to uuid,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('planifié','terminé','en retard')),
  depends_on uuid[] default array[]::uuid[],
  created_at timestamptz default now()
);

alter table public.worksite_tasks enable row level security;

create policy "Organization can read worksite tasks"
  on public.worksite_tasks for select
  using (organization_id = auth.uid()::uuid or exists (select 1 from public.memberships m where m.organization_id = organization_id and m.user_id = auth.uid()));

create policy "Organization can insert worksite tasks"
  on public.worksite_tasks for insert with check (organization_id = auth.uid()::uuid);

create policy "Organization can update worksite tasks"
  on public.worksite_tasks for update using (organization_id = auth.uid()::uuid) with check (organization_id = auth.uid()::uuid);

create policy "Organization can delete worksite tasks"
  on public.worksite_tasks for delete using (organization_id = auth.uid()::uuid);
