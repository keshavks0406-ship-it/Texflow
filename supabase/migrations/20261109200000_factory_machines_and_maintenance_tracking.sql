-- Factory-scoped machine register and maintenance history.
create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  machine_code text not null,
  machine_name text not null,
  machine_type text not null default 'Compacting',
  manufacturer text,
  model text,
  installation_date date,
  status text not null default 'Operational'
    check (status in ('Operational', 'Under maintenance', 'Breakdown', 'Inactive')),
  notes text,
  created_at timestamptz not null default now(),
  constraint machines_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade,
  constraint machines_code_factory_unique unique (organization_id, factory_id, machine_code),
  constraint machines_id_scope_unique unique (id, organization_id, factory_id)
);

create table if not exists public.machine_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  machine_id uuid not null,
  maintenance_number text not null,
  maintenance_date date not null default current_date,
  maintenance_type text not null default 'Preventive'
    check (maintenance_type in ('Preventive', 'Breakdown', 'Repair', 'Inspection')),
  issue_reported text,
  work_performed text,
  downtime_hours numeric(10,2) not null default 0 check (downtime_hours >= 0),
  maintenance_cost numeric(12,2) not null default 0 check (maintenance_cost >= 0),
  technician_name text,
  status text not null default 'Open'
    check (status in ('Open', 'In progress', 'Completed')),
  next_service_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint maintenance_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade,
  constraint maintenance_machine_scope_fk
    foreign key (machine_id, organization_id, factory_id)
    references public.machines (id, organization_id, factory_id) on delete cascade,
  constraint maintenance_number_factory_unique unique (organization_id, factory_id, maintenance_number)
);

create index if not exists machines_factory_status_idx
  on public.machines (organization_id, factory_id, status);
create index if not exists machine_maintenance_factory_date_idx
  on public.machine_maintenance_logs (organization_id, factory_id, maintenance_date desc);
create index if not exists machine_maintenance_machine_scope_idx
  on public.machine_maintenance_logs (machine_id, organization_id, factory_id);

alter table public.machines enable row level security;
alter table public.machine_maintenance_logs enable row level security;

create policy "Members manage factory machines"
  on public.machines for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy "Members manage factory maintenance logs"
  on public.machine_maintenance_logs for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

grant select, insert, update, delete on public.machines to authenticated;
grant select, insert, update, delete on public.machine_maintenance_logs to authenticated;
revoke all on public.machines from anon;
revoke all on public.machine_maintenance_logs from anon;
