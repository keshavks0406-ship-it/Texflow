create index if not exists machines_factory_org_fk_idx
  on public.machines (factory_id, organization_id);
create index if not exists maintenance_factory_org_fk_idx
  on public.machine_maintenance_logs (factory_id, organization_id);