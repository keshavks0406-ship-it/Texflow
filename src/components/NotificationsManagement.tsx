import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Boxes, CalendarClock, Check, CheckCheck, FileText, Factory, RefreshCw, Search, Wrench } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type AlertRow = Tables<'factory_notifications'>
type Props = { organizationId: string; factoryId: string; onUnreadCountChange?: (count:number)=>void; onNavigate?: (page:string)=>void }
type AlertDraft = { alert_key:string; category:string; severity:string; title:string; message:string; action_page:string; source_id:string|null }
type Job = Tables<'job_orders'>
type Item = Tables<'inventory_items'>
type Movement = Tables<'inventory_transactions'>
type Document = Tables<'factory_documents'>
type Maintenance = Tables<'machine_maintenance_logs'>
type Plan = Tables<'production_plans'>
type Production = Tables<'production_entries'>
const today=()=>new Date().toLocaleDateString('en-CA')
const daysBetween=(date:string)=>Math.ceil((new Date(date+'T00:00:00').getTime()-new Date(today()+'T00:00:00').getTime())/86400000)
const dateLabel=(date:string)=>new Date(date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
const severityRank=(s:string)=>s==='critical'?0:s==='high'?1:s==='medium'?2:3
const iconFor=(category:string)=>category==='Inventory'?Boxes:category==='Job orders'?CalendarClock:category==='Maintenance'?Wrench:category==='Documents'?FileText:Factory

export default function NotificationsManagement({organizationId,factoryId,onUnreadCountChange,onNavigate}:Props){
 const [alerts,setAlerts]=useState<AlertRow[]>([])
 const [filter,setFilter]=useState('Active')
 const [search,setSearch]=useState('')
 const [loading,setLoading]=useState(true)
 const [refreshing,setRefreshing]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [unread,setUnread]=useState(0)
 const updateUnread=useCallback((n:number)=>{setUnread(n);onUnreadCountChange?.(n)},[onUnreadCountChange])
 const load=useCallback(async()=>{
  if(!supabase||!organizationId||!factoryId)return
  setError('')
  const [items,movements,jobs,docs,maintenance,plans,production,existing]=await Promise.all([
   supabase.from('inventory_items').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(2000),
   supabase.from('inventory_transactions').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('transaction_date',{ascending:false}).limit(5000),
   supabase.from('job_orders').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(3000),
   supabase.from('factory_documents').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(3000),
   supabase.from('machine_maintenance_logs').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(3000),
   supabase.from('production_plans').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(3000),
   supabase.from('production_entries').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(5000),
   supabase.from('factory_notifications').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(5000)
  ])
  const failure=[items,movements,jobs,docs,maintenance,plans,production,existing].find(x=>x.error)
  if(failure?.error)throw failure.error
  const itemRows=(items.data??[]) as Item[], movementRows=(movements.data??[]) as Movement[]
  const jobRows=(jobs.data??[]) as Job[], documentRows=(docs.data??[]) as Document[]
  const maintenanceRows=(maintenance.data??[]) as Maintenance[], planRows=(plans.data??[]) as Plan[]
  const productionRows=(production.data??[]) as Production[], existingRows=(existing.data??[]) as AlertRow[]
  const drafts:AlertDraft[]=[]
  const balances=new Map<string,number>()
  for(const m of movementRows)balances.set(m.item_id,(balances.get(m.item_id)??0)+(['purchase','adjustment_in'].includes(m.transaction_type)?Number(m.quantity):-Number(m.quantity)))
  for(const item of itemRows){
   const balance=balances.get(item.id)??0
   if(balance<=Number(item.reorder_level))drafts.push({alert_key:'stock:'+item.id,category:'Inventory',severity:balance<=0?'critical':'high',title:balance<=0?'Stock exhausted':'Low stock warning',message:item.item_name+' is at '+balance.toLocaleString('en-IN',{maximumFractionDigits:2})+' '+item.unit+'; reorder level is '+Number(item.reorder_level).toLocaleString('en-IN',{maximumFractionDigits:2})+' '+item.unit+'.',action_page:'inventory',source_id:item.id})
  }
  for(const job of jobRows){
   if(!job.expected_delivery_date||['completed','dispatched','cancelled'].includes(job.status))continue
   const days=daysBetween(job.expected_delivery_date)
   if(days<0)drafts.push({alert_key:'order-overdue:'+job.id,category:'Job orders',severity:'critical',title:'Job order overdue',message:job.order_number+' was due '+dateLabel(job.expected_delivery_date)+'. Current status: '+job.status.replace(/_/g,' ')+'.',action_page:'orders',source_id:job.id})
   else if(days<=3)drafts.push({alert_key:'order-due:'+job.id,category:'Job orders',severity:days===0?'high':'medium',title:days===0?'Job order due today':'Job order due soon',message:job.order_number+' is due '+(days===0?'today': 'in '+days+' day'+(days===1?'':'s'))+'.',action_page:'orders',source_id:job.id})
  }
  for(const doc of documentRows){
   if(!doc.expiry_date)continue
   const days=daysBetween(doc.expiry_date)
   if(days<0)drafts.push({alert_key:'document-expired:'+doc.id,category:'Documents',severity:'critical',title:'Document expired',message:doc.document_title+' expired on '+dateLabel(doc.expiry_date)+'. Renew or replace the document.',action_page:'documents',source_id:doc.id})
   else if(days<=30)drafts.push({alert_key:'document-expiry:'+doc.id,category:'Documents',severity:days<=7?'high':'medium',title:'Document expiring soon',message:doc.document_title+' expires '+(days===0?'today':'in '+days+' day'+(days===1?'':'s'))+'.',action_page:'documents',source_id:doc.id})
  }
  for(const log of maintenanceRows){
   if(!log.next_service_date)continue
   const days=daysBetween(log.next_service_date)
   if(days<0)drafts.push({alert_key:'service-overdue:'+log.id,category:'Maintenance',severity:'high',title:'Machine service overdue',message:'Service was due '+dateLabel(log.next_service_date)+'. Reference: '+log.maintenance_number+'.',action_page:'maintenance',source_id:log.id})
   else if(days<=14)drafts.push({alert_key:'service-due:'+log.id,category:'Maintenance',severity:days<=3?'high':'medium',title:'Upcoming machine service',message:'Preventive service is due '+(days===0?'today':'in '+days+' day'+(days===1?'':'s'))+'. Reference: '+log.maintenance_number+'.',action_page:'maintenance',source_id:log.id})
  }
  const outputs=new Map<string,number>()
  for(const entry of productionRows)outputs.set(entry.job_order_id+'|'+entry.production_date,(outputs.get(entry.job_order_id+'|'+entry.production_date)??0)+Number(entry.output_weight_kg))
  for(const plan of planRows){
   const days=daysBetween(plan.planned_date)
   if(days<0&&!['completed','cancelled'].includes(plan.status))drafts.push({alert_key:'plan-overdue:'+plan.id,category:'Production',severity:'high',title:'Production plan overdue',message:'Plan for '+dateLabel(plan.planned_date)+' on shift '+plan.shift+' is still '+plan.status.replace(/_/g,' ')+'.',action_page:'planning',source_id:plan.id})\n   const actual=outputs.get(plan.job_order_id+'|'+plan.planned_date)??0\n   if(plan.status==='completed'&&actual<Number(plan.planned_output_kg))drafts.push({alert_key:'target-missed:'+plan.id,category:'Production',severity:'medium',title:'Production target missed',message:'Recorded output '+actual.toFixed(2)+' kg is below the target '+Number(plan.planned_output_kg).toFixed(2)+' kg for '+dateLabel(plan.planned_date)+'.',action_page:'planning',source_id:plan.id})
  }
  const oldByKey=new Map(existingRows.map(row=>[row.alert_key,row]))
  const now=new Date().toISOString()
  const records=drafts.map(d=>{
   const old=oldByKey.get(d.alert_key)
   return {...d,organization_id:organizationId,factory_id:factoryId,is_read:old?.is_active?old.is_read:false,is_active:true,last_seen_at:now,updated_at:now}
  })
  if(records.length){
   const {error:e}=await supabase.from('factory_notifications').upsert(records,{onConflict:'factory_id,alert_key'})
   if(e)throw e
  }
  const activeKeys=new Set(drafts.map(d=>d.alert_key))
  const staleIds=existingRows.filter(row=>row.is_active&&!activeKeys.has(row.alert_key)).map(row=>row.id)
  if(staleIds.length){
   const {error:e}=await supabase.from('factory_notifications').update({is_active:false,updated_at:now}).in('id',staleIds).eq('organization_id',organizationId).eq('factory_id',factoryId)
   if(e)throw e
  }
  const {data:all,error:e}=await supabase.from('factory_notifications').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('created_at',{ascending:false}).limit(5000)
  if(e)throw e
  const rows=(all??[]) as AlertRow[]
  setAlerts(rows)
  updateUnread(rows.filter(row=>row.is_active&&!row.is_read).length)
 },[organizationId,factoryId,updateUnread])
 useEffect(()=>{let alive=true;setLoading(true);load().catch(e=>{if(alive)setError(e instanceof Error?e.message:'Could not load alerts.')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[load])
 const visible=useMemo(()=>alerts.filter(a=>(filter==='Active'?a.is_active:filter==='Unread'?a.is_active&&!a.is_read:filter==='History'?!a.is_active:true)&&[a.title,a.message,a.category].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(b.is_active)-Number(a.is_active)||severityRank(a.severity)-severityRank(b.severity)||b.created_at.localeCompare(a.created_at)),[alerts,filter,search])
 const markRead=async(row:AlertRow)=>{
  if(!supabase)return
  const {error:e}=await supabase.from('factory_notifications').update({is_read:true,updated_at:new Date().toISOString()}).eq('id',row.id).eq('organization_id',organizationId).eq('factory_id',factoryId)
  if(e){setError(e.message);return}
  setAlerts(prev=>prev.map(x=>x.id===row.id?{...x,is_read:true}:x));updateUnread(Math.max(0,unread-(row.is_active&&!row.is_read?1:0)))
 }
 const markAll=async()=>{
  if(!supabase)return
  const {error:e}=await supabase.from('factory_notifications').update({is_read:true,updated_at:new Date().toISOString()}).eq('organization_id',organizationId).eq('factory_id',factoryId).eq('is_active',true).eq('is_read',false)
  if(e){setError(e.message);return}
  setAlerts(prev=>prev.map(x=>x.is_active?{...x,is_read:true}:x));updateUnread(0);setNotice('All active alerts marked as read.')
 }
 const refresh=async()=>{setRefreshing(true);setError('');try{await load();setNotice('Alerts refreshed.')}catch(e){setError(e instanceof Error?e.message:'Could not refresh alerts.')}finally{setRefreshing(false)}}
 return <section className="panel data-panel notifications-management">
  <div className="section-heading"><div><h2>Notifications & alerts</h2><p>Factory-specific operational warnings and reminders</p></div><div className="notification-tools"><button className="secondary-btn" onClick={refresh} disabled={refreshing}><RefreshCw size={15}/> {refreshing?'Refreshing…':'Refresh alerts'}</button><button className="primary-btn" onClick={markAll} disabled={!unread}><CheckCheck size={15}/> Mark all read</button></div></div>
  <div className="expense-summary notification-summary"><div><span>Active alerts</span><strong>{alerts.filter(a=>a.is_active).length}</strong></div><div><span>Unread</span><strong>{unread}</strong></div><div><span>Critical / high</span><strong>{alerts.filter(a=>a.is_active&&['critical','high'].includes(a.severity)).length}</strong></div><div><span>Resolved history</span><strong>{alerts.filter(a=>!a.is_active).length}</strong></div></div>
  {error&&<p className="form-message error-message" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
  <div className="notification-toolbar"><label className="notification-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search alerts"/></label><select aria-label="Filter notifications" value={filter} onChange={e=>setFilter(e.target.value)}><option>Active</option><option>Unread</option><option>All</option><option>History</option></select></div>
  {loading?<div className="empty-state"><RefreshCw size={24}/><strong>Checking factory records…</strong></div>:!visible.length?<div className="empty-state"><Bell size={25}/><strong>No alerts in this view</strong><span>Everything matching this filter is clear.</span></div>:<div className="notification-list">{visible.map(row=>{const Icon=iconFor(row.category);return <article className={'notification-card '+(!row.is_active?'notification-resolved':'')+(row.is_read?' notification-read':'')} key={row.id}><span className={'notification-icon notification-'+row.severity}><Icon size={19}/></span><div className="notification-body"><div className="notification-meta"><span>{row.category}</span><span className={'notification-severity severity-'+row.severity}>{row.severity}</span><span>{dateLabel(row.created_at.slice(0,10))}</span>{!row.is_active&&<span>Resolved</span>}</div><h3>{row.title}</h3><p>{row.message}</p><div className="notification-card-actions">{row.is_active&&<button className="text-action" onClick={()=>markRead(row)} disabled={row.is_read}>{row.is_read?'Read':<><Check size={14}/> Mark as read</>}</button>}<button className="text-action" onClick={()=>onNavigate?.(row.action_page)}>Open {row.action_page==='orders'?'job orders':row.action_page}</button></div></div>{!row.is_read&&row.is_active&&<span className="notification-unread-dot" aria-label="Unread"/>}</article>})}</div>}
  <p className="report-footnote"><Bell size={14}/> Alerts are evaluated when this screen is opened or refreshed. Automatic background and mobile push delivery can be added as a separate stage.</p>
 </section>
}
