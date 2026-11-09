import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Users, CalendarCheck, Wallet } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Employee = Tables<'employees'>
type Attendance = Tables<'attendance_records'>
type Props = { organizationId: string; factoryId: string }

const today = () => new Date().toLocaleDateString('en-CA')
const emptyEmployee = { employee_code: '', full_name: '', phone: '', designation: '', salary_type: 'daily', salary_rate: '', date_of_joining: today() }
const emptyAttendance = { employee_id: '', attendance_date: today(), status: 'present', overtime_hours: '0', notes: '' }
const money = (value: number) => '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function EmployeeManagement({ organizationId, factoryId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee)
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance)
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false)
  const [attendanceFormOpen, setAttendanceFormOpen] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadRecords() {
    if (!supabase || !organizationId || !factoryId) return
    const [e, a] = await Promise.all([
      supabase.from('employees').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('full_name'),
      supabase.from('attendance_records').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('attendance_date', { ascending: false }).limit(1500)
    ])
    const failure = e.error || a.error
    if (failure) throw failure
    setEmployees(e.data ?? [])
    setAttendance(a.data ?? [])
  }

  useEffect(() => {
    let alive = true
    loadRecords().catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load employee records.') })
    return () => { alive = false }
  }, [organizationId, factoryId])

  const monthRows = useMemo(() => attendance.filter(a => a.attendance_date.slice(0, 7) === month), [attendance, month])
  const presentDays = monthRows.filter(a => a.status === 'present').length
  const halfDays = monthRows.filter(a => a.status === 'half_day').length
  const payableWage = employees.filter(e => e.is_active).reduce((total, employee) => {
    const rows = monthRows.filter(a => a.employee_id === employee.id)
    const payableDays = rows.reduce((n, row) => n + (row.status === 'present' ? 1 : row.status === 'half_day' ? 0.5 : 0), 0)
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    const dailyRate = employee.salary_type === 'daily' ? Number(employee.salary_rate) : employee.salary_type === 'weekly' ? Number(employee.salary_rate) / 7 : Number(employee.salary_rate) / daysInMonth
    return total + dailyRate * payableDays
  }, 0)

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    try {
      const rate = Number(employeeForm.salary_rate)
      if (!employeeForm.employee_code.trim()) throw new Error('Enter an employee code.')
      if (!employeeForm.full_name.trim()) throw new Error('Enter the employee name.')
      if (!employeeForm.designation.trim()) throw new Error('Enter the designation.')
      if (!Number.isFinite(rate) || rate < 0) throw new Error('Enter a valid salary rate.')
      const { error: e } = await supabase.from('employees').insert({
        organization_id: organizationId, factory_id: factoryId,
        employee_code: employeeForm.employee_code.trim().toUpperCase(),
        full_name: employeeForm.full_name.trim(), phone: employeeForm.phone.trim() || null,
        designation: employeeForm.designation.trim(), salary_type: employeeForm.salary_type,
        salary_rate: rate, date_of_joining: employeeForm.date_of_joining
      })
      if (e) throw e
      setEmployeeForm(emptyEmployee); setEmployeeFormOpen(false)
      await loadRecords(); setNotice('Employee registered successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save employee.') }
    finally { setBusy(false) }
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    try {
      const overtime = Number(attendanceForm.overtime_hours || 0)
      if (!attendanceForm.employee_id) throw new Error('Select an employee.')
      if (!Number.isFinite(overtime) || overtime < 0 || overtime > 24) throw new Error('Overtime must be between 0 and 24 hours.')
      const { error: e } = await supabase.from('attendance_records').upsert({
        organization_id: organizationId, factory_id: factoryId,
        employee_id: attendanceForm.employee_id, attendance_date: attendanceForm.attendance_date,
        status: attendanceForm.status, overtime_hours: overtime,
        notes: attendanceForm.notes.trim() || null
      }, { onConflict: 'employee_id,attendance_date' })
      if (e) throw e
      setAttendanceForm({ ...emptyAttendance, attendance_date: attendanceForm.attendance_date })
      setAttendanceFormOpen(false); await loadRecords()
      setNotice('Attendance saved. If this employee already had an entry for the date, it was updated.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save attendance.') }
    finally { setBusy(false) }
  }

  return <section className="panel data-panel">
    <div className="section-heading"><div><h2>Employee management</h2><p>Factory employee directory, daily attendance and attendance-based wage estimates</p></div><div className="inventory-actions"><button className="secondary-btn" onClick={() => { setEmployeeFormOpen(!employeeFormOpen); setAttendanceFormOpen(false); setError(''); setNotice('') }}><Plus size={16}/> Add employee</button><button className="primary-btn" onClick={() => { setAttendanceFormOpen(!attendanceFormOpen); setEmployeeFormOpen(false); setError(''); setNotice('') }} disabled={!employees.some(e => e.is_active)}><CalendarCheck size={16}/> Mark attendance</button></div></div>
    <div className="expense-summary"><div><span>Active employees</span><strong>{employees.filter(e => e.is_active).length}</strong></div><div><span>Present / half-days in month</span><strong>{presentDays} / {halfDays}</strong></div><div><span>Estimated payable wages</span><strong>{money(payableWage)}</strong></div></div>
    {employeeFormOpen && <form className="record-form" onSubmit={addEmployee}>
      <label>Employee code *<input value={employeeForm.employee_code} onChange={e=>setEmployeeForm({...employeeForm,employee_code:e.target.value})} placeholder="e.g. EMP001" required/></label>
      <label>Full name *<input value={employeeForm.full_name} onChange={e=>setEmployeeForm({...employeeForm,full_name:e.target.value})} required/></label>
      <label>Phone number<input type="tel" value={employeeForm.phone} onChange={e=>setEmployeeForm({...employeeForm,phone:e.target.value})}/></label>
      <label>Designation *<input value={employeeForm.designation} onChange={e=>setEmployeeForm({...employeeForm,designation:e.target.value})} placeholder="e.g. Operator" required/></label>
      <label>Salary frequency *<select value={employeeForm.salary_type} onChange={e=>setEmployeeForm({...employeeForm,salary_type:e.target.value})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
      <label>Salary rate (₹) *<input type="number" min="0" step="0.01" value={employeeForm.salary_rate} onChange={e=>setEmployeeForm({...employeeForm,salary_rate:e.target.value})} required/></label>
      <label>Date of joining *<input type="date" value={employeeForm.date_of_joining} onChange={e=>setEmployeeForm({...employeeForm,date_of_joining:e.target.value})} required/></label>
      <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving…':'Save employee'}</button><button className="secondary-btn" type="button" onClick={()=>setEmployeeFormOpen(false)}>Cancel</button></div>
    </form>}
    {attendanceFormOpen && <form className="record-form" onSubmit={saveAttendance}>
      <label>Employee *<select value={attendanceForm.employee_id} onChange={e=>setAttendanceForm({...attendanceForm,employee_id:e.target.value})} required><option value="">Select employee</option>{employees.filter(e=>e.is_active).map(e=><option key={e.id} value={e.id}>{e.employee_code} · {e.full_name}</option>)}</select></label>
      <label>Date *<input type="date" value={attendanceForm.attendance_date} onChange={e=>setAttendanceForm({...attendanceForm,attendance_date:e.target.value})} required/></label>
      <label>Attendance status *<select value={attendanceForm.status} onChange={e=>setAttendanceForm({...attendanceForm,status:e.target.value})}><option value="present">Present</option><option value="half_day">Half day</option><option value="absent">Absent</option><option value="leave">Leave</option></select></label>
      <label>Overtime hours<input type="number" min="0" max="24" step="0.25" value={attendanceForm.overtime_hours} onChange={e=>setAttendanceForm({...attendanceForm,overtime_hours:e.target.value})}/></label>
      <label className="wide-field">Notes<textarea rows={2} value={attendanceForm.notes} onChange={e=>setAttendanceForm({...attendanceForm,notes:e.target.value})}/></label>
      <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving…':'Save attendance'}</button><button className="secondary-btn" type="button" onClick={()=>setAttendanceFormOpen(false)}>Cancel</button></div>
    </form>}
    <div className="table-toolbar"><strong>Employee directory</strong><span>{employees.length} registered · Employee codes are unique per factory</span></div>
    <div className="table-scroll"><table className="records-table"><thead><tr><th>Code</th><th>Employee</th><th>Phone</th><th>Designation</th><th>Salary</th><th>Joined</th><th>Status</th></tr></thead><tbody>{employees.map(e=><tr key={e.id}><td><strong>{e.employee_code}</strong></td><td>{e.full_name}</td><td>{e.phone||'—'}</td><td>{e.designation}</td><td>{money(Number(e.salary_rate))} / {e.salary_type}</td><td>{e.date_of_joining}</td><td><span className={'stock-status '+(e.is_active?'normal':'low')}>{e.is_active?'Active':'Inactive'}</span></td></tr>)}</tbody></table>{!employees.length&&<div className="empty-state"><Users size={25}/><strong>No employees registered</strong><span>Add your first factory employee to begin maintaining attendance and wage records.</span></div>}</div>
    <div className="table-toolbar"><label>Attendance month <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><span>{monthRows.length} entries · Payable wage estimate is based on recorded present and half-day entries</span></div>
    <div className="table-scroll"><table className="records-table"><thead><tr><th>Date</th><th>Employee</th><th>Designation</th><th>Status</th><th>OT hours</th><th>Notes</th></tr></thead><tbody>{monthRows.map(row=>{const employee=employees.find(e=>e.id===row.employee_id);return <tr key={row.id}><td>{row.attendance_date}</td><td>{employee?.full_name??'Employee'}</td><td>{employee?.designation??'—'}</td><td>{row.status.replace('_',' ')}</td><td>{Number(row.overtime_hours).toFixed(2)}</td><td>{row.notes||'—'}</td></tr>})}</tbody></table>{!monthRows.length&&<div className="empty-state"><CalendarCheck size={25}/><strong>No attendance entries for this month</strong><span>Mark attendance each working day. Saving a second entry for the same employee and date updates the existing entry.</span></div>}</div>
    <p className="field-hint">Wage estimate: daily rate × payable days; weekly rate ÷ 7 × payable days; monthly rate ÷ calendar days in the selected month × payable days. Present = 1 day, half day = 0.5 day. Absent and leave = 0. Overtime is recorded separately and is not included.</p>
    {notice&&<div className="inline-notice" role="status">{notice}</div>}{error&&<p className="form-message error-message" role="alert">{error}</p>}
  </section>
}
