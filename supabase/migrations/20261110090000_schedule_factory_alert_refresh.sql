-- Hourly server-side refresh of TexFlow factory alerts.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.refresh_factory_notifications()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  drop table if exists pg_temp.texflow_notification_drafts;

  create temporary table texflow_notification_drafts
  on commit drop
  as
  with stock_balances as (
    select item_id,
      sum(case when transaction_type in ('purchase','adjustment_in')
        then quantity else -quantity end) as balance
    from public.inventory_transactions
    group by item_id
  ),
  production_actuals as (
    select job_order_id, production_date, sum(output_weight_kg) as output_kg
    from public.production_entries
    group by job_order_id, production_date
  )
  select
    i.organization_id, i.factory_id, 'stock:'||i.id::text as alert_key,
    'Inventory'::text as category,
    case when coalesce(b.balance,0)<=0 then 'critical' else 'high' end as severity,
    case when coalesce(b.balance,0)<=0 then 'Stock exhausted' else 'Low stock warning' end as title,
    i.item_name||' is at '||to_char(coalesce(b.balance,0),'FM999999999990D99')||' '||i.unit||
      '; reorder level is '||to_char(i.reorder_level,'FM999999999990D99')||' '||i.unit||'.' as message,
    'inventory'::text as action_page, i.id as source_id
  from public.inventory_items i
  left join stock_balances b on b.item_id=i.id
  where coalesce(b.balance,0)<=i.reorder_level

  union all
  select j.organization_id,j.factory_id,
    case when j.expected_delivery_date<current_date then 'order-overdue:' else 'order-due:' end||j.id::text,
    'Job orders',
    case when j.expected_delivery_date<current_date or j.expected_delivery_date=current_date then 'critical' else 'medium' end,
    case when j.expected_delivery_date<current_date then 'Job order overdue'
         when j.expected_delivery_date=current_date then 'Job order due today' else 'Job order due soon' end,
    j.order_number||case when j.expected_delivery_date<current_date
      then ' was due '||to_char(j.expected_delivery_date,'DD Mon YYYY')||'.'
      when j.expected_delivery_date=current_date then ' is due today.'
      else ' is due in '||(j.expected_delivery_date-current_date)::text||' days.' end||
      ' Current status: '||replace(j.status,'_',' ')||'.',
    'orders',j.id
  from public.job_orders j
  where j.factory_id is not null
    and j.expected_delivery_date<=current_date+3
    and j.status not in ('completed','dispatched','cancelled')

  union all
  select d.organization_id,d.factory_id,
    case when d.expiry_date<current_date then 'document-expired:' else 'document-expiry:' end||d.id::text,
    'Documents',
    case when d.expiry_date<current_date then 'critical'
         when d.expiry_date<=current_date+7 then 'high' else 'medium' end,
    case when d.expiry_date<current_date then 'Document expired' else 'Document expiring soon' end,
    d.document_title||case when d.expiry_date<current_date
      then ' expired on '||to_char(d.expiry_date,'DD Mon YYYY')||'. Renew or replace the document.'
      when d.expiry_date=current_date then ' expires today.'
      else ' expires in '||(d.expiry_date-current_date)::text||' days.' end,
    'documents',d.id
  from public.factory_documents d
  where d.expiry_date<=current_date+30

  union all
  select m.organization_id,m.factory_id,
    case when m.next_service_date<current_date then 'service-overdue:' else 'service-due:' end||m.id::text,
    'Maintenance',
    case when m.next_service_date<current_date or m.next_service_date<=current_date+3 then 'high' else 'medium' end,
    case when m.next_service_date<current_date then 'Machine service overdue' else 'Upcoming machine service' end,
    'Preventive service '||case when m.next_service_date<current_date
      then 'was due '||to_char(m.next_service_date,'DD Mon YYYY')||'.'
      when m.next_service_date=current_date then 'is due today.'
      else 'is due in '||(m.next_service_date-current_date)::text||' days.' end||
      ' Reference: '||m.maintenance_number||'.',
    'maintenance',m.id
  from public.machine_maintenance_logs m
  where m.next_service_date<=current_date+14
    and m.status<>'Completed'

  union all
  select p.organization_id,p.factory_id,'plan-overdue:'||p.id::text,
    'Production','high','Production plan overdue',
    'Plan for '||to_char(p.planned_date,'DD Mon YYYY')||' on shift '||p.shift||
      ' is still '||replace(p.status,'_',' ')||'.',
    'planning',p.id
  from public.production_plans p
  where p.planned_date<current_date and p.status not in ('completed','cancelled')

  union all
  select p.organization_id,p.factory_id,'plan-due:'||p.id::text,
    'Production','medium','Production plan scheduled today',
    'Plan for shift '||p.shift||' is scheduled for today and has not been started.',
    'planning',p.id
  from public.production_plans p
  where p.planned_date=current_date and p.status='planned'

  union all
  select p.organization_id,p.factory_id,'target-missed:'||p.id::text,
    'Production','medium','Production target missed',
    'Recorded output '||to_char(coalesce(a.output_kg,0),'FM999999999990D99')||
      ' kg is below the target '||to_char(p.planned_output_kg,'FM999999999990D99')||
      ' kg for '||to_char(p.planned_date,'DD Mon YYYY')||'.',
    'planning',p.id
  from public.production_plans p
  left join production_actuals a
    on a.job_order_id=p.job_order_id and a.production_date=p.planned_date
  where p.status='completed' and coalesce(a.output_kg,0)<p.planned_output_kg;

  insert into public.factory_notifications (
    organization_id,factory_id,alert_key,category,severity,title,message,
    action_page,source_id,is_read,is_active,last_seen_at,updated_at
  )
  select d.organization_id,d.factory_id,d.alert_key,d.category,d.severity,d.title,d.message,
    d.action_page,d.source_id,
    case when existing.is_active then existing.is_read else false end,
    true,now(),now()
  from pg_temp.texflow_notification_drafts d
  left join public.factory_notifications existing
    on existing.factory_id=d.factory_id and existing.alert_key=d.alert_key
  on conflict (factory_id,alert_key) do update set
    category=excluded.category,severity=excluded.severity,title=excluded.title,
    message=excluded.message,action_page=excluded.action_page,source_id=excluded.source_id,
    is_read=case when public.factory_notifications.is_active
      then public.factory_notifications.is_read else false end,
    is_active=true,last_seen_at=now(),updated_at=now();

  update public.factory_notifications n
  set is_active=false,updated_at=now()
  where n.is_active
    and not exists (
      select 1 from pg_temp.texflow_notification_drafts d
      where d.factory_id=n.factory_id and d.alert_key=n.alert_key
    );
end;
$function$;

revoke all on function private.refresh_factory_notifications() from public, anon, authenticated;
grant execute on function private.refresh_factory_notifications() to postgres;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $schedule$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='texflow-factory-alerts-hourly';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'texflow-factory-alerts-hourly',
    '0 * * * *',
    'select private.refresh_factory_notifications();'
  );
end;
$schedule$;
