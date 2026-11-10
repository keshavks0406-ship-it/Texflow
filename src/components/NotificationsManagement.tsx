import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Boxes, CalendarClock, Check, CheckCheck, FileText, Factory, RefreshCw, Search, Wrench } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type AlertRow = Tables<'factory_notifications'>
type Props = { organizationId: string; factoryId: string; onUnreadCountChange?: (count:number)=>void; onNavigate?: (page:string)=>void }
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
  const {data,error:e}=await supabase.from('factory_notifications').select('*')
   .eq('organization_id',organizationId).eq('factory_id',factoryId)
   .order('created_at',{ascending:false}).limit(5000)
  if(e)throw e
  const rows=(data??[]) as AlertRow[]
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
  <p className="report-footnote"><Bell size={14}/> Alerts are refreshed automatically every hour in the background. Use Refresh alerts to fetch the latest status immediately.</p>
 </section>
}
