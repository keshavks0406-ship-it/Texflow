create index if not exists quality_inspections_factory_org_fk_idx
  on public.quality_inspections (factory_id, organization_id);
create index if not exists quality_inspections_job_scope_fk_idx
  on public.quality_inspections (job_order_id, organization_id, factory_id);