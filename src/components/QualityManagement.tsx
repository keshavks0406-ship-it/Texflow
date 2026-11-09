import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClipboardCheck, Plus, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Inspection = Tables<'quality_inspections'>
type JobOrder = Tables<'job_orders'>
type Props = { organizationId: string; factoryId: string }

const today = () => new Date().toLocaleDateString('en-CA')
const emptyForm = {
  inspection_number: '', job_order_id: '', inspection_date: today(), inspection_stage: 'Final',
  inspected_weight_kg: '', accepted_weight_kg: '', rejected_weight_kg: '',
  fabric_width_cm: '', gsm: '', shrinkage_percent: '', status: 'Pending',
  defect_type: '', inspected_by: '', notes: ''
}
const kg = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg'

export default function QualityManagement({ organizationId, factoryId }: Props) {
  const [records, setRecords] = useState<Inspection[]>([])
  const [orders, setOrders] = useState<JobOrder[]>([])
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadRecords() {
    if (!supabase || !organizationId || !factoryId) return
    const [q, j] = await Promise.all([
      supabase.from('quality_inspections').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('inspection_date', { ascending: false }).limit(1000),
      supabase.from('job_orders').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('created_at', { ascending: false })
    ])
    if (q.error) throw q.error
    if (j.error) throw j.error
    setRecords(q.data ?? [])
    setOrders(j.data ?? [])
  }

  useEffect(() => {
    let alive = true
    loadRecords().catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load quality records.') })
    return () => { alive = false }
  }, [organizationId, factoryId])

  const rows = useMemo(() => records.filter(r => r.inspection_date.slice(0, 7) === month), [records, month])
  const inspected = rows.reduce((n, r) => n + Number(r.inspected_weight_kg), 0)
  const accepted = rows.reduce((n, r) => n + Number(r.accepted_weight_kg), 0)
  const rejected = rows.reduce((n, r) => n + Number(r.rejected_weight_kg), 0)
  const rejectionRate = inspected ? rejected / inspected * 100 : 0
  const orderLabel = (id: string) => {
    const order = orders.find(o => o.id === id)
    return order ? order.order_number + ' · ' + order.fabric_type : 'Job order'
  }

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    try {
      const inspectedKg = Number(form.inspected_weight_kg)
      const acceptedKg = Number(form.accepted_weight_kg || 0)
      const rejectedKg = Number(form.rejected_weight_kg || 0)
      const optionalNumber = (value: string) => value.trim() === '' ? null : Number(value)
      if (!form.inspection_number.trim()) throw new Error('Enter an inspection number.')
      if (!form.job_order_id) throw new Error('Select a job order.')
      if (!Number.isFinite(inspectedKg) || inspectedKg <= 0) throw new Error('Enter a valid inspected weight.')
      if (![acceptedKg, rejectedKg].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Accepted and rejected weights must be zero or greater.')
      if (acceptedKg + rejectedKg > inspectedKg) throw new Error('Accepted plus rejected weight cannot exceed inspected weight.')
      const measurements = [form.fabric_width_cm, form.gsm, form.shrinkage_percent].map(optionalNumber)
      if (measurements.some(v => v !== null && !Number.isFinite(v))) throw new Error('Enter valid quality measurements.')
      const { error: saveError } = await supabase.from('quality_inspections').insert({
        organization_id: organizationId, factory_id: factoryId, job_order_id: form.job_order_id,
        inspection_number: form.inspection_number.trim().toUpperCase(),
        inspection_date: form.inspection_date, inspection_stage: form.inspection_stage,
        inspected_weight_kg: inspectedKg, accepted_weight_kg: acceptedKg, rejected_weight_kg: rejectedKg,
        fabric_width_cm: measurements[0], gsm: measurements[1], shrinkage_percent: measurements[2],
        status: form.status, defect_type: form.defect_type.trim() || null,
        inspected_by: form.inspected_by.trim() || null, notes: form.notes.trim() || null
      })
      if (saveError) throw saveError
      setForm(emptyForm); setFormOpen(false)
      await loadRecords()
      setNotice('Quality inspection saved successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save quality inspection.') }
    finally { setBusy(false) }
  }

  return <section className="panel data-panel quality-management">
    <div className="section-heading"><div><h2>Quality control & fabric inspection</h2><p>Fabric inspection, dimensional checks, defect recording and rejection tracking</p></div><button className="primary-btn" onClick={() => { setFormOpen(!formOpen); setError(''); setNotice('') }}><Plus size={16}/> New inspection</button></div>
    <div className="expense-summary quality-summary">
      <div><span>Inspected this month</span><strong>{kg(inspected)}</strong></div>
      <div><span>Accepted weight</span><strong>{kg(accepted)}</strong></div>
      <div><span>Rejected weight</span><strong>{kg(rejected)}</strong></div>
      <div><span>Rejection percentage</span><strong>{rejectionRate.toFixed(2)}%</strong></div>
    </div>
    {formOpen && <form className="record-form quality-form" onSubmit={saveInspection}>
      <label>Inspection number *<input value={form.inspection_number} onChange={e=>setForm({...form,inspection_number:e.target.value})} placeholder="e.g. QC-001" required/></label>
      <label>Job order *<select value={form.job_order_id} onChange={e=>setForm({...form,job_order_id:e.target.value})} required><option value="">Select job order</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_number} · {o.fabric_type}</option>)}</select></label>
      <label>Inspection date *<input type="date" value={form.inspection_date} onChange={e=>setForm({...form,inspection_date:e.target.value})} required/></label>
      <label>Inspection stage *<select value={form.inspection_stage} onChange={e=>setForm({...form,inspection_stage:e.target.value})}><option>Incoming</option><option>In-process</option><option>Final</option></select></label>
      <label>Inspected weight (kg) *<input type="number" min="0.01" step="0.01" value={form.inspected_weight_kg} onChange={e=>setForm({...form,inspected_weight_kg:e.target.value})} required/></label>
      <label>Accepted weight (kg)<input type="number" min="0" step="0.01" value={form.accepted_weight_kg} onChange={e=>setForm({...form,accepted_weight_kg:e.target.value})}/></label>
      <label>Rejected weight (kg)<input type="number" min="0" step="0.01" value={form.rejected_weight_kg} onChange={e=>setForm({...form,rejected_weight_kg:e.target.value})}/></label>
      <label>Fabric width (cm)<input type="number" min="0.01" step="0.01" value={form.fabric_width_cm} onChange={e=>setForm({...form,fabric_width_cm:e.target.value})}/></label>
      <label>GSM<input type="number" min="0.01" step="0.01" value={form.gsm} onChange={e=>setForm({...form,gsm:e.target.value})}/></label>
      <label>Shrinkage (%)<input type="number" min="-100" max="100" step="0.01" value={form.shrinkage_percent} onChange={e=>setForm({...form,shrinkage_percent:e.target.value})}/></label>
      <label>Quality status *<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Pending</option><option>Approved</option><option>Rejected</option><option>Rework</option></select></label>
      <label>Defect type<input value={form.defect_type} onChange={e=>setForm({...form,defect_type:e.target.value})} placeholder="Holes, stains, uneven finish…"/></label>
      <label>Inspected by<input value={form.inspected_by} onChange={e=>setForm({...form,inspected_by:e.target.value})}/></label>
      <label className="wide-field">Inspection notes<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy || !orders.length}>{busy?'Saving…':'Save inspection'}</button><button className="secondary-btn" type="button" onClick={()=>setFormOpen(false)}>Cancel</button>{!orders.length && <span className="field-hint">Create a job order for this factory before adding an inspection.</span>}</div>
    </form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="form-success" role="status">{notice}</p>}
    <div className="table-toolbar"><label>Report month <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><span>{rows.length} inspections · latest 1,000 records loaded</span></div>
    <div className="table-scroll"><table className="records-table quality-table"><thead><tr><th>Date</th><th>Inspection no.</th><th>Job order</th><th>Stage</th><th>Inspected kg</th><th>Accepted kg</th><th>Rejected kg</th><th>Width cm</th><th>GSM</th><th>Shrinkage %</th><th>Status</th><th>Defects</th><th>Inspector</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.inspection_date}</td><td><strong>{r.inspection_number}</strong></td><td>{orderLabel(r.job_order_id)}</td><td>{r.inspection_stage}</td><td>{kg(Number(r.inspected_weight_kg))}</td><td>{kg(Number(r.accepted_weight_kg))}</td><td>{kg(Number(r.rejected_weight_kg))}</td><td>{r.fabric_width_cm ?? '—'}</td><td>{r.gsm ?? '—'}</td><td>{r.shrinkage_percent ?? '—'}</td><td><span className={'quality-status quality-' + r.status.toLowerCase()}>{r.status}</span></td><td>{r.defect_type || '—'}</td><td>{r.inspected_by || '—'}</td></tr>)}</tbody></table>
      {!rows.length && <div className="empty-state"><ClipboardCheck size={25}/><strong>No quality inspections for this month</strong><span>Record the first fabric inspection to start tracking quality.</span></div>}
    </div>
    <p className="report-footnote"><ShieldCheck size={14}/> Inspection records are scoped to the selected organization and factory. Accepted and rejected weights are tracked separately.</p>
  </section>
}
