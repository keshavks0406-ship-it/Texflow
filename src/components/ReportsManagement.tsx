import { useEffect, useMemo, useState } from 'react'
import { Activity, Boxes, CalendarDays, ClipboardList, Factory, Fuel, PackageCheck, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Props = { organizationId: string; factoryId: string }
type Production = Pick<Tables<'production_entries'>, 'production_date' | 'input_weight_kg' | 'output_weight_kg'>
type Dispatch = Pick<Tables<'dispatches'>, 'dispatch_date' | 'weight_kg'>
type Order = Pick<Tables<'job_orders'>, 'status' | 'received_weight_kg'>
type Expense = Pick<Tables<'expenses'>, 'expense_date' | 'amount' | 'category'>
type Purchase = Pick<Tables<'purchases'>, 'purchase_date' | 'total_amount'>
type Boiler = Pick<Tables<'boiler_logs'>, 'log_date' | 'fabric_processed_kg' | 'firewood_consumed_kg' | 'fuel_cost' | 'steam_generated_kg'>
type Invoice = Pick<Tables<'account_invoices'>, 'id' | 'invoice_type' | 'total_amount'>
type Payment = Pick<Tables<'account_payments'>, 'invoice_id' | 'amount'>

const isoDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const money = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
const kg = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg'

export default function ReportsManagement({ organizationId, factoryId }: Props) {
  const now = new Date()
  const [from, setFrom] = useState(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(isoDate(now))
  const [production, setProduction] = useState<Production[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [boiler, setBoiler] = useState<Boiler[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  async function loadReport() {
    if (!supabase || !organizationId || !factoryId || from > to) return
    setLoading(true); setError('')
    const results = await Promise.all([
      supabase.from('production_entries').select('production_date,input_weight_kg,output_weight_kg').eq('organization_id', organizationId).eq('factory_id', factoryId).gte('production_date', from).lte('production_date', to),
      supabase.from('dispatches').select('dispatch_date,weight_kg,job_orders!inner(factory_id)').eq('organization_id', organizationId).eq('job_orders.factory_id', factoryId).gte('dispatch_date', from).lte('dispatch_date', to),
      supabase.from('job_orders').select('status,received_weight_kg').eq('organization_id', organizationId).eq('factory_id', factoryId),
      supabase.from('expenses').select('expense_date,amount,category').eq('organization_id', organizationId).gte('expense_date', from).lte('expense_date', to),
      supabase.from('purchases').select('purchase_date,total_amount').eq('organization_id', organizationId).eq('factory_id', factoryId).gte('purchase_date', from).lte('purchase_date', to),
      supabase.from('boiler_logs').select('log_date,fabric_processed_kg,firewood_consumed_kg,fuel_cost,steam_generated_kg').eq('organization_id', organizationId).eq('factory_id', factoryId).gte('log_date', from).lte('log_date', to),
      supabase.from('account_invoices').select('id,invoice_type,total_amount').eq('organization_id', organizationId).eq('factory_id', factoryId).gte('invoice_date', from).lte('invoice_date', to),
      supabase.from('account_payments').select('invoice_id,amount').eq('organization_id', organizationId).eq('factory_id', factoryId)
    ])
    const failed = results.find(r => r.error)
    if (failed?.error) { setError(failed.error.message); setLoading(false); return }
    setProduction(results[0].data ?? [])
    setDispatches(results[1].data ?? [])
    setOrders(results[2].data ?? [])
    setExpenses(results[3].data ?? [])
    setPurchases(results[4].data ?? [])
    setBoiler(results[5].data ?? [])
    setInvoices(results[6].data ?? [])
    setPayments(results[7].data ?? [])
    setLoaded(true); setLoading(false)
  }

  useEffect(() => { loadReport() }, [organizationId, factoryId])

  const totals = useMemo(() => {
    const input = production.reduce((n, r) => n + Number(r.input_weight_kg), 0)
    const output = production.reduce((n, r) => n + Number(r.output_weight_kg), 0)
    const dispatched = dispatches.reduce((n, r) => n + Number(r.weight_kg), 0)
    const expenseTotal = expenses.reduce((n, r) => n + Number(r.amount), 0)
    const purchaseTotal = purchases.reduce((n, r) => n + Number(r.total_amount ?? 0), 0)
    const sales = invoices.filter(i => i.invoice_type === 'sales').reduce((n, r) => n + Number(r.total_amount), 0)
    const purchaseInvoices = invoices.filter(i => i.invoice_type === 'purchase').reduce((n, r) => n + Number(r.total_amount), 0)
    const paymentByInvoice = new Map<string, number>()
    payments.forEach(p => paymentByInvoice.set(p.invoice_id, (paymentByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount)))
    const received = invoices.filter(i => i.invoice_type === 'sales').reduce((n, i) => n + (paymentByInvoice.get(i.id) ?? 0), 0)
    const supplierPaid = invoices.filter(i => i.invoice_type === 'purchase').reduce((n, i) => n + (paymentByInvoice.get(i.id) ?? 0), 0)
    return { input, output, dispatched, expenseTotal, purchaseTotal, sales, purchaseInvoices, received, supplierPaid,
      firewood: boiler.reduce((n, r) => n + Number(r.firewood_consumed_kg), 0),
      fuelCost: boiler.reduce((n, r) => n + Number(r.fuel_cost), 0),
      steam: boiler.reduce((n, r) => n + Number(r.steam_generated_kg ?? 0), 0),
      openOrders: orders.filter(o => !['completed','closed','cancelled'].includes(o.status.toLowerCase())).length,
      orderCount: orders.length,
      yield: input > 0 ? output / input * 100 : 0,
      receivable: invoices.filter(i => i.invoice_type === 'sales').reduce((n, i) => n + Math.max(0, Number(i.total_amount) - (paymentByInvoice.get(i.id) ?? 0)), 0),
      payable: invoices.filter(i => i.invoice_type === 'purchase').reduce((n, i) => n + Math.max(0, Number(i.total_amount) - (paymentByInvoice.get(i.id) ?? 0)), 0)
    }
  }, [production, dispatches, orders, expenses, purchases, boiler, invoices, payments])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    expenses.forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)))
    return [...map.entries()].sort((a,b) => b[1]-a[1])
  }, [expenses])

  const cards = [
    { label: 'Production output', value: kg(totals.output), detail: 'Input: ' + kg(totals.input), icon: Factory },
    { label: 'Dispatch quantity', value: kg(totals.dispatched), detail: 'Goods dispatched in period', icon: PackageCheck },
    { label: 'Expenses', value: money(totals.expenseTotal), detail: 'Recorded operating expenses', icon: TrendingDown },
    { label: 'Purchases', value: money(totals.purchaseTotal), detail: 'Purchase register total', icon: Boxes },
    { label: 'Sales invoices', value: money(totals.sales), detail: 'Received: ' + money(totals.received), icon: TrendingUp },
    { label: 'Open job orders', value: String(totals.openOrders), detail: totals.orderCount + ' total orders on record', icon: ClipboardList },
    { label: 'Firewood consumed', value: kg(totals.firewood), detail: 'Fuel cost: ' + money(totals.fuelCost), icon: Fuel },
    { label: 'Boiler steam', value: kg(totals.steam), detail: 'Production yield: ' + totals.yield.toFixed(1) + '%', icon: Activity }
  ]

  return <section className="panel data-panel reports-panel">
    <div className="section-heading"><div><h2>Reports & analytics</h2><p>Factory operations and financial summary for the selected period</p></div><button className="secondary-btn" onClick={loadReport} disabled={loading}><RefreshCw size={16} /> {loading ? 'Refreshing…' : 'Refresh report'}</button></div>
    <div className="reports-filter"><label><CalendarDays size={16}/> From <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label><label>To <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label><button className="primary-btn" onClick={loadReport} disabled={loading || from > to}>Apply period</button></div>
    {error && <div className="form-error">{error}</div>}
    {loading && !loaded && <div className="empty-state">Loading factory reports…</div>}
    {loaded && <>
      <div className="reports-grid">{cards.map(card => { const Icon = card.icon; return <div className="report-card" key={card.label}><span><Icon size={17}/>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></div> })}</div>
      <div className="reports-lower">
        <div className="report-section"><h3>Financial position</h3><div className="report-line"><span>Sales invoices</span><strong>{money(totals.sales)}</strong></div><div className="report-line"><span>Purchase invoices</span><strong>{money(totals.purchaseInvoices)}</strong></div><div className="report-line"><span>Customer receipts</span><strong>{money(totals.received)}</strong></div><div className="report-line"><span>Supplier payments</span><strong>{money(totals.supplierPaid)}</strong></div><div className="report-line"><span>Receivables outstanding</span><strong>{money(totals.receivable)}</strong></div><div className="report-line"><span>Payables outstanding</span><strong>{money(totals.payable)}</strong></div><small>Outstanding balances are calculated for invoices dated within the selected period.</small></div>
        <div className="report-section"><h3>Expenses by category</h3>{categoryTotals.length ? categoryTotals.map(([category, amount]) => <div className="report-line" key={category}><span>{category}</span><strong>{money(amount)}</strong></div>) : <p className="report-muted">No expenses recorded for this period.</p>}</div>
      </div>
      <p className="report-footnote">Figures are based on entries saved in TexFlow for the selected date range and factory. Job-order count shows all orders currently registered for this factory. Purchases and purchase invoices are shown separately to avoid combining different registers.</p>
    </>}
  </section>
}
