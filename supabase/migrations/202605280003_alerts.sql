-- Migration 202605280003_alerts.sql

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('stock_low','task_overdue','movement_anomaly','general')),
  severity text not null check (severity in ('critical','attention','info')),
  message text not null,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "Members read alerts"
  on public.alerts for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members insert alerts"
  on public.alerts for insert with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members update alerts"
  on public.alerts for update using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create index if not exists alerts_org_read_idx on public.alerts (organization_id, read_at);
