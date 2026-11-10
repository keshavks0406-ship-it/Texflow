import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ClipboardList, Factory, Gauge, Plus, RefreshCw, UserRound } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Plan = Tables<'production_plans'>
type Job = Tables<'job_orders'>
type Machine = Tables<'machines'>
type Employee = Tables<'employees'>
type Production = Tables<'production_entries'>
type Props = { organizationId: string; factoryId: string }
const today=()=>new Date().toLocaleDateString('en-CA')
const blank=()=>({job_order_id:'',machine_id:'',supervisor_id:'',planned_date:today(),shift:'Day',planned_input_kg:'',planned_output_kg:'',notes:''})
const kg=(v:number)=>Number(v).toLocaleString('en-IN',{maximumFractionDigits:2})+' kg'

export default function ProductionPlanningManagement({organizationId,factoryId}:Props){
 const [plans,setPlans]=useState<Plan[]>([])
 const [jobs,setJobs]=useState<Job[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [employees,setEmployees]=useState<Employee[]>([])
 const [production,setProduction]=useState<Production[]>([])
 const [form,setForm]=useState(blank())
 const [open,setOpen]=useState(false)
 const [date,setDate]=useState(today())
 const [statusFilter,setStatusFilter]=useState('All')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 async function load(){
  if(!supabase||!organizationId||!factoryId)return
  const [p,j,m,e,pr]=await Promise.all([
   supabase.from('production_plans').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('planned_date',{ascending:false}).limit(1000),
   supabase.from('job_orders').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('expected_delivery_date'),
   supabase.from('machines').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('machine_name'),
   supabase.from('employees').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).eq('is_active',true).order('full_name'),
   supabase.from('production_entries').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).limit(2000)
  ])
  for(const x of [p,j,m,e,pr])if(x.error)throw x.error
  setPlans(p.data??[]);setJobs(j.data??[]);setMachines(m.data??[]);setEmployees(e.data??[]);setProduction(pr.data??[])
 }
 useEffect(()=>{let alive=true;load().catch(e=>{if(alive)setError(e instanceof Error?e.message:'Could not load production plans.')});return()=>{alive=false}},[organizationId,factoryId])
 const filtered=useMemo(()=>plans.filter(p=>(date==='All'||p.planned_date===date)&&(statusFilter==='All'||p.status===statusFilter)),[plans,date,statusFilter])
 const dayPlans=plans.filter(p=>p.planned_date===today()&&p.status!=='cancelled')
 const plannedKg=dayPlans.reduce((n,p)=>n+Number(p.planned_output_kg),0)
 const completedKg=production.filter(p=>p.production_date===today()).reduce((n,p)=>n+Number(p.output_weight_kg),0)
 const availableMachines=machines.filter(m=>m.status==='Operational')
 const jobName=(id:string)=>{const j=jobs.find(x=>x.id===id);return j?j.order_number+' · '+j.fabric_type:'Job order'}
 const machineName=(id:string)=>machines.find(m=>m.id===id)?.machine_name??'Machine'
 const supervisorName=(id:string|null)=>id?employees.find(e=>e.id===id)?.full_name??'Supervisor':'Not assigned'
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return
  setBusy(true);setError('');setNotice('')
  try{
   const input=Number(form.planned_input_kg),output=Number(form.planned_output_kg)
   if(!form.job_order_id||!form.machine_id)throw new Error('Select a job order and an operational machine.')
   if(!Number.isFinite(input)||input<=0||!Number.isFinite(output)||output<0||output>input)throw new Error('Planned output must be zero or less than or equal to planned input.')
   const job=jobs.find(j=>j.id===form.job_order_id)
   const machine=machines.find(m=>m.id===form.machine_id)
   if(!job||!machine||machine.status!=='Operational')throw new Error('The selected job order or machine is no longer available.')
   if(['completed','dispatched','cancelled'].includes(job.status))throw new Error('This job order is closed.')
   const {error:e1}=await supabase.from('production_plans').insert({organization_id:organizationId,factory_id:factoryId,job_order_id:form.job_order_id,machine_id:form.machine_id,supervisor_id:form.supervisor_id||null,planned_date:form.planned_date,shift:form.shift,planned_input_kg:input,planned_output_kg:output,notes:form.notes.trim()||null})
   if(e1)throw e1
   setForm(blank());setOpen(false);await load();setNotice('Production plan saved.')
  }catch(e){setError(e instanceof Error?e.message:'Could not save production plan.')}finally{setBusy(false)}
 }
 async function changeStatus(p:Plan,status:string){
  if(!supabase)return;setError('');setNotice('')
  const {error:e}=await supabase.from('production_plans').update({status,updated_at:new Date().toISOString()}).eq('id',p.id).eq('organization_id',organizationId).eq('factory_id',factoryId)
  if(e){setError(e.message);return}
  await load();setNotice('Plan status updated.')
 }
 async function remove(p:Plan){
  if(!supabase||!window.confirm('Delete this production plan?'))return
  const {error:e}=await supabase.from('production_plans').delete().eq('id',p.id).eq('organization_id',organizationId).eq('factory_id',factoryId)
  if(e){setError(e.message);return}await load();setNotice('Plan deleted.')
 }
 return <section className="panel data-panel planning-management">
  <div className="section-heading"><div><h2>Production planning & machine allocation</h2><p>Schedule job orders, assign machines and supervisors, and compare planned output with production records</p></div><button className="primary-btn" onClick={()=>{setOpen(!open);setError('')}}><Plus size={16}/> Create production plan</button></div>
  <div className="expense-summary planning-summary"><div><span>Today's planned output</span><strong>{kg(plannedKg)}</strong></div><div><span>Today's actual output</span><strong>{kg(completedKg)}</strong></div><div><span>Today's plans</span><strong>{dayPlans.length}</strong></div><div><span>Operational machines</span><strong>{availableMachines.length}</strong></div></div>
  {open&&<form className="record-form planning-form" onSubmit={save}><h3>New production plan</h3>
   <label>Job order *<select required value={form.job_order_id} onChange={e=>setForm({...form,job_order_id:e.target.value})}><option value="">Select open job order</option>{jobs.filter(j=>!['completed','dispatched','cancelled'].includes(j.status)).map(j=><option key={j.id} value={j.id}>{j.order_number} · {j.fabric_type} · {kg(Number(j.received_weight_kg))}</option>)}</select></label>
   <label>Machine *<select required value={form.machine_id} onChange={e=>setForm({...form,machine_id:e.target.value})}><option value="">Select operational machine</option>{availableMachines.map(m=><option key={m.id} value={m.id}>{m.machine_code} · {m.machine_name}</option>)}</select></label>
   <label>Planned date *<input type="date" required value={form.planned_date} onChange={e=>setForm({...form,planned_date:e.target.value})}/></label>
   <label>Shift *<select value={form.shift} onChange={e=>setForm({...form,shift:e.target.value})}><option>Day</option><option>Evening</option><option>Night</option></select></label>
   <label>Planned input (kg) *<input type="number" min="0.01" step="0.01" required value={form.planned_input_kg} onChange={e=>setForm({...form,planned_input_kg:e.target.value})}/></label>
   <label>Target output (kg) *<input type="number" min="0" step="0.01" required value={form.planned_output_kg} onChange={e=>setForm({...form,planned_output_kg:e.target.value})}/></label>
   <label>Shift supervisor<select value={form.supervisor_id} onChange={e=>setForm({...form,supervisor_id:e.target.value})}><option value="">Not assigned</option>{employees.map(e=><option key={e.id} value={e.id}>{e.employee_code} · {e.full_name}</option>)}</select></label>
   <label className="wide-field">Notes<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy||!availableMachines.length||!jobs.some(j=>!['completed','dispatched','cancelled'].includes(j.status))}>{busy?'Saving…':'Save production plan'}</button><button className="secondary-btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>{!availableMachines.length&&<span className="field-hint">Register an operational machine first.</span>}</div>
  </form>}
  {error&&<p className="form-message error-message" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
  <div className="planning-toolbar"><label><CalendarDays size={15}/> Date <input type="date" value={date==='All'?'':date} onChange={e=>setDate(e.target.value||'All')}/></label><select aria-label="Filter plans by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><button className="secondary-btn" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={15}/> Refresh</button></div>
  <div className="table-scroll"><table className="records-table planning-table"><thead><tr><th>Date / shift</th><th>Job order</th><th>Machine</th><th>Supervisor</th><th>Input target</th><th>Output target</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><strong>{p.planned_date}</strong><small className="planning-subtext">{p.shift}</small></td><td>{jobName(p.job_order_id)}</td><td>{machineName(p.machine_id)}</td><td>{supervisorName(p.supervisor_id)}</td><td>{kg(Number(p.planned_input_kg))}</td><td>{kg(Number(p.planned_output_kg))}</td><td><span className={'planning-status planning-'+p.status}>{p.status.replace(/_/g,' ')}</span></td><td><div className="planning-actions">{p.status==='planned'&&<button className="secondary-btn" onClick={()=>changeStatus(p,'in_progress')}>Start</button>}{p.status==='in_progress'&&<button className="secondary-btn" onClick={()=>changeStatus(p,'completed')}>Complete</button>}{p.status!=='completed'&&p.status!=='cancelled'&&<button className="secondary-btn" onClick={()=>changeStatus(p,'cancelled')}>Cancel</button>}{(p.status==='planned'||p.status==='cancelled')&&<button className="icon-btn danger-btn" aria-label="Delete plan" onClick={()=>remove(p)}><ClipboardList size={15}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><Factory size={26}/><strong>No production plans found</strong><span>Create a plan after registering machines and open job orders.</span></div>}</div>
  <p className="report-footnote"><Gauge size={14}/> Actual output is drawn from existing production entries for the current day. Creating a plan does not automatically create a production entry or alter a job order.</p>
 </section>
}
