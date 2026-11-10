create index if not exists factory_notifications_factory_org_fk_idx
  on public.factory_notifications (factory_id, organization_id);