create table if not exists public.factory_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  alert_key text not null,
  category text not null check (category in ('Inventory','Job orders','Documents','Maintenance','Production')),
  severity text not null check (severity in ('critical','high','medium','low')),
  title text not null,
  message text not null,
  action_page text not null check (action_page in ('inventory','orders','documents','maintenance','planning')),
  source_id uuid,
  is_read boolean not null default false,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint factory_notifications_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade,
  constraint factory_notifications_alert_key_uq unique (factory_id, alert_key)
);
create index if not exists factory_notifications_active_idx
  on public.factory_notifications (organization_id, factory_id, is_active, is_read, created_at desc);
create index if not exists factory_notifications_severity_idx
  on public.factory_notifications (organization_id, factory_id, severity, created_at desc);
alter table public.factory_notifications enable row level security;
drop policy if exists "Members manage factory notifications" on public.factory_notifications;
create policy "Members manage factory notifications"
  on public.factory_notifications for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
grant select, insert, update, delete on public.factory_notifications to authenticated;
revoke all on public.factory_notifications from anon;