-- ============================================================
-- Migration V2 – atelier-logistique SaaS
-- Date   : 2026-05-28
-- Mode   : ADDITIVE – ne touche pas aux tables existantes
-- ============================================================

-- ─── 1. Clés API publiques ────────────────────────────────────────────────────
-- Permet à une organisation d'exposer une API REST sécurisée
-- (ex : intégration ERP, DMS externe, scan douchette IP)

create table if not exists public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,                        -- libellé lisible
  key_prefix      text not null,                        -- 8 premiers chars affichés en clair
  key_hash        text not null unique,                 -- SHA-256 de la clé complète
  permissions     text[] not null default '{}',         -- ex: ['stock:read','tasks:read']
  last_used_at    timestamptz,
  expires_at      timestamptz,                          -- null = pas d'expiration
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz                           -- null = active
);

-- Index pour lookup rapide par hash (authentification inbound)
create unique index if not exists api_keys_hash_idx on public.api_keys(key_hash)
  where revoked_at is null;

-- Index pour lister les clés d'une org
create index if not exists api_keys_org_idx on public.api_keys(organization_id);

-- RLS
alter table public.api_keys enable row level security;

create policy "org members can manage api keys"
  on public.api_keys
  for all
  using (
    organization_id in (
      select organization_id from public.memberships
      where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.memberships
      where user_id = auth.uid()
    )
  );

-- ─── 2. Push tokens ───────────────────────────────────────────────────────────
-- Stocke les tokens Expo / FCM / APNs pour les notifications push

create table if not exists public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  token           text not null,
  platform        text not null check (platform in ('ios', 'android', 'web')),
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_org_idx on public.push_tokens(organization_id);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Un utilisateur gère ses propres tokens
create policy "users manage own push tokens"
  on public.push_tokens
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Les admins/owners peuvent lire les tokens de leur org (pour broadcast)
create policy "org admins can read org tokens"
  on public.push_tokens
  for select
  using (
    organization_id in (
      select organization_id from public.memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ─── 3. Notifications in-app ─────────────────────────────────────────────────
-- Journal des notifications envoyées (push + in-app)

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,  -- null = broadcast org
  type            text not null,          -- 'stock_alert' | 'task_due' | 'invite' | 'billing'
  title           text not null,
  body            text,
  data            jsonb,                  -- payload arbitraire (part_id, task_id…)
  read_at         timestamptz,
  sent_at         timestamptz not null default now()
);

create index if not exists notifications_user_idx  on public.notifications(user_id) where read_at is null;
create index if not exists notifications_org_idx   on public.notifications(organization_id);

alter table public.notifications enable row level security;

create policy "users see own notifications"
  on public.notifications
  for select
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and organization_id in (
        select organization_id from public.memberships
        where user_id = auth.uid()
      )
    )
  );

create policy "users mark own notifications read"
  on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Seuls les Edge Functions (service_role) peuvent insérer des notifs
-- Les clients n'ont pas de policy INSERT → ils passent par les fonctions serveur

-- ─── 4. Colonnes additives sur tables existantes ──────────────────────────────

-- Barcode sur les pièces (scan code-barres expo-camera)
alter table public.parts
  add column if not exists barcode text;

create index if not exists parts_barcode_idx on public.parts(barcode)
  where barcode is not null;

-- Couleur d'étiquette sur les tâches (UI calendrier)
alter table public.tasks
  add column if not exists label_color text
  check (label_color ~ '^#[0-9A-Fa-f]{6}$' or label_color is null);

-- ─── 5. Vue matérialisée : snapshot KPIs par org ──────────────────────────────
-- Rafraîchie par cron ou après chaque mutation importante

create materialized view if not exists public.org_kpis as
select
  o.id                                                   as organization_id,
  o.name                                                 as organization_name,
  coalesce(t.total, 0)                                   as tasks_total,
  coalesce(t.todo, 0)                                    as tasks_todo,
  coalesce(t.in_progress, 0)                             as tasks_in_progress,
  coalesce(t.done, 0)                                    as tasks_done,
  coalesce(t.overdue, 0)                                 as tasks_overdue,
  coalesce(p.total, 0)                                   as parts_total,
  coalesce(p.alert, 0)                                   as parts_alert,
  coalesce(p.out_of_stock, 0)                            as parts_out_of_stock,
  coalesce(m.last7d, 0)                                  as movements_last7d,
  now()                                                  as computed_at
from public.organizations o
left join lateral (
  select
    count(*)                                             as total,
    count(*) filter (where status = 'todo')              as todo,
    count(*) filter (where status = 'in_progress')       as in_progress,
    count(*) filter (where status = 'done')              as done,
    count(*) filter (
      where status != 'done'
        and due_date < now()
        and archived_at is null
    )                                                    as overdue
  from public.tasks
  where organization_id = o.id and archived_at is null
) t on true
left join lateral (
  select
    count(*)                                             as total,
    count(*) filter (where quantity <= alert_threshold)  as alert,
    count(*) filter (where quantity = 0)                 as out_of_stock
  from public.parts
  where organization_id = o.id and archived_at is null
) p on true
left join lateral (
  select count(*) filter (
    where created_at >= now() - interval '7 days'
  ) as last7d
  from public.stock_movements
  where organization_id = o.id
) m on true;

create unique index if not exists org_kpis_org_idx on public.org_kpis(organization_id);

-- ─── 6. Fonction helper : rafraîchir les KPIs ────────────────────────────────
create or replace function public.refresh_org_kpis()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently public.org_kpis;
$$;

-- ─── 7. Commentaires ─────────────────────────────────────────────────────────
comment on table  public.api_keys      is 'Clés API par organisation – authentification inbound';
comment on table  public.push_tokens   is 'Tokens push Expo/FCM/APNs par utilisateur';
comment on table  public.notifications is 'Journal des notifications in-app et push';
comment on column public.parts.barcode is 'Code-barres EAN-13/QR scanné par expo-camera';
