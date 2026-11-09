import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Wallet, ReceiptText, IndianRupee, TrendingDown, TrendingUp } from 'lucide-react'
import type { Tables } from '../types/database'
import { supabase } from '../lib/supabase'

type Invoice = Tables<'account_invoices'>
type Payment = Tables<'account_payments'>
type Props = { organizationId: string; factoryId: string }

const today = () => new Date().toLocaleDateString('en-CA')
const emptyInvoice = {
  invoice_type: 'sales', party_type: 'customer', party_name: '', invoice_number: '',
  invoice_date: today(), due_date: '', subtotal: '', tax_amount: '0', notes: ''
}
const emptyPayment = {
  invoice_id: '', payment_date: today(), amount: '', payment_mode: 'Cash',
  reference_number: '', notes: ''
}
const money = (amount: number) => '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AccountsManagement({ organizationId, factoryId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice)
  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'sales' | 'purchase'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadRecords() {
    if (!supabase || !organizationId || !factoryId) return
    const [invoiceResult, paymentResult] = await Promise.all([
      supabase.from('account_invoices').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('invoice_date', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      supabase.from('account_payments').select('*').eq('organization_id', organizationId).eq('factory_id', factoryId).order('payment_date', { ascending: false }).limit(1000)
    ])
    if (invoiceResult.error) throw invoiceResult.error
    if (paymentResult.error) throw paymentResult.error
    setInvoices(invoiceResult.data ?? [])
    setPayments(paymentResult.data ?? [])
  }

  useEffect(() => {
    let active = true
    loadRecords().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load account records.') })
    return () => { active = false }
  }, [organizationId, factoryId])

  const paidByInvoice = useMemo(() => {
    const totals = new Map<string, number>()
    payments.forEach(p => totals.set(p.invoice_id, (totals.get(p.invoice_id) ?? 0) + Number(p.amount)))
    return totals
  }, [payments])
  const balances = (invoice: Invoice) => Math.max(0, Number(invoice.total_amount) - (paidByInvoice.get(invoice.id) ?? 0))
  const filteredInvoices = invoices.filter(i => filter === 'all' || i.invoice_type === filter)
  const salesTotal = invoices.filter(i => i.invoice_type === 'sales').reduce((n, i) => n + Number(i.total_amount), 0)
  const purchaseTotal = invoices.filter(i => i.invoice_type === 'purchase').reduce((n, i) => n + Number(i.total_amount), 0)
  const received = invoices.filter(i => i.invoice_type === 'sales').reduce((n, i) => n + (paidByInvoice.get(i.id) ?? 0), 0)
  const paid = invoices.filter(i => i.invoice_type === 'purchase').reduce((n, i) => n + (paidByInvoice.get(i.id) ?? 0), 0)
  const receivable = invoices.filter(i => i.invoice_type === 'sales').reduce((n, i) => n + balances(i), 0)
  const payable = invoices.filter(i => i.invoice_type === 'purchase').reduce((n, i) => n + balances(i), 0)

  async function saveInvoice(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !organizationId || !factoryId) return
    setBusy(true); setError(''); setNotice('')
    const subtotal = Number(invoiceForm.subtotal)
    const tax = Number(invoiceForm.tax_amount || 0)
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tax) || tax < 0) {
      setError('Enter valid invoice amounts.'); setBusy(false); return
    }
    const { error: e } = await supabase.from('account_invoices').insert({
      organization_id: organizationId, factory_id: factoryId,
      invoice_type: invoiceForm.invoice_type, party_type: invoiceForm.party_type,
      party_name: invoiceForm.party_name.trim(), invoice_number: invoiceForm.invoice_number.trim(),
      invoice_date: invoiceForm.invoice_date, due_date: invoiceForm.due_date || null,
      subtotal, tax_amount: tax, notes: invoiceForm.notes.trim() || null
    })
    if (e) setError(e.message)
    else {
      setInvoiceForm(emptyInvoice); setInvoiceOpen(false); setNotice('Invoice saved.')
      try { await loadRecords() } catch (err) { setError(err instanceof Error ? err.message : 'Saved, but refresh failed.') }
    }
    setBusy(false)
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !organizationId || !factoryId) return
    const invoice = invoices.find(i => i.id === paymentForm.invoice_id)
    const amount = Number(paymentForm.amount)
    if (!invoice || !Number.isFinite(amount) || amount <= 0 || amount > balances(invoice) + 0.001) {
      setError('Enter a payment greater than zero and no more than the outstanding balance.'); return
    }
    setBusy(true); setError(''); setNotice('')
    const { error: e } = await supabase.from('account_payments').insert({
      organization_id: organizationId, factory_id: factoryId, invoice_id: invoice.id,
      payment_date: paymentForm.payment_date, amount, payment_mode: paymentForm.payment_mode,
      reference_number: paymentForm.reference_number.trim() || null, notes: paymentForm.notes.trim() || null
    })
    if (e) setError(e.message)
    else {
      setPaymentForm(emptyPayment); setPaymentOpen(false); setNotice('Payment recorded.')
      try { await loadRecords() } catch (err) { setError(err instanceof Error ? err.message : 'Saved, but refresh failed.') }
    }
    setBusy(false)
  }

  return <section className="panel data-panel accounts-panel">
    <div className="section-heading">
      <div><h2>Accounts & financial management</h2><p>Sales and purchase invoices, payment entries, receivables and payables</p></div>
      <div className="accounts-actions">
        <button className="secondary-btn" onClick={() => { setPaymentOpen(v => !v); setInvoiceOpen(false); setError('') }}><IndianRupee size={16} /> Record payment</button>
        <button className="primary-btn" onClick={() => { setInvoiceOpen(v => !v); setPaymentOpen(false); setError('') }}><Plus size={16} /> Add invoice</button>
      </div>
    </div>
    <div className="accounts-summary">
      <div><span><TrendingUp size={15} /> Sales invoices</span><strong>{money(salesTotal)}</strong><small>Received {money(received)}</small></div>
      <div><span><TrendingDown size={15} /> Purchase invoices</span><strong>{money(purchaseTotal)}</strong><small>Paid {money(paid)}</small></div>
      <div><span><Wallet size={15} /> Receivables</span><strong>{money(receivable)}</strong><small>Outstanding from customers</small></div>
      <div><span><ReceiptText size={15} /> Payables</span><strong>{money(payable)}</strong><small>Outstanding to suppliers</small></div>
    </div>
    {invoiceOpen && <form className="form-card accounts-form" onSubmit={saveInvoice}>
      <h3>New invoice</h3>
      <div className="form-grid">
        <label>Invoice type<select value={invoiceForm.invoice_type} onChange={e => setInvoiceForm(v => ({ ...v, invoice_type: e.target.value, party_type: e.target.value === 'sales' ? 'customer' : 'supplier' }))}><option value="sales">Sales</option><option value="purchase">Purchase</option></select></label>
        <label>Party type<select value={invoiceForm.party_type} onChange={e => setInvoiceForm(v => ({ ...v, party_type: e.target.value }))}><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="other">Other</option></select></label>
        <label>Customer / supplier name<input value={invoiceForm.party_name} onChange={e => setInvoiceForm(v => ({ ...v, party_name: e.target.value }))} required /></label>
        <label>Invoice number<input value={invoiceForm.invoice_number} onChange={e => setInvoiceForm(v => ({ ...v, invoice_number: e.target.value }))} required /></label>
        <label>Invoice date<input type="date" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm(v => ({ ...v, invoice_date: e.target.value }))} required /></label>
        <label>Due date<input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(v => ({ ...v, due_date: e.target.value }))} /></label>
        <label>Subtotal (₹)<input type="number" min="0" step="0.01" value={invoiceForm.subtotal} onChange={e => setInvoiceForm(v => ({ ...v, subtotal: e.target.value }))} required /></label>
        <label>Tax amount (₹)<input type="number" min="0" step="0.01" value={invoiceForm.tax_amount} onChange={e => setInvoiceForm(v => ({ ...v, tax_amount: e.target.value }))} /></label>
        <label className="form-wide">Notes<input value={invoiceForm.notes} onChange={e => setInvoiceForm(v => ({ ...v, notes: e.target.value }))} /></label>
      </div>
      <div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setInvoiceOpen(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save invoice'}</button></div>
    </form>}
    {paymentOpen && <form className="form-card accounts-form" onSubmit={savePayment}>
      <h3>Record customer receipt / supplier payment</h3>
      <div className="form-grid">
        <label>Invoice<select value={paymentForm.invoice_id} onChange={e => setPaymentForm(v => ({ ...v, invoice_id: e.target.value, amount: '' }))} required><option value="">Select outstanding invoice</option>{invoices.filter(i => balances(i) > 0.001).map(i => <option key={i.id} value={i.id}>{i.invoice_type === 'sales' ? 'Sales' : 'Purchase'} · {i.invoice_number} · {i.party_name} · Balance {money(balances(i))}</option>)}</select></label>
        <label>Payment date<input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(v => ({ ...v, payment_date: e.target.value }))} required /></label>
        <label>Amount (₹)<input type="number" min="0.01" max={paymentForm.invoice_id ? balances(invoices.find(i => i.id === paymentForm.invoice_id)!) : undefined} step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(v => ({ ...v, amount: e.target.value }))} required /></label>
        <label>Payment mode<select value={paymentForm.payment_mode} onChange={e => setPaymentForm(v => ({ ...v, payment_mode: e.target.value }))}>{['Cash','UPI','Bank transfer','Cheque','Card','Other'].map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Reference number<input value={paymentForm.reference_number} onChange={e => setPaymentForm(v => ({ ...v, reference_number: e.target.value }))} /></label>
        <label>Notes<input value={paymentForm.notes} onChange={e => setPaymentForm(v => ({ ...v, notes: e.target.value }))} /></label>
      </div>
      <div className="form-actions"><button type="button" className="secondary-btn" onClick={() => setPaymentOpen(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button></div>
    </form>}
    {error && <div className="form-error">{error}</div>}
    {notice && <div className="form-success">{notice}</div>}
    <div className="table-toolbar"><div><h3>Invoice register</h3><p>Outstanding balances are calculated from recorded payments</p></div><select aria-label="Filter invoices" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="all">All invoices</option><option value="sales">Sales only</option><option value="purchase">Purchases only</option></select></div>
    <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Invoice</th><th>Party</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
      {filteredInvoices.map(i => {
        const balance = balances(i), paidAmount = paidByInvoice.get(i.id) ?? 0
        const status = balance <= 0.001 ? 'Paid' : paidAmount > 0 ? 'Part paid' : 'Unpaid'
        return <tr key={i.id}><td>{i.invoice_date}</td><td>{i.invoice_type === 'sales' ? 'Sales' : 'Purchase'}</td><td><strong>{i.invoice_number}</strong></td><td>{i.party_name}</td><td>{money(Number(i.total_amount))}</td><td>{money(paidAmount)}</td><td><strong>{money(balance)}</strong></td><td><span className={'status-pill ' + (status === 'Paid' ? 'status-paid' : status === 'Part paid' ? 'status-progress' : 'status-pending')}>{status}</span></td></tr>
      })}
    </tbody></table>{!filteredInvoices.length && <div className="empty-state"><ReceiptText size={25} /><strong>No invoices yet</strong><span>Add a sales or purchase invoice to start tracking your accounts.</span></div>}</div>
    <div className="table-toolbar"><div><h3>Recent payments</h3><p>Receipts and supplier payments recorded against invoices</p></div></div>
    <div className="table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Party</th><th>Type</th><th>Mode</th><th>Amount</th><th>Reference</th></tr></thead><tbody>
      {payments.slice(0, 100).map(p => { const i = invoices.find(x => x.id === p.invoice_id); return <tr key={p.id}><td>{p.payment_date}</td><td>{i?.invoice_number ?? 'Invoice'}</td><td>{i?.party_name ?? '—'}</td><td>{i?.invoice_type === 'purchase' ? 'Supplier payment' : 'Customer receipt'}</td><td>{p.payment_mode}</td><td><strong>{money(Number(p.amount))}</strong></td><td>{p.reference_number || '—'}</td></tr> })}
    </tbody></table>{!payments.length && <div className="empty-state"><Wallet size={25} /><strong>No payments recorded</strong><span>Payments will appear here after you record a receipt or payment.</span></div>}</div>
  </section>
}
