-- Production planning and machine allocation.
create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  job_order_id uuid not null,
  machine_id uuid not null,
  supervisor_id uuid,
  planned_date date not null,
  shift text not null default 'Day' check (shift in ('Day','Evening','Night')),
  planned_input_kg numeric(12,2) not null check (planned_input_kg > 0),
  planned_output_kg numeric(12,2) not null check (planned_output_kg >= 0 and planned_output_kg <= planned_input_kg),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_plans_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade,
  constraint production_plans_job_order_scope_fk
    foreign key (job_order_id, organization_id, factory_id)
    references public.job_orders (id, organization_id, factory_id) on delete cascade,
  constraint production_plans_machine_scope_fk
    foreign key (machine_id, organization_id, factory_id)
    references public.machines (id, organization_id, factory_id) on delete restrict,
  constraint production_plans_supervisor_scope_fk
    foreign key (supervisor_id, organization_id, factory_id)
    references public.employees (id, organization_id, factory_id)
    on delete set null (supervisor_id)
);
create index if not exists production_plans_factory_date_idx
  on public.production_plans (organization_id, factory_id, planned_date, status);
create index if not exists production_plans_machine_date_idx
  on public.production_plans (machine_id, planned_date, shift);
create index if not exists production_plans_job_order_idx
  on public.production_plans (job_order_id, planned_date);
create unique index if not exists production_plans_machine_slot_uq
  on public.production_plans (organization_id, factory_id, machine_id, planned_date, shift)
  where status <> 'cancelled';
create index if not exists production_plans_factory_scope_fk_idx
  on public.production_plans (factory_id, organization_id);
create index if not exists production_plans_job_order_scope_fk_idx
  on public.production_plans (job_order_id, organization_id, factory_id);
create index if not exists production_plans_machine_scope_fk_idx
  on public.production_plans (machine_id, organization_id, factory_id);
create index if not exists production_plans_supervisor_scope_fk_idx
  on public.production_plans (supervisor_id, organization_id, factory_id);
alter table public.production_plans enable row level security;
drop policy if exists "Members manage factory production plans" on public.production_plans;
create policy "Members manage factory production plans"
  on public.production_plans for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
grant select, insert, update, delete on public.production_plans to authenticated;
revoke all on public.production_plans from anon;
