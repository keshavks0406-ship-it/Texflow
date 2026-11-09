-- TexFlow initial schema
-- Run this file in Supabase Dashboard > SQL Editor.
-- Row Level Security is enabled on every business table.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.factories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  gstin text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_number text not null,
  fabric_type text not null,
  received_weight_kg numeric(12,2) not null check (received_weight_kg >= 0),
  expected_delivery_date date,
  status text not null default 'received' check (status in ('received','in_production','completed','dispatched','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table if not exists public.production_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid references public.factories(id) on delete set null,
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  production_date date not null default current_date,
  input_weight_kg numeric(12,2) not null check (input_weight_kg >= 0),
  output_weight_kg numeric(12,2) not null check (output_weight_kg >= 0),
  machine_name text,
  shift text,
  notes text,
  created_at timestamptz not null default now(),
  check (output_weight_kg <= input_weight_kg)
);

create table if not exists public.dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  dispatch_date date not null default current_date,
  weight_kg numeric(12,2) not null check (weight_kg > 0),
  vehicle_number text,
  delivery_note_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  payment_mode text,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_factories_org on public.factories(organization_id);
create index if not exists idx_customers_org on public.customers(organization_id);
create index if not exists idx_job_orders_org_status on public.job_orders(organization_id, status);
create index if not exists idx_production_org_date on public.production_entries(organization_id, production_date);
create index if not exists idx_dispatches_org_date on public.dispatches(organization_id, dispatch_date);
create index if not exists idx_expenses_org_date on public.expenses(organization_id, expense_date);

-- Security-definer membership check avoids recursive RLS policy evaluation.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- Automatically make the creator an owner when creating an organization.
create or replace function public.add_org_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
after insert on public.organizations
for each row execute function public.add_org_creator_as_owner();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.factories enable row level security;
alter table public.customers enable row level security;
alter table public.job_orders enable row level security;
alter table public.production_entries enable row level security;
alter table public.dispatches enable row level security;
alter table public.expenses enable row level security;

create policy "Users can read their organizations" on public.organizations
for select to authenticated using (public.is_org_member(id));
create policy "Authenticated users can create their own organization" on public.organizations
for insert to authenticated with check (created_by = auth.uid());
create policy "Owners and admins can update organizations" on public.organizations
for update to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = auth.uid() and m.role in ('owner','admin'))
) with check (public.is_org_member(id));

create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "Users can create own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can view organization membership" on public.organization_members
for select to authenticated using (public.is_org_member(organization_id));
-- Membership creation is performed by the organization trigger; client-side inserts are intentionally not allowed.

create policy "Members manage factories" on public.factories
for all to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
create policy "Members manage customers" on public.customers
for all to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
create policy "Members manage job orders" on public.job_orders
for all to authenticated using (public.is_org_member(organization_id))
with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.customers c where c.id = customer_id and c.organization_id = job_orders.organization_id)
  and (factory_id is null or exists (select 1 from public.factories f where f.id = factory_id and f.organization_id = job_orders.organization_id))
);
create policy "Members manage production entries" on public.production_entries
for all to authenticated using (public.is_org_member(organization_id))
with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.job_orders j where j.id = job_order_id and j.organization_id = production_entries.organization_id)
);
create policy "Members manage dispatches" on public.dispatches
for all to authenticated using (public.is_org_member(organization_id))
with check (
  public.is_org_member(organization_id)
  and exists (select 1 from public.job_orders j where j.id = job_order_id and j.organization_id = dispatches.organization_id)
);
create policy "Members manage expenses" on public.expenses
for all to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.organizations, public.profiles, public.factories,
  public.customers, public.job_orders, public.production_entries, public.dispatches, public.expenses
to authenticated;
grant select on public.organization_members to authenticated;
