-- ============================================================
-- Atelier Logistique — Supabase Schema v1.0
-- Multi-tenant SaaS with RLS isolation
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Mirror of auth.users with public fields
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz default now()
);

-- Sync profiles on user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy "Users see own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ─── Organizations ────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  billing_status         text not null default 'trialing'
                           check (billing_status in ('active','trialing','past_due','canceled','none')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  trial_ends_at          timestamptz default (now() + interval '14 days'),
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table public.organizations enable row level security;

-- Members can read their organization
create policy "Members read org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = id and m.user_id = auth.uid()
    )
  );

-- Only owners/admins can update
create policy "Owners update org"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- Users can create organizations
create policy "Users create org"
  on public.organizations for insert with check (true);

-- ─── Memberships ─────────────────────────────────────────────────────────────

create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member'
                    check (role in ('owner','admin','member')),
  created_at      timestamptz default now(),
  unique (organization_id, user_id)
);

alter table public.memberships enable row level security;

create policy "Members read memberships"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = organization_id and m2.user_id = auth.uid()
    )
  );

create policy "Users insert own membership"
  on public.memberships for insert with check (user_id = auth.uid());

create policy "Owners manage memberships"
  on public.memberships for all
  using (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = organization_id
        and m2.user_id = auth.uid()
        and m2.role in ('owner','admin')
    )
  );

-- ─── Invitations ─────────────────────────────────────────────────────────────

create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'member'
                    check (role in ('admin','member')),
  status          text not null default 'pending'
                    check (status in ('pending','accepted','expired')),
  token           text not null default encode(gen_random_bytes(32), 'hex') unique,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz default now()
);

alter table public.invitations enable row level security;

create policy "Admins manage invitations"
  on public.invitations for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- Anyone can read invitation by token (for accept flow)
create policy "Anyone read by token"
  on public.invitations for select
  using (true);

-- ─── Tasks ───────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'todo'
                    check (status in ('todo','in_progress','done')),
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high')),
  due_date        timestamptz,
  assigned_to     uuid references auth.users(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.tasks (organization_id, archived_at, status);
create index on public.tasks (organization_id, due_date);

alter table public.tasks enable row level security;

create policy "Members read tasks"
  on public.tasks for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members write tasks"
  on public.tasks for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─── Documents ───────────────────────────────────────────────────────────────

create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  category        text not null default 'other'
                    check (category in ('invoice','receipt','part','manual','delivery','other')),
  photo_url       text,
  photo_path      text,
  notes           text,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.documents (organization_id, archived_at, category);

alter table public.documents enable row level security;

create policy "Members read documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members write documents"
  on public.documents for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─── Alerts intelligentes ─────────────────────────────────────────────────────

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

-- ─── Parts ───────────────────────────────────────────────────────────────────

create table if not exists public.parts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  reference       text,
  quantity        integer not null default 0 check (quantity >= 0),
  alert_threshold integer not null default 2 check (alert_threshold >= 0),
  unit            text,
  location        text,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.parts (organization_id, archived_at);

alter table public.parts enable row level security;

create policy "Members read parts"
  on public.parts for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members write parts"
  on public.parts for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create trigger parts_updated_at
  before update on public.parts
  for each row execute function public.set_updated_at();

-- ─── Stock Movements (append-only) ───────────────────────────────────────────

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id         uuid not null references public.parts(id) on delete cascade,
  type            text not null check (type in ('in','out','adjustment')),
  quantity        integer not null check (quantity > 0),
  reason          text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now()
  -- No updated_at: append-only log
);

create index on public.stock_movements (organization_id, part_id, created_at desc);

alter table public.stock_movements enable row level security;

create policy "Members read movements"
  on public.stock_movements for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy "Members insert movements"
  on public.stock_movements for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE on movements — append-only

-- ─── Storage Bucket ──────────────────────────────────────────────────────────
-- Run this in Supabase Dashboard > Storage > New bucket
-- Name: documents, Public: true (or false + signed URLs)

-- Storage policies (add in Dashboard > Storage > Policies)
-- INSERT: auth.role() = 'authenticated'
-- SELECT: true (public) or auth.role() = 'authenticated'

-- ─── Useful views ────────────────────────────────────────────────────────────

-- Tasks with assignee info
create or replace view public.tasks_with_assignee as
  select t.*, p.email as assignee_email, p.full_name as assignee_name
  from public.tasks t
  left join public.profiles p on p.id = t.assigned_to
  where t.archived_at is null;

-- Stock alert view
create or replace view public.stock_alerts as
  select p.*, o.name as organization_name
  from public.parts p
  join public.organizations o on o.id = p.organization_id
  where p.archived_at is null
    and p.quantity <= p.alert_threshold;

-- ─── Seed test data (optional — comment out in production) ───────────────────
-- INSERT INTO organizations (name, slug) VALUES ('Test Garage', 'test-garage');
