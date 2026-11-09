import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Wrench, Plus, Clock3, Settings2 } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Machine = Tables<'machines'>
type Maintenance = Tables<'machine_maintenance_logs'>
type Props = { organizationId: string; factoryId: string }
const today = () => new Date().toLocaleDateString('en-CA')
const machineBlank = { machine_code:'', machine_name:'', machine_type:'Compacting', manufacturer:'', model:'', installation_date:'', status:'Operational', notes:'' }
const logBlank = { machine_id:'', maintenance_number:'', maintenance_date:today(), maintenance_type:'Preventive', issue_reported:'', work_performed:'', downtime_hours:'0', maintenance_cost:'0', technician_name:'', status:'Open', next_service_date:'', notes:'' }
const money = (n:number) => '₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})

export default function MaintenanceManagement({organizationId,factoryId}:Props) {
 const [machines,setMachines]=useState<Machine[]>([])
 const [logs,setLogs]=useState<Maintenance[]>([])
 const [mf,setMf]=useState(machineBlank)
 const [lf,setLf]=useState(logBlank)
 const [mode,setMode]=useState<'machine'|'log'|null>(null)
 const [month,setMonth]=useState(today().slice(0,7))
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 async function load(){
  if(!supabase||!organizationId||!factoryId)return
  const [m,l]=await Promise.all([
   supabase.from('machines').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('machine_name'),
   supabase.from('machine_maintenance_logs').select('*').eq('organization_id',organizationId).eq('factory_id',factoryId).order('maintenance_date',{ascending:false}).limit(1000)
  ])
  if(m.error)throw m.error;if(l.error)throw l.error
  setMachines(m.data??[]);setLogs(l.data??[])
 }
 useEffect(()=>{let alive=true;load().catch(e=>{if(alive)setError(e instanceof Error?e.message:'Could not load maintenance records.')});return()=>{alive=false}},[organizationId,factoryId])
 const monthLogs=useMemo(()=>logs.filter(l=>l.maintenance_date.slice(0,7)===month),[logs,month])
 const cost=monthLogs.reduce((n,l)=>n+Number(l.maintenance_cost),0)
 const downtime=monthLogs.reduce((n,l)=>n+Number(l.downtime_hours),0)
 const open=logs.filter(l=>l.status!=='Completed').length
 const down=machines.filter(m=>m.status==='Breakdown'||m.status==='Under maintenance').length
 const mname=(id:string)=>machines.find(m=>m.id===id)?.machine_name??'Machine'
 async function saveMachine(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy(true);setError('');setNotice('')
  try{
   const {error:e1}=await supabase.from('machines').insert({organization_id:organizationId,factory_id:factoryId,machine_code:mf.machine_code.trim().toUpperCase(),machine_name:mf.machine_name.trim(),machine_type:mf.machine_type,manufacturer:mf.manufacturer.trim()||null,model:mf.model.trim()||null,installation_date:mf.installation_date||null,status:mf.status,notes:mf.notes.trim()||null})
   if(e1)throw e1;setMf(machineBlank);setMode(null);await load();setNotice('Machine registered successfully.')
  }catch(e){setError(e instanceof Error?e.message:'Could not save machine.')}finally{setBusy(false)}
 }
 async function saveLog(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy(true);setError('');setNotice('')
  try{
   const downtimeValue=Number(lf.downtime_hours||0),costValue=Number(lf.maintenance_cost||0)
   if(!lf.machine_id||!lf.maintenance_number.trim())throw new Error('Select a machine and enter a reference number.')
   if(!Number.isFinite(downtimeValue)||downtimeValue<0||!Number.isFinite(costValue)||costValue<0)throw new Error('Downtime and cost must be zero or greater.')
   const {error:e1}=await supabase.from('machine_maintenance_logs').insert({organization_id:organizationId,factory_id:factoryId,machine_id:lf.machine_id,maintenance_number:lf.maintenance_number.trim().toUpperCase(),maintenance_date:lf.maintenance_date,maintenance_type:lf.maintenance_type,issue_reported:lf.issue_reported.trim()||null,work_performed:lf.work_performed.trim()||null,downtime_hours:downtimeValue,maintenance_cost:costValue,technician_name:lf.technician_name.trim()||null,status:lf.status,next_service_date:lf.next_service_date||null,notes:lf.notes.trim()||null})
   if(e1)throw e1
   const machineStatus=lf.status==='Completed'?'Operational':lf.maintenance_type==='Breakdown'?'Breakdown':'Under maintenance'
   const {error:e2}=await supabase.from('machines').update({status:machineStatus}).eq('id',lf.machine_id).eq('organization_id',organizationId).eq('factory_id',factoryId)
   if(e2)throw e2;setLf(logBlank);setMode(null);await load();setNotice('Maintenance entry saved successfully.')
  }catch(e){setError(e instanceof Error?e.message:'Could not save maintenance entry.')}finally{setBusy(false)}
 }
 async function setStatus(id:string,status:string){
  if(!supabase)return;setError('');const {error:e}=await supabase.from('machines').update({status}).eq('id',id).eq('organization_id',organizationId).eq('factory_id',factoryId)
  if(e)setError(e.message);else{await load();setNotice('Machine status updated.')}
 }
 const machineField=(key:keyof typeof machineBlank,label:string,kind='text')=><label>{label}{key==='machine_type'||key==='status'?<select value={mf[key]} onChange={e=>setMf({...mf,[key]:e.target.value})}>{(key==='status'?['Operational','Under maintenance','Breakdown','Inactive']:['Compacting','Stenter','Hydro extractor','Boiler','Compressor','Other']).map(v=><option key={v}>{v}</option>)}</select>:<input type={kind} value={mf[key]} onChange={e=>setMf({...mf,[key]:e.target.value})} required={key==='machine_code'||key==='machine_name'}/>}</label>
 const logField=(key:keyof typeof logBlank,label:string,kind='text')=><label>{label}{key==='maintenance_type'||key==='status'?<select value={lf[key]} onChange={e=>setLf({...lf,[key]:e.target.value})}>{(key==='status'?['Open','In progress','Completed']:['Preventive','Breakdown','Repair','Inspection']).map(v=><option key={v}>{v}</option>)}</select>:<input type={kind} min={kind==='number'?0:undefined} step={kind==='number'?'0.01':undefined} value={lf[key]} onChange={e=>setLf({...lf,[key]:e.target.value})} required={key==='maintenance_number'}/>}</label>
 return <section className="panel data-panel maintenance-management">
  <div className="section-heading"><div><h2>Machine maintenance & breakdowns</h2><p>Machine register, preventive service, breakdown repair and downtime tracking</p></div><div className="maintenance-actions"><button className="secondary-btn" onClick={()=>{setMode(mode==='machine'?null:'machine');setError('')}}><Plus size={15}/> Add machine</button><button className="primary-btn" disabled={!machines.length} onClick={()=>{setMode(mode==='log'?null:'log');setError('')}}><Wrench size={15}/> Record maintenance</button></div></div>
  <div className="expense-summary maintenance-summary"><div><span>Registered machines</span><strong>{machines.length}</strong></div><div><span>Under service / breakdown</span><strong>{down}</strong></div><div><span>Open maintenance jobs</span><strong>{open}</strong></div><div><span>Downtime this month</span><strong>{downtime.toFixed(2)} hrs</strong></div><div><span>Maintenance cost this month</span><strong>{money(cost)}</strong></div></div>
  {mode==='machine'&&<form className="record-form maintenance-form" onSubmit={saveMachine}><h3>Register machine</h3>{machineField('machine_code','Machine code *')}{machineField('machine_name','Machine name *')}{machineField('machine_type','Machine type')}{machineField('manufacturer','Manufacturer')}{machineField('model','Model')}{machineField('installation_date','Installation date','date')}{machineField('status','Initial status')}<label className="wide-field">Notes<textarea rows={2} value={mf.notes} onChange={e=>setMf({...mf,notes:e.target.value})}/></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving…':'Save machine'}</button><button className="secondary-btn" type="button" onClick={()=>setMode(null)}>Cancel</button></div></form>}
  {mode==='log'&&<form className="record-form maintenance-form" onSubmit={saveLog}><h3>Maintenance / breakdown entry</h3><label>Machine *<select required value={lf.machine_id} onChange={e=>setLf({...lf,machine_id:e.target.value})}><option value="">Select machine</option>{machines.map(m=><option key={m.id} value={m.id}>{m.machine_code} · {m.machine_name}</option>)}</select></label>{logField('maintenance_number','Reference number *')}{logField('maintenance_date','Date','date')}{logField('maintenance_type','Maintenance type')}{logField('downtime_hours','Downtime (hours)','number')}{logField('maintenance_cost','Repair / service cost (₹)','number')}{logField('technician_name','Technician')}{logField('status','Job status')}{logField('next_service_date','Next service date','date')}<label className="wide-field">Issue reported<textarea rows={2} value={lf.issue_reported} onChange={e=>setLf({...lf,issue_reported:e.target.value})}/></label><label className="wide-field">Work performed<textarea rows={2} value={lf.work_performed} onChange={e=>setLf({...lf,work_performed:e.target.value})}/></label><label className="wide-field">Notes<textarea rows={2} value={lf.notes} onChange={e=>setLf({...lf,notes:e.target.value})}/></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving…':'Save maintenance record'}</button><button className="secondary-btn" type="button" onClick={()=>setMode(null)}>Cancel</button></div></form>}
  {error&&<p className="form-message error-message" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
  <div className="maintenance-subsection"><div className="subsection-heading"><h3><Settings2 size={17}/> Machine register</h3><span>{machines.length} machines</span></div><div className="table-scroll"><table className="records-table maintenance-table"><thead><tr><th>Code</th><th>Machine</th><th>Type</th><th>Manufacturer / model</th><th>Installed</th><th>Status</th><th>Update status</th></tr></thead><tbody>{machines.map(m=><tr key={m.id}><td><strong>{m.machine_code}</strong></td><td>{m.machine_name}</td><td>{m.machine_type}</td><td>{[m.manufacturer,m.model].filter(Boolean).join(' / ')||'—'}</td><td>{m.installation_date||'—'}</td><td><span className={'maintenance-status maintenance-'+m.status.toLowerCase().replace(/ /g,'-')}>{m.status}</span></td><td><select aria-label={'Update status for '+m.machine_name} value={m.status} onChange={e=>setStatus(m.id,e.target.value)}>{['Operational','Under maintenance','Breakdown','Inactive'].map(v=><option key={v}>{v}</option>)}</select></td></tr>)}</tbody></table>{!machines.length&&<div className="empty-state"><Settings2 size={25}/><strong>No machines registered</strong><span>Add the factory's machines to begin maintenance tracking.</span></div>}</div></div>
  <div className="maintenance-subsection"><div className="subsection-heading"><h3><Clock3 size={17}/> Maintenance history</h3><label>Report month <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div><div className="table-scroll"><table className="records-table maintenance-table"><thead><tr><th>Date</th><th>Reference</th><th>Machine</th><th>Type</th><th>Issue</th><th>Downtime hrs</th><th>Cost</th><th>Technician</th><th>Status</th><th>Next service</th></tr></thead><tbody>{monthLogs.map(l=><tr key={l.id}><td>{l.maintenance_date}</td><td><strong>{l.maintenance_number}</strong></td><td>{mname(l.machine_id)}</td><td>{l.maintenance_type}</td><td>{l.issue_reported||'—'}</td><td>{Number(l.downtime_hours).toFixed(2)}</td><td>{money(Number(l.maintenance_cost))}</td><td>{l.technician_name||'—'}</td><td><span className={'maintenance-status maintenance-'+l.status.toLowerCase().replace(/ /g,'-')}>{l.status}</span></td><td>{l.next_service_date||'—'}</td></tr>)}</tbody></table>{!monthLogs.length&&<div className="empty-state"><Wrench size={25}/><strong>No maintenance entries this month</strong><span>Record preventive service or machine breakdowns here.</span></div>}</div></div>
  <p className="report-footnote"><Wrench size={14}/> Machine and maintenance records are isolated by organization and selected factory.</p>
 </section>
}
