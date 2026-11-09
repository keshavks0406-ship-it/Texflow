-- Quality inspection register with organization and factory isolation.
create unique index if not exists job_orders_quality_scope_uq
  on public.job_orders (id, organization_id, factory_id);

create table if not exists public.quality_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  job_order_id uuid not null,
  inspection_number text not null,
  inspection_date date not null default current_date,
  inspection_stage text not null default 'Final'
    check (inspection_stage in ('Incoming', 'In-process', 'Final')),
  inspected_weight_kg numeric(12,2) not null check (inspected_weight_kg > 0),
  accepted_weight_kg numeric(12,2) not null default 0 check (accepted_weight_kg >= 0),
  rejected_weight_kg numeric(12,2) not null default 0 check (rejected_weight_kg >= 0),
  fabric_width_cm numeric(8,2) check (fabric_width_cm is null or fabric_width_cm > 0),
  gsm numeric(8,2) check (gsm is null or gsm > 0),
  shrinkage_percent numeric(6,2) check (shrinkage_percent is null or shrinkage_percent between -100 and 100),
  status text not null default 'Pending'
    check (status in ('Approved', 'Rejected', 'Rework', 'Pending')),
  defect_type text,
  inspected_by text,
  notes text,
  created_at timestamptz not null default now(),
  constraint quality_inspections_quantity_check
    check (accepted_weight_kg + rejected_weight_kg <= inspected_weight_kg),
  constraint quality_inspections_number_org_unique unique (organization_id, factory_id, inspection_number),
  constraint quality_inspections_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade,
  constraint quality_inspections_job_scope_fk
    foreign key (job_order_id, organization_id, factory_id)
    references public.job_orders (id, organization_id, factory_id) on delete cascade
);

create index if not exists idx_quality_inspections_factory_date
  on public.quality_inspections (organization_id, factory_id, inspection_date desc);
create index if not exists idx_quality_inspections_job_order
  on public.quality_inspections (job_order_id);

alter table public.quality_inspections enable row level security;
create policy "Members manage factory quality inspections"
  on public.quality_inspections for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

grant select, insert, update, delete on public.quality_inspections to authenticated;
revoke all on public.quality_inspections from anon;
