create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_factory_scope_fk foreign key (factory_id, organization_id) references public.factories (id, organization_id) on delete cascade
);
create index if not exists push_subscriptions_user_factory_idx on public.push_subscriptions (user_id, organization_id, factory_id, is_active);
create index if not exists push_subscriptions_factory_org_fk_idx on public.push_subscriptions (factory_id, organization_id);
create index if not exists push_subscriptions_organization_id_fk_idx on public.push_subscriptions (organization_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions" on public.push_subscriptions for all to authenticated
using ((select auth.uid()) = user_id and (select private.is_org_member(organization_id)))
with check ((select auth.uid()) = user_id and (select private.is_org_member(organization_id)));
grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;