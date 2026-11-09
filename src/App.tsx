import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, ChevronDown, CircleHelp, Factory, Languages, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, Users, Wallet, X, Eye, EyeOff, ClipboardList, UserRound, Truck, Receipt, Flame } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Tables } from './types/database'
import EmployeeManagement from './components/EmployeeManagement'
import AccountsManagement from './components/AccountsManagement'
import ReportsManagement from './components/ReportsManagement'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Language = 'en' | 'ta'
type Page = 'overview' | 'customers' | 'orders' | 'production' | 'dispatch' | 'expenses' | 'purchases' | 'inventory' | 'boiler' | 'employees' | 'accounts' | 'reports'
type Organization = Tables<'organizations'>
type FactoryRow = Tables<'factories'>
type Customer = Tables<'customers'>
type JobOrder = Tables<'job_orders'>
type ProductionEntry = Tables<'production_entries'>
type DispatchRow = Tables<'dispatches'>
type ExpenseRow = Tables<'expenses'>
type PurchaseRow = Tables<'purchases'>
type InventoryItem = Tables<'inventory_items'>
type InventoryTransaction = Tables<'inventory_transactions'>
type BoilerLog = Tables<'boiler_logs'>
const today = () => new Date().toLocaleDateString('en-CA')
const emptyBoilerLog = { log_date: today(), firewood_consumed_kg: '', boiler_operating_hours: '', steam_generated_kg: '', fabric_processed_kg: '', fuel_cost: '', notes: '' }
const emptyCustomer = { name: '', phone: '', email: '', gstin: '', address: '' }
const emptyOrder = { order_number: '', customer_id: '', fabric_type: 'Knitted fabric', received_weight_kg: '', expected_delivery_date: '', notes: '' }
const emptyProduction = { job_order_id: '', input_weight_kg: '', output_weight_kg: '', production_date: today(), shift: 'Day', machine_name: 'Syntex A3', notes: '' }
const emptyDispatch = { job_order_id: '', dispatch_date: today(), weight_kg: '', vehicle_number: '', delivery_note_number: '', notes: '' }
const expenseCategories = ['Boiler fuel', 'Electricity', 'Labour', 'Maintenance', 'Transport', 'Rent', 'Consumables', 'Water', 'Other']
const paymentModes = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Card']
const emptyExpense = { expense_date: today(), category: 'Boiler fuel', amount: '', payment_mode: 'Cash', description: '' }
const purchaseCategories = ['Firewood', 'Diesel / fuel', 'Chemicals', 'Spare parts', 'Packing materials', 'Consumables', 'Maintenance', 'Other']
const purchaseUnits = ['kg', 'litre', 'piece', 'tonne', 'bag', 'box', 'load', 'unit']
const emptyPurchase = { purchase_date: today(), supplier_name: '', supplier_phone: '', invoice_number: '', category: 'Firewood', item_name: '', quantity: '', unit: 'kg', unit_price: '', gst_percent: '0', payment_mode: 'Cash', notes: '' }
const emptyInventoryItem = { item_name: '', category: 'Firewood', unit: 'kg', reorder_level: '0' }
const emptyStockMovement = { item_id: '', transaction_type: 'consumption', quantity: '', transaction_date: today(), notes: '' }

export default function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [factories, setFactories] = useState<FactoryRow[]>([])
  const [selectedFactory, setSelectedFactory] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyGstin, setCompanyGstin] = useState('')
  const [factoryName, setFactoryName] = useState('Compacting Unit')
  const [factoryAddress, setFactoryAddress] = useState('')
  const [factoryGstin, setFactoryGstin] = useState('')
  const [metrics, setMetrics] = useState({ orders: 0, production: 0, dispatch: 0, expenses: 0 })
  const [metricsReady, setMetricsReady] = useState(false)
  const [page, setPage] = useState<Page>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([])
  const [dispatches, setDispatches] = useState<DispatchRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([])
  const [boilerLogs, setBoilerLogs] = useState<BoilerLog[]>([])
  const [boilerFormOpen, setBoilerFormOpen] = useState(false)
  const [boilerForm, setBoilerForm] = useState(emptyBoilerLog)
  const [boilerMonth, setBoilerMonth] = useState(today().slice(0, 7))
  const [inventoryItemFormOpen, setInventoryItemFormOpen] = useState(false)
  const [stockMovementFormOpen, setStockMovementFormOpen] = useState(false)
  const [inventoryItemForm, setInventoryItemForm] = useState(emptyInventoryItem)
  const [stockMovementForm, setStockMovementForm] = useState(emptyStockMovement)
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState(emptyExpense)
  const [dispatchFormOpen, setDispatchFormOpen] = useState(false)
  const [dispatchForm, setDispatchForm] = useState(emptyDispatch)
  const [productionFormOpen, setProductionFormOpen] = useState(false)
  const [productionForm, setProductionForm] = useState(emptyProduction)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [customerForm, setCustomerForm] = useState(emptyCustomer)
  const [orderForm, setOrderForm] = useState(emptyOrder)
  const isTa = language === 'ta'
  const tr = useMemo(() => ({
    signin: isTa ? 'உள்நுழைக' : 'Sign in', signup: isTa ? 'கணக்கை உருவாக்கு' : 'Create account',
    email: isTa ? 'மின்னஞ்சல்' : 'Email address', password: isTa ? 'கடவுச்சொல்' : 'Password',
    name: isTa ? 'முழுப் பெயர்' : 'Full name', company: isTa ? 'நிறுவனத்தின் பெயர்' : 'Company name',
    companyGstin: isTa ? 'நிறுவன GSTIN (விருப்பம்)' : 'Company GSTIN (optional)',
    factory: isTa ? 'தொழிற்சாலை பெயர்' : 'Factory name', address: isTa ? 'முகவரி' : 'Address',
    factoryGstin: isTa ? 'தொழிற்சாலை GSTIN (விருப்பம்)' : 'Factory GSTIN (optional)',
    overview: isTa ? 'கண்ணோட்டம்' : 'Overview', customers: isTa ? 'வாடிக்கையாளர்கள்' : 'Customers',
    orders: isTa ? 'வேலை ஆர்டர்கள்' : 'Job orders', production: isTa ? 'இன்றைய உற்பத்தி' : "Today's production",
    dispatch: isTa ? 'அனுப்ப வேண்டியவை' : 'Pending dispatch', expenses: isTa ? 'இன்றைய செலவுகள்' : "Today's expenses",
    signout: isTa ? 'வெளியேறு' : 'Sign out', save: isTa ? 'பணியிடத்தை உருவாக்கு' : 'Create workspace'
  }), [isTa])

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    let alive = true
    supabase.auth.getSession().then(({ data, error: e }) => {
      if (!alive) return
      if (e) setError(e.message)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setError(''); setNotice(''); setAuthReady(true)
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client || !user) {
      setOrganizations([]); setSelectedOrg(''); setFactories([]); setSelectedFactory('')
      setWorkspaceReady(true); return
    }
    let alive = true
    setWorkspaceReady(false)
    const load = async () => {
      const full = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
      const { error: pe } = await client.from('profiles').upsert({ id: user.id, full_name: full || null })
      if (pe) throw pe
      const { data, error: oe } = await client.from('organizations').select('*').order('created_at')
      if (oe) throw oe
      if (!alive) return
      setOrganizations(data ?? [])
      setSelectedOrg(current => (data ?? []).some(row => row.id === current) ? current : (data?.[0]?.id ?? ''))
      setWorkspaceReady(true)
    }
    load().catch(e => { if (alive) { setError(e instanceof Error ? e.message : 'Could not load workspace.'); setWorkspaceReady(true) } })
    return () => { alive = false }
  }, [user])

  useEffect(() => {
    if (!supabase || !user || !selectedOrg) { setFactories([]); setSelectedFactory(''); return }
    let alive = true
    supabase.from('factories').select('*').eq('organization_id', selectedOrg).order('name').then(({ data, error: e }) => {
      if (!alive) return
      if (e) { setError(e.message); return }
      setFactories(data ?? [])
      setSelectedFactory(current => (data ?? []).some(row => row.id === current) ? current : (data?.[0]?.id ?? ''))
    })
    return () => { alive = false }
  }, [user, selectedOrg])

  async function loadProductionEntries() {
    const client = supabase
    if (!client || !selectedOrg || !selectedFactory) { setProductionEntries([]); return }
    const { data, error: e } = await client.from('production_entries').select('*').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).order('production_date', { ascending: false }).order('created_at', { ascending: false }).limit(200)
    if (e) throw e
    setProductionEntries(data ?? [])
  }

  async function loadInventoryRecords() {
    if (!supabase || !selectedOrg || !selectedFactory) { setInventoryItems([]); setInventoryTransactions([]); return }
    const [items, movements] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).order('item_name'),
      supabase.from('inventory_transactions').select('*').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(500)
    ])
    const failure = items.error || movements.error
    if (failure) throw failure
    setInventoryItems(items.data ?? [])
    setInventoryTransactions(movements.data ?? [])
  }

  async function loadBoilerLogs() {
    if (!supabase || !selectedOrg || !selectedFactory) { setBoilerLogs([]); return }
    const { data, error: e } = await supabase.from('boiler_logs').select('*').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).order('log_date', { ascending: false }).limit(500)
    if (e) throw e
    setBoilerLogs(data ?? [])
  }

  async function loadPurchaseRecords() {
    if (!supabase || !selectedOrg || !selectedFactory) { setPurchases([]); return }
    const { data, error: e } = await supabase.from('purchases').select('*').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).order('purchase_date', { ascending: false }).order('created_at', { ascending: false }).limit(500)
    if (e) throw e
    setPurchases(data ?? [])
  }

  async function loadExpenseRecords() {
    if (!supabase || !selectedOrg) { setExpenses([]); return }
    const { data, error: e } = await supabase.from('expenses').select('*').eq('organization_id', selectedOrg).order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(500)
    if (e) throw e
    setExpenses(data ?? [])
  }

  async function loadDispatchRecords() {
    if (!supabase || !selectedOrg) { setDispatches([]); return }
    const { data, error: e } = await supabase.from('dispatches').select('*').eq('organization_id', selectedOrg).order('dispatch_date', { ascending: false }).order('created_at', { ascending: false }).limit(200)
    if (e) throw e
    setDispatches(data ?? [])
  }

  async function loadBusinessRecords() {
    if (!supabase || !selectedOrg) return
    const [c, j] = await Promise.all([
      supabase.from('customers').select('*').eq('organization_id', selectedOrg).order('name'),
      supabase.from('job_orders').select('*').eq('organization_id', selectedOrg).order('created_at', { ascending: false }).limit(100)
    ])
    const failed = c.error || j.error
    if (failed) throw failed
    setCustomers(c.data ?? [])
    setJobOrders(j.data ?? [])
  }

  useEffect(() => {
    if (!user || !selectedOrg) return
    let alive = true
    Promise.all([loadBusinessRecords(), loadDispatchRecords(), loadExpenseRecords(), loadPurchaseRecords(), loadInventoryRecords()]).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load records.') })
    return () => { alive = false }
  }, [user, selectedOrg])

  useEffect(() => {
    if (!user || !selectedOrg || !selectedFactory) { setProductionEntries([]); setBoilerLogs([]); return }
    let alive = true
    Promise.all([loadProductionEntries(), loadBoilerLogs()]).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load production or boiler records.') })
    return () => { alive = false }
  }, [user, selectedOrg, selectedFactory])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !selectedOrg || !selectedFactory) { setMetricsReady(false); return }
    let alive = true
    setMetricsReady(false)
    const load = async () => {
      const day = today()
      const [o, p, d, e] = await Promise.all([
        client.from('job_orders').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).in('status', ['received', 'in_production']),
        client.from('production_entries').select('output_weight_kg').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).eq('production_date', day),
        client.from('job_orders').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).eq('status', 'completed'),
        client.from('expenses').select('amount').eq('organization_id', selectedOrg).eq('expense_date', day)
      ])
      const failure = [o.error, p.error, d.error, e.error].find(Boolean)
      if (failure) throw failure
      if (!alive) return
      setMetrics({ orders: o.count ?? 0, production: (p.data ?? []).reduce((s, r) => s + Number(r.output_weight_kg), 0), dispatch: d.count ?? 0, expenses: (e.data ?? []).reduce((s, r) => s + Number(r.amount), 0) })
      setMetricsReady(true)
    }
    load().catch(e => { if (alive) { setError(e instanceof Error ? e.message : 'Could not load dashboard.'); setMetricsReady(true) } })
    return () => { alive = false }
  }, [user, selectedOrg, selectedFactory])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
        if (e) throw e
        if (!data.session) { setNotice('Account created. Check your email to confirm your address, then sign in.'); setMode('signin') }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (e) throw e
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  async function resetPassword() {
    if (!supabase || !email.trim()) { setError('Enter your email address first.'); return }
    setBusy(true); setError(''); setNotice('')
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    if (e) setError(e.message); else setNotice('Password reset link sent. Check your email.')
  }

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    setBusy(true); setError('')
    try {
      let orgId = selectedOrg
      if (!orgId) {
        if (!companyName.trim()) throw new Error('Enter your company name.')
        const { data, error: e } = await supabase.from('organizations').insert({ name: companyName.trim(), gstin: companyGstin.trim() || null, created_by: user.id }).select('*').single()
        if (e) throw e
        orgId = data.id; setOrganizations([data]); setSelectedOrg(orgId)
      }
      if (!factoryName.trim()) throw new Error('Enter your factory name.')
      const { data, error: e } = await supabase.from('factories').insert({ organization_id: orgId, name: factoryName.trim(), address: factoryAddress.trim() || null, gstin: factoryGstin.trim() || null }).select('*').single()
      if (e) throw e
      setFactories([data]); setSelectedFactory(data.id); setNotice('Factory registered successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save workspace.') }
    finally { setBusy(false) }
  }

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { error: e } = await supabase.from('customers').insert({
        organization_id: selectedOrg, name: customerForm.name.trim(),
        phone: customerForm.phone.trim() || null, email: customerForm.email.trim() || null,
        gstin: customerForm.gstin.trim().toUpperCase() || null, address: customerForm.address.trim() || null
      })
      if (e) throw e
      setCustomerForm(emptyCustomer); setCustomerFormOpen(false)
      await loadBusinessRecords()
      setNotice('Customer saved successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save customer.') }
    finally { setBusy(false) }
  }

  async function addJobOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const weight = Number(orderForm.received_weight_kg)
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('Enter a received weight greater than zero.')
      const { error: e } = await supabase.from('job_orders').insert({
        organization_id: selectedOrg, factory_id: selectedFactory,
        customer_id: orderForm.customer_id, order_number: orderForm.order_number.trim(),
        fabric_type: orderForm.fabric_type.trim(), received_weight_kg: weight,
        expected_delivery_date: orderForm.expected_delivery_date || null,
        notes: orderForm.notes.trim() || null, status: 'received'
      })
      if (e) throw e
      setOrderForm(emptyOrder); setOrderFormOpen(false)
      await loadBusinessRecords()
      setNotice('Job order created successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create job order.') }
    finally { setBusy(false) }
  }

  async function addProductionEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase
    if (!client || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const order = jobOrders.find(row => row.id === productionForm.job_order_id)
      if (!order) throw new Error('Select a valid job order.')
      if (['completed', 'dispatched', 'cancelled'].includes(order.status)) throw new Error('This job order is closed for production entries.')
      const input = Number(productionForm.input_weight_kg)
      const output = Number(productionForm.output_weight_kg)
      if (!Number.isFinite(input) || input <= 0) throw new Error('Enter an input weight greater than zero.')
      if (!Number.isFinite(output) || output <= 0) throw new Error('Enter an output weight greater than zero.')
      if (output > input) throw new Error('Output weight cannot be greater than input weight for compacting.')
      const { data: prior, error: priorError } = await client.from('production_entries').select('input_weight_kg').eq('organization_id', selectedOrg).eq('job_order_id', order.id)
      if (priorError) throw priorError
      const alreadyProcessed = (prior ?? []).reduce((sum, row) => sum + Number(row.input_weight_kg), 0)
      const remaining = Math.max(0, Number(order.received_weight_kg) - alreadyProcessed)
      if (input > remaining + 0.001) throw new Error('Input exceeds the remaining received fabric. Remaining: ' + remaining.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg.')
      const { error: insertError } = await client.from('production_entries').insert({ organization_id: selectedOrg, factory_id: selectedFactory, job_order_id: order.id, input_weight_kg: input, output_weight_kg: output, production_date: productionForm.production_date, shift: productionForm.shift, machine_name: productionForm.machine_name.trim() || null, notes: productionForm.notes.trim() || null })
      if (insertError) throw insertError
      let statusWarning = ''
      if (order.status === 'received') {
        const { error: statusError } = await client.from('job_orders').update({ status: 'in_production' }).eq('id', order.id).eq('organization_id', selectedOrg)
        if (statusError) statusWarning = ' Production saved, but order status could not be updated: ' + statusError.message
      }
      setProductionForm({ ...emptyProduction, production_date: productionForm.production_date, machine_name: productionForm.machine_name })
      setProductionFormOpen(false)
      await Promise.all([loadProductionEntries(), loadBusinessRecords()])
      setNotice('Production entry saved successfully.' + statusWarning)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save production entry.') }
    finally { setBusy(false) }
  }

  async function addDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase
    if (!client || !selectedOrg) return
    setBusy(true); setError(''); setNotice('')
    try {
      const order = jobOrders.find(row => row.id === dispatchForm.job_order_id)
      if (!order) throw new Error('Select a valid job order.')
      if (order.status === 'cancelled' || order.status === 'dispatched') throw new Error('This job order is not available for dispatch.')
      const weight = Number(dispatchForm.weight_kg)
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('Enter a dispatch weight greater than zero.')
      const { data: producedRows, error: productionError } = await client.from('production_entries').select('output_weight_kg').eq('organization_id', selectedOrg).eq('job_order_id', order.id)
      if (productionError) throw productionError
      const produced = (producedRows ?? []).reduce((sum, row) => sum + Number(row.output_weight_kg), 0)
      const { data: priorRows, error: dispatchError } = await client.from('dispatches').select('weight_kg').eq('organization_id', selectedOrg).eq('job_order_id', order.id)
      if (dispatchError) throw dispatchError
      const alreadyDispatched = (priorRows ?? []).reduce((sum, row) => sum + Number(row.weight_kg), 0)
      const available = Math.max(0, produced - alreadyDispatched)
      if (weight > available + 0.001) throw new Error('Dispatch exceeds available finished fabric. Available: ' + available.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' kg.')
      const { error: insertError } = await client.from('dispatches').insert({ organization_id: selectedOrg, job_order_id: order.id, dispatch_date: dispatchForm.dispatch_date, weight_kg: weight, vehicle_number: dispatchForm.vehicle_number.trim() || null, delivery_note_number: dispatchForm.delivery_note_number.trim() || null, notes: dispatchForm.notes.trim() || null })
      if (insertError) throw insertError
      const totalDispatched = alreadyDispatched + weight
      let statusWarning = ''
      if (produced > 0 && totalDispatched >= produced - 0.001) {
        const { error: statusError } = await client.from('job_orders').update({ status: 'dispatched' }).eq('id', order.id).eq('organization_id', selectedOrg)
        if (statusError) statusWarning = ' Dispatch saved, but order status could not be updated: ' + statusError.message
      }
      setDispatchForm({ ...emptyDispatch, dispatch_date: dispatchForm.dispatch_date })
      setDispatchFormOpen(false)
      await Promise.all([loadDispatchRecords(), loadBusinessRecords()])
      setNotice('Dispatch recorded successfully.' + statusWarning)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save dispatch.') }
    finally { setBusy(false) }
  }

  async function addInventoryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const reorder = Number(inventoryItemForm.reorder_level)
      if (!inventoryItemForm.item_name.trim()) throw new Error('Enter an inventory item name.')
      if (!Number.isFinite(reorder) || reorder < 0) throw new Error('Reorder level cannot be negative.')
      const { error: e } = await supabase.from('inventory_items').insert({ organization_id: selectedOrg, factory_id: selectedFactory, item_name: inventoryItemForm.item_name.trim(), category: inventoryItemForm.category, unit: inventoryItemForm.unit, reorder_level: reorder })
      if (e) throw e
      setInventoryItemForm(emptyInventoryItem); setInventoryItemFormOpen(false)
      await loadInventoryRecords(); setNotice('Inventory item created. Record opening stock using Stock in.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create inventory item.') }
    finally { setBusy(false) }
  }

  async function addStockMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const quantity = Number(stockMovementForm.quantity)
      if (!stockMovementForm.item_id) throw new Error('Select an inventory item.')
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Enter a quantity greater than zero.')
      const { error: e } = await supabase.from('inventory_transactions').insert({ organization_id: selectedOrg, factory_id: selectedFactory, item_id: stockMovementForm.item_id, transaction_type: stockMovementForm.transaction_type, quantity, transaction_date: stockMovementForm.transaction_date, notes: stockMovementForm.notes.trim() || null })
      if (e) throw e
      setStockMovementForm({ ...emptyStockMovement, transaction_date: stockMovementForm.transaction_date }); setStockMovementFormOpen(false)
      await loadInventoryRecords(); setNotice('Stock movement recorded successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record stock movement.') }
    finally { setBusy(false) }
  }

  async function addBoilerLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const firewood = Number(boilerForm.firewood_consumed_kg)
      const hours = Number(boilerForm.boiler_operating_hours)
      const fabric = Number(boilerForm.fabric_processed_kg)
      const fuelCost = Number(boilerForm.fuel_cost)
      const steam = boilerForm.steam_generated_kg.trim() === '' ? null : Number(boilerForm.steam_generated_kg)
      if (!Number.isFinite(firewood) || firewood < 0) throw new Error('Enter a valid firewood quantity.')
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) throw new Error('Boiler operating hours must be between 0 and 24.')
      if (!Number.isFinite(fabric) || fabric < 0) throw new Error('Enter a valid fabric processed quantity.')
      if (!Number.isFinite(fuelCost) || fuelCost < 0) throw new Error('Enter a valid fuel cost.')
      if (steam !== null && (!Number.isFinite(steam) || steam < 0)) throw new Error('Enter a valid steam quantity.')
      const { error: e } = await supabase.from('boiler_logs').upsert({ organization_id: selectedOrg, factory_id: selectedFactory, log_date: boilerForm.log_date, firewood_consumed_kg: firewood, boiler_operating_hours: hours, steam_generated_kg: steam, fabric_processed_kg: fabric, fuel_cost: fuelCost, notes: boilerForm.notes.trim() || null }, { onConflict: 'factory_id,log_date' })
      if (e) throw e
      setBoilerForm(emptyBoilerLog); setBoilerFormOpen(false)
      await loadBoilerLogs(); setNotice('Boiler and fuel record saved. Existing entry for the same date was updated.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save boiler log.') }
    finally { setBusy(false) }
  }

  async function addPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg || !selectedFactory) return
    setBusy(true); setError(''); setNotice('')
    try {
      const quantity = Number(purchaseForm.quantity)
      const unitPrice = Number(purchaseForm.unit_price)
      const gst = Number(purchaseForm.gst_percent)
      if (!purchaseForm.supplier_name.trim()) throw new Error('Enter the supplier name.')
      if (!purchaseForm.item_name.trim()) throw new Error('Enter the item or material name.')
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.')
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Enter a valid unit price.')
      if (!Number.isFinite(gst) || gst < 0 || gst > 100) throw new Error('GST must be between 0 and 100%.')
      const { error: e } = await supabase.from('purchases').insert({ organization_id: selectedOrg, factory_id: selectedFactory, purchase_date: purchaseForm.purchase_date, supplier_name: purchaseForm.supplier_name.trim(), supplier_phone: purchaseForm.supplier_phone.trim() || null, invoice_number: purchaseForm.invoice_number.trim() || null, category: purchaseForm.category, item_name: purchaseForm.item_name.trim(), quantity, unit: purchaseForm.unit, unit_price: unitPrice, gst_percent: gst, payment_mode: purchaseForm.payment_mode || null, notes: purchaseForm.notes.trim() || null })
      if (e) throw e
      setPurchaseForm({ ...emptyPurchase, purchase_date: purchaseForm.purchase_date })
      setPurchaseFormOpen(false)
      await loadPurchaseRecords()
      setNotice('Purchase recorded successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save purchase.') }
    finally { setBusy(false) }
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedOrg) return
    setBusy(true); setError(''); setNotice('')
    try {
      const amount = Number(expenseForm.amount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an expense amount greater than zero.')
      if (!expenseForm.expense_date) throw new Error('Select the expense date.')
      if (!expenseForm.category.trim()) throw new Error('Select an expense category.')
      const { error: e } = await supabase.from('expenses').insert({ organization_id: selectedOrg, expense_date: expenseForm.expense_date, category: expenseForm.category, amount, payment_mode: expenseForm.payment_mode || null, description: expenseForm.description.trim() || null })
      if (e) throw e
      setExpenseForm({ ...emptyExpense, expense_date: expenseForm.expense_date })
      setExpenseFormOpen(false)
      await loadExpenseRecords()
      setNotice('Expense recorded successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save expense.') }
    finally { setBusy(false) }
  }

  async function updateOrderStatus(id: string, status: string) {
    if (!supabase || !selectedOrg) return
    setBusy(true); setError('')
    const { error: e } = await supabase.from('job_orders').update({ status }).eq('id', id).eq('organization_id', selectedOrg)
    if (e) setError(e.message)
    else { await loadBusinessRecords(); setNotice('Job order status updated.') }
    setBusy(false)
  }

  async function signOut() {
    if (!supabase) return
    const { error: e } = await supabase.auth.signOut()
    if (e) setError(e.message)
  }

  if (!authReady || (user && !workspaceReady)) return <main className="login-page"><div className="login-card"><Brand /><p className="auth-muted">Loading your secure TexFlow workspace…</p></div></main>
  if (!isSupabaseConfigured) return <main className="login-page"><div className="login-card auth-card"><Brand /><span className="eyebrow">SUPABASE CONNECTION REQUIRED</span><h1>Welcome to TexFlow</h1><p>Manage your textile business in one place.</p><div className="setup-notice"><ShieldCheck size={19} /><div><strong>Connect your Supabase project</strong><p>Add these values to .env.local and your hosting settings. Never use a service-role key in the browser.</p></div></div><pre className="env-snippet">VITE_SUPABASE_URL=https://mqujkkdiopiakffnyenu.supabase.co{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY=your_sb_publishable_key</pre><LanguageSwitch language={language} setLanguage={setLanguage} /></div></main>
  if (!user) return <main className="login-page"><div className="login-card auth-card"><Brand /><span className="eyebrow">SECURE FACTORY MANAGEMENT</span><h1>Welcome to TexFlow</h1><p>Manage your textile business in one place.</p><div className="auth-tabs"><button className={mode === 'signin' ? 'selected' : ''} onClick={() => { setMode('signin'); setError(''); setNotice('') }}>Sign in</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Create account</button></div><form className="auth-form" onSubmit={submitAuth}>{mode === 'signup' && <label>Full name<input autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required /></label>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{mode === 'signin' && <button type="button" className="forgot-btn" onClick={resetPassword} disabled={busy}>Forgot password?</button>}<button className="primary-btn full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? tr.signin : tr.signup}</button></form>{error && <p className="form-message error-message" role="alert">{error}</p>}{notice && <p className="form-message success-message" role="status">{notice}</p>}<LanguageSwitch language={language} setLanguage={setLanguage} /><p className="login-note"><ShieldCheck size={14} /> Supabase authentication · Secure session</p></div></main>

  const currentOrg = organizations.find(row => row.id === selectedOrg)
  if (!organizations.length || !factories.length) return <main className="login-page"><div className="login-card auth-card onboarding-card"><Brand /><span className="eyebrow">WORKSPACE SETUP</span><h1>{!organizations.length ? 'Set up your company' : 'Register your first factory'}</h1><p>Enter your company and first factory details to get started.</p><form className="auth-form" onSubmit={saveWorkspace}>{!organizations.length && <><label>{tr.company}<input value={companyName} onChange={e => setCompanyName(e.target.value)} required /></label><label>{tr.companyGstin}<input value={companyGstin} onChange={e => setCompanyGstin(e.target.value.toUpperCase())} /></label></>}<label>{tr.factory}<input value={factoryName} onChange={e => setFactoryName(e.target.value)} required /></label><label>{tr.address}<textarea rows={2} value={factoryAddress} onChange={e => setFactoryAddress(e.target.value)} /></label><label>{tr.factoryGstin}<input value={factoryGstin} onChange={e => setFactoryGstin(e.target.value.toUpperCase())} /></label><button className="primary-btn full" type="submit" disabled={busy}>{busy ? 'Saving…' : tr.save}</button></form>{error && <p className="form-message error-message">{error}</p>}<button className="subtle-btn" onClick={signOut}>{tr.signout}</button></div></main>

  const modules = [
    { key: 'customers' as Page, icon: Users, label: tr.customers, color: 'amber' },
    { key: 'orders' as Page, icon: ClipboardList, label: tr.orders, color: 'blue' },
    { key: 'production' as Page, icon: Factory, label: 'Production', color: 'mint' },
    { key: 'dispatch' as Page, icon: Truck, label: 'Dispatch', color: 'green' },
    { key: 'expenses' as Page, icon: Receipt, label: 'Expenses', color: 'amber' },
    { key: 'purchases' as Page, icon: Package, label: 'Purchases', color: 'blue' },
    { key: 'inventory' as Page, icon: Boxes, label: 'Inventory', color: 'mint' }, 

    { key: 'overview' as Page, icon: Activity, label: tr.overview, color: 'mint' }
  ]
  const filteredCustomers = customers.filter(c => [c.name, c.phone ?? '', c.email ?? '', c.gstin ?? ''].join(' ').toLowerCase().includes(customerSearch.toLowerCase()))
  const filteredOrders = jobOrders.filter(o => [o.order_number, o.fabric_type, customers.find(c => c.id === o.customer_id)?.name ?? '', o.status].join(' ').toLowerCase().includes(orderSearch.toLowerCase()))
  const customerName = (id: string) => customers.find(c => c.id === id)?.name ?? 'Unknown customer'

  return <div className="app-shell">
    <aside className={'sidebar ' + (menuOpen ? 'sidebar-open' : '')}>
      <div className="side-brand"><Brand /></div><div className="workspace-label">WORKSPACE</div>
      <div className="factory-chip"><Building2 size={17} /><select aria-label="Select company" value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select><ChevronDown size={14} /></div>
      <div className="factory-chip factory-select"><Factory size={17} /><select aria-label="Select factory" value={selectedFactory} onChange={e => setSelectedFactory(e.target.value)}>{factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><ChevronDown size={14} /></div>
      <nav className="side-nav"><span className="nav-caption">WORKSPACE</span>
        <button className={'nav-link ' + (page === 'overview' ? 'active' : '')} onClick={() => { setPage('overview'); setMenuOpen(false) }}><Activity size={18} />{tr.overview}</button>
        <button className={'nav-link ' + (page === 'customers' ? 'active' : '')} onClick={() => { setPage('customers'); setMenuOpen(false) }}><Users size={18} />{tr.customers}</button>
        <button className={'nav-link ' + (page === 'orders' ? 'active' : '')} onClick={() => { setPage('orders'); setMenuOpen(false) }}><ClipboardList size={18} />{tr.orders}</button>
        <button className={'nav-link ' + (page === 'production' ? 'active' : '')} onClick={() => { setPage('production'); setMenuOpen(false) }}><Factory size={18} />Production</button>
        <button className={'nav-link ' + (page === 'dispatch' ? 'active' : '')} onClick={() => { setPage('dispatch'); setMenuOpen(false) }}><Truck size={18} />Dispatch</button>
        <button className={'nav-link ' + (page === 'expenses' ? 'active' : '')} onClick={() => { setPage('expenses'); setMenuOpen(false) }}><Receipt size={18} />Expenses</button>
        <button className={'nav-link ' + (page === 'purchases' ? 'active' : '')} onClick={() => { setPage('purchases'); setMenuOpen(false) }}><Package size={18} />Purchases</button>
        <button className={'nav-link ' + (page === 'inventory' ? 'active' : '')} onClick={() => { setPage('inventory'); setMenuOpen(false) }}><Boxes size={18} />Inventory</button>
        <button className={'nav-link ' + (page === 'boiler' ? 'active' : '')} onClick={() => { setPage('boiler'); setMenuOpen(false) }}><Flame size={18} />Boiler & fuel</button>
        <button className={'nav-link ' + (page === 'employees' ? 'active' : '')} onClick={() => { setPage('employees'); setMenuOpen(false) }}><Users size={18} />Employees & attendance</button>
        <button className={'nav-link ' + (page === 'accounts' ? 'active' : '')} onClick={() => { setPage('accounts'); setMenuOpen(false) }}><Wallet size={18} />Accounts</button>
        <button className={'nav-link ' + (page === 'reports' ? 'active' : '')} onClick={() => { setPage('reports'); setMenuOpen(false) }}><Package size={18} />Reports & analytics</button>
      </nav>
      <div className="sidebar-bottom"><button className="nav-link" onClick={() => setNotice('Settings will be added in a later stage.')}><Settings size={18} />Settings</button><button className="nav-link" onClick={() => setNotice('Help and support will be added in a later stage.')}><CircleHelp size={18} />Help & support</button><div className="profile-row"><div className="avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div><div><strong>{user.user_metadata?.full_name || user.email}</strong><small>{user.email}</small></div><button className="icon-btn" aria-label={tr.signout} onClick={signOut}><LogOut size={17} /></button></div></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button><div className="breadcrumb">{currentOrg?.name ?? 'Workspace'} <span>/</span> {page === 'overview' ? tr.overview : page === 'customers' ? tr.customers : page === 'orders' ? tr.orders : page === 'production' ? 'Production' : page === 'dispatch' ? 'Dispatch' : page === 'expenses' ? 'Expenses' : page === 'purchases' ? 'Purchases' : page === 'inventory' ? 'Inventory' : page === 'employees' ? 'Employees & attendance' : page === 'accounts' ? 'Accounts' : page === 'reports' ? 'Reports & analytics' : 'Boiler & fuel'}</div><div className="top-actions"><LanguageSwitch language={language} setLanguage={setLanguage} /><button className="icon-btn notification" aria-label="Notifications"><Bell size={19} /></button><div className="top-avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div></div></header>
      <div className="content">
        {page === 'overview' && <>
          <div className="welcome-row"><div><span className="eyebrow">LIVE WORKSPACE · {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</span><h1>Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]} <span>✦</span></h1><p>Here is the live overview of your factory workspace.</p></div><div className="demo-tag"><span />Connected</div></div>
          <section className="stats-section"><div className="section-heading"><div><h2>{tr.overview}</h2><p>{factories.find(f => f.id === selectedFactory)?.name}</p></div><span className="period-pill"><CalendarDays size={15} /> Today</span></div><div className="stats-grid">
            <StatCard icon={<Activity />} label={tr.orders} value={metricsReady ? String(metrics.orders) : '—'} note="Received and in production" />
            <StatCard icon={<Package />} label={tr.production} value={metricsReady ? metrics.production.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'} unit="kg" note="Recorded output weight" />
            <StatCard icon={<Boxes />} label={tr.dispatch} value={metricsReady ? String(metrics.dispatch) : '—'} note="Completed job orders" />
            <StatCard icon={<Wallet />} label={tr.expenses} value={metricsReady ? '₹' + metrics.expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'} note="Expenses recorded today" />
          </div></section>
          <section className="lower-grid"><div className="panel quick-panel"><div className="section-heading"><div><h2>Quick access</h2><p>Your factory modules</p></div></div><div className="module-grid">{modules.map(({ key, icon: Icon, label, color }) => <button className="module-tile" key={key} onClick={() => setPage(key)}><span className={'module-icon ' + color}><Icon size={21} /></span><strong>{label}</strong><span className="tile-arrow">↗</span></button>)}</div></div>
          <div className="panel activity-panel"><div className="section-heading"><div><h2>Workspace details</h2><p>Your registered business</p></div></div><div className="workspace-detail"><Building2 size={18} /><div><strong>{currentOrg?.name}</strong><small>{currentOrg?.gstin || 'Company GSTIN not added'}</small></div></div><div className="workspace-detail"><Factory size={18} /><div><strong>{factories.find(f => f.id === selectedFactory)?.name}</strong><small>{factories.find(f => f.id === selectedFactory)?.address || 'Factory address not added'}</small></div></div><div className="workspace-detail"><ShieldCheck size={18} /><div><strong>{user.email}</strong><small>Authenticated Supabase account</small></div></div></div></section>
        </>}
        {page === 'customers' && <section className="panel data-panel"><div className="section-heading"><div><h2>Customers</h2><p>Customer directory for this company</p></div><button className="primary-btn" onClick={() => { setCustomerFormOpen(!customerFormOpen); setError('') }}><Plus size={16} /> Add customer</button></div>
          {customerFormOpen && <form className="record-form" onSubmit={addCustomer}><label>Customer name *<input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} required /></label><label>Phone number<input type="tel" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} /></label><label>Email<input type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} /></label><label>GSTIN<input value={customerForm.gstin} onChange={e => setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })} /></label><label className="wide-field">Address<textarea rows={2} value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} /></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button><button className="secondary-btn" type="button" onClick={() => setCustomerFormOpen(false)}>Cancel</button></div></form>}
          <div className="table-toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search customers…" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} /></div><span>{filteredCustomers.length} customers</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>GSTIN</th><th>Address</th></tr></thead><tbody>{filteredCustomers.map(c => <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.phone || '—'}</td><td>{c.email || '—'}</td><td>{c.gstin || '—'}</td><td>{c.address || '—'}</td></tr>)}</tbody></table>{!filteredCustomers.length && <div className="empty-state"><UserRound size={25} /><strong>No customers found</strong><span>Add a customer to start creating job orders.</span></div>}</div>
        </section>}
        {page === 'orders' && <section className="panel data-panel"><div className="section-heading"><div><h2>Job orders</h2><p>Fabric received from customers for processing</p></div><button className="primary-btn" onClick={() => { setOrderFormOpen(!orderFormOpen); setError('') }}><Plus size={16} /> New job order</button></div>
          {orderFormOpen && <form className="record-form" onSubmit={addJobOrder}><label>Order number *<input value={orderForm.order_number} onChange={e => setOrderForm({ ...orderForm, order_number: e.target.value })} required /></label><label>Customer *<select value={orderForm.customer_id} onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value })} required><option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Fabric type *<select value={orderForm.fabric_type} onChange={e => setOrderForm({ ...orderForm, fabric_type: e.target.value })}><option>Knitted fabric</option><option>Single jersey</option><option>Rib</option><option>Interlock</option><option>Fleece</option><option>French terry</option><option>Other</option></select></label><label>Received weight (kg) *<input type="number" min="0.01" step="0.01" value={orderForm.received_weight_kg} onChange={e => setOrderForm({ ...orderForm, received_weight_kg: e.target.value })} required /></label><label>Expected delivery date<input type="date" value={orderForm.expected_delivery_date} onChange={e => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })} /></label><label className="wide-field">Notes<textarea rows={2} value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} /></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy || !customers.length}>{busy ? 'Saving…' : 'Save job order'}</button><button className="secondary-btn" type="button" onClick={() => setOrderFormOpen(false)}>Cancel</button>{!customers.length && <span className="field-hint">Add a customer before creating an order.</span>}</div></form>}
          <div className="table-toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search orders…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} /></div><span>{filteredOrders.length} orders</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Order no.</th><th>Customer</th><th>Fabric</th><th>Received (kg)</th><th>Delivery date</th><th>Status</th></tr></thead><tbody>{filteredOrders.map(o => <tr key={o.id}><td><strong>{o.order_number}</strong></td><td>{customerName(o.customer_id)}</td><td>{o.fabric_type}</td><td>{Number(o.received_weight_kg).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{o.expected_delivery_date || '—'}</td><td><select className={'status-select status-' + o.status} value={o.status} disabled={busy} onChange={e => updateOrderStatus(o.id, e.target.value)}><option value="received">Received</option><option value="in_production">In production</option><option value="completed">Completed</option><option value="dispatched">Dispatched</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table>{!filteredOrders.length && <div className="empty-state"><ClipboardList size={25} /><strong>No job orders found</strong><span>Create a job order after adding your customer.</span></div>}</div>
        </section>}
        {page === 'production' && <section className="panel data-panel"><div className="section-heading"><div><h2>Production entries</h2><p>Record compacting input and finished output for each job order</p></div><button className="primary-btn" onClick={() => { setProductionFormOpen(!productionFormOpen); setError(''); setNotice('') }}><Plus size={16} /> Add production</button></div>
          {productionFormOpen && <form className="record-form" onSubmit={addProductionEntry}>
            <label>Job order *<select value={productionForm.job_order_id} onChange={e => setProductionForm({ ...productionForm, job_order_id: e.target.value })} required><option value="">Select open job order</option>{jobOrders.filter(o => !['completed','dispatched','cancelled'].includes(o.status)).map(o => <option key={o.id} value={o.id}>{o.order_number} · {customerName(o.customer_id)} · {Number(o.received_weight_kg).toLocaleString('en-IN')} kg</option>)}</select></label>
            <label>Production date *<input type="date" value={productionForm.production_date} onChange={e => setProductionForm({ ...productionForm, production_date: e.target.value })} required /></label>
            <label>Input weight (kg) *<input type="number" min="0.01" step="0.01" value={productionForm.input_weight_kg} onChange={e => setProductionForm({ ...productionForm, input_weight_kg: e.target.value })} required /></label>
            <label>Output weight (kg) *<input type="number" min="0.01" step="0.01" value={productionForm.output_weight_kg} onChange={e => setProductionForm({ ...productionForm, output_weight_kg: e.target.value })} required /></label>
            <label>Machine name<input value={productionForm.machine_name} onChange={e => setProductionForm({ ...productionForm, machine_name: e.target.value })} placeholder="e.g. Syntex A3" /></label>
            <label>Shift<select value={productionForm.shift} onChange={e => setProductionForm({ ...productionForm, shift: e.target.value })}><option>Day</option><option>Evening</option><option>Night</option></select></label>
            <label className="wide-field">Notes<textarea rows={2} value={productionForm.notes} onChange={e => setProductionForm({ ...productionForm, notes: e.target.value })} /></label>
            <div className="production-preview wide-field"><div><span>Weight loss</span><strong>{Number(productionForm.input_weight_kg) > 0 && Number(productionForm.output_weight_kg) >= 0 ? (Number(productionForm.input_weight_kg) - Number(productionForm.output_weight_kg)).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'} kg</strong></div><div><span>Loss percentage</span><strong>{Number(productionForm.input_weight_kg) > 0 && Number(productionForm.output_weight_kg) >= 0 ? (((Number(productionForm.input_weight_kg) - Number(productionForm.output_weight_kg)) / Number(productionForm.input_weight_kg)) * 100).toFixed(2) + '%' : '—'}</strong></div></div>
            <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy || !jobOrders.some(o => o.id === productionForm.job_order_id && !['completed','dispatched','cancelled'].includes(o.status))}>{busy ? 'Saving…' : 'Save production entry'}</button><button className="secondary-btn" type="button" onClick={() => setProductionFormOpen(false)}>Cancel</button>{!jobOrders.some(o => !['completed','dispatched','cancelled'].includes(o.status)) && <span className="field-hint">Create an open job order before recording production.</span>}</div>
          </form>}
          <div className="table-toolbar"><span>{productionEntries.length} production entries</span><span>Latest 200 records</span></div>
          <div className="table-scroll"><table className="records-table production-table"><thead><tr><th>Date</th><th>Job order</th><th>Machine</th><th>Shift</th><th>Input (kg)</th><th>Output (kg)</th><th>Loss (kg)</th><th>Loss (%)</th></tr></thead><tbody>{productionEntries.map(entry => { const loss = Number(entry.input_weight_kg) - Number(entry.output_weight_kg); const pct = Number(entry.input_weight_kg) > 0 ? loss / Number(entry.input_weight_kg) * 100 : 0; const order = jobOrders.find(o => o.id === entry.job_order_id); return <tr key={entry.id}><td>{entry.production_date}</td><td><strong>{order?.order_number ?? 'Job order'}</strong></td><td>{entry.machine_name || '—'}</td><td>{entry.shift || '—'}</td><td>{Number(entry.input_weight_kg).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{Number(entry.output_weight_kg).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{loss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td><strong>{pct.toFixed(2)}%</strong></td></tr> })}</tbody></table>{!productionEntries.length && <div className="empty-state"><Factory size={25} /><strong>No production entries yet</strong><span>Choose an open job order and record the input and output weights.</span></div>}</div>
        </section>}
        {page === 'employees' && <EmployeeManagement organizationId={selectedOrg} factoryId={selectedFactory} />}
        {page === 'accounts' && <AccountsManagement organizationId={selectedOrg} factoryId={selectedFactory} />}
        {page === 'reports' && <ReportsManagement organizationId={selectedOrg} factoryId={selectedFactory} />}
        {page === 'boiler' && <section className="panel data-panel">
          <div className="section-heading"><div><h2>Boiler & fuel tracking</h2><p>Daily firewood use, boiler hours, steam output and fabric-processing cost</p></div><button className="primary-btn" onClick={() => { setBoilerFormOpen(!boilerFormOpen); setError(''); setNotice('') }}><Plus size={16} /> Daily boiler entry</button></div>
          <div className="expense-summary">
            <div><span>Firewood this month</span><strong>{boilerLogs.filter(x => x.log_date.slice(0,7) === boilerMonth).reduce((n,x) => n + Number(x.firewood_consumed_kg),0).toLocaleString('en-IN',{maximumFractionDigits:1})} kg</strong></div>
            <div><span>Fuel cost this month</span><strong>₹{boilerLogs.filter(x => x.log_date.slice(0,7) === boilerMonth).reduce((n,x) => n + Number(x.fuel_cost),0).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong></div>
            <div><span>Fabric processed</span><strong>{boilerLogs.filter(x => x.log_date.slice(0,7) === boilerMonth).reduce((n,x) => n + Number(x.fabric_processed_kg),0).toLocaleString('en-IN',{maximumFractionDigits:1})} kg</strong></div>
            <div><span>Fuel cost / kg fabric</span><strong>₹{(() => { const rows=boilerLogs.filter(x=>x.log_date.slice(0,7)===boilerMonth); const kg=rows.reduce((n,x)=>n+Number(x.fabric_processed_kg),0); return kg ? (rows.reduce((n,x)=>n+Number(x.fuel_cost),0)/kg).toFixed(2) : '0.00' })()}</strong></div>
          </div>
          <div className="table-toolbar"><label>Report month <input type="month" value={boilerMonth} onChange={e=>setBoilerMonth(e.target.value)} /></label><span>One daily entry per factory; saving the same date updates it</span></div>
          {boilerFormOpen && <form className="record-form" onSubmit={addBoilerLog}>
            <label>Date *<input type="date" value={boilerForm.log_date} onChange={e=>setBoilerForm({...boilerForm,log_date:e.target.value})} required /></label>
            <label>Firewood consumed (kg) *<input type="number" min="0" step="0.1" value={boilerForm.firewood_consumed_kg} onChange={e=>setBoilerForm({...boilerForm,firewood_consumed_kg:e.target.value})} required /></label>
            <label>Boiler operating hours *<input type="number" min="0" max="24" step="0.25" value={boilerForm.boiler_operating_hours} onChange={e=>setBoilerForm({...boilerForm,boiler_operating_hours:e.target.value})} required /></label>
            <label>Steam generated (kg)<input type="number" min="0" step="0.1" value={boilerForm.steam_generated_kg} onChange={e=>setBoilerForm({...boilerForm,steam_generated_kg:e.target.value})} placeholder="Optional" /></label>
            <label>Fabric processed (kg) *<input type="number" min="0" step="0.1" value={boilerForm.fabric_processed_kg} onChange={e=>setBoilerForm({...boilerForm,fabric_processed_kg:e.target.value})} required /></label>
            <label>Firewood cost for the day (₹) *<input type="number" min="0" step="0.01" value={boilerForm.fuel_cost} onChange={e=>setBoilerForm({...boilerForm,fuel_cost:e.target.value})} required /></label>
            <label className="wide-field">Notes<textarea rows={2} value={boilerForm.notes} onChange={e=>setBoilerForm({...boilerForm,notes:e.target.value})} placeholder="Wood quality, downtime, boiler observations…" /></label>
            <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy?'Saving…':'Save daily record'}</button><button className="secondary-btn" type="button" onClick={()=>setBoilerFormOpen(false)}>Cancel</button></div>
          </form>}
          <div className="table-toolbar"><strong>Daily boiler register</strong><span>{boilerLogs.filter(x=>x.log_date.slice(0,7)===boilerMonth).length} records in selected month</span></div>
          <div className="table-scroll"><table className="records-table boiler-table"><thead><tr><th>Date</th><th>Firewood (kg)</th><th>Hours</th><th>Steam (kg)</th><th>Fabric (kg)</th><th>Fuel cost</th><th>Cost / kg</th></tr></thead><tbody>{boilerLogs.filter(x=>x.log_date.slice(0,7)===boilerMonth).map(x=><tr key={x.id}><td>{x.log_date}</td><td>{Number(x.firewood_consumed_kg).toLocaleString('en-IN')}</td><td>{Number(x.boiler_operating_hours).toFixed(2)}</td><td>{x.steam_generated_kg===null?'—':Number(x.steam_generated_kg).toLocaleString('en-IN')}</td><td>{Number(x.fabric_processed_kg).toLocaleString('en-IN')}</td><td>₹{Number(x.fuel_cost).toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td>₹{Number(x.fabric_processed_kg)>0?(Number(x.fuel_cost)/Number(x.fabric_processed_kg)).toFixed(2):'—'}</td></tr>)}</tbody></table>{!boilerLogs.filter(x=>x.log_date.slice(0,7)===boilerMonth).length&&<div className="empty-state"><Flame size={25}/><strong>No boiler records for this month</strong><span>Add a daily record to start tracking firewood and fuel cost per kg of fabric.</span></div>}</div>
        </section>}
        {page === 'inventory' && <section className="panel data-panel"><div className="section-heading"><div><h2>Inventory management</h2><p>Factory-wise raw material stock and movement register</p></div><div className="inventory-actions"><button className="secondary-btn" onClick={() => { setInventoryItemFormOpen(!inventoryItemFormOpen); setStockMovementFormOpen(false); setError(''); setNotice('') }}><Plus size={16} /> New item</button><button className="primary-btn" onClick={() => { setStockMovementFormOpen(!stockMovementFormOpen); setInventoryItemFormOpen(false); setError(''); setNotice('') }}><Plus size={16} /> Stock movement</button></div></div>
          <div className="expense-summary"><div><span>Inventory items</span><strong>{inventoryItems.length}</strong></div><div><span>Low stock</span><strong>{inventoryItems.filter(i => { const balance = inventoryTransactions.filter(t => t.item_id === i.id).reduce((sum,t) => sum + (['purchase','adjustment_in'].includes(t.transaction_type) ? Number(t.quantity) : -Number(t.quantity)), 0); return balance <= Number(i.reorder_level) }).length}</strong></div><div><span>Movements loaded</span><strong>{inventoryTransactions.length}</strong></div></div>
          {inventoryItemFormOpen && <form className="record-form" onSubmit={addInventoryItem}><label>Item name *<input value={inventoryItemForm.item_name} onChange={e => setInventoryItemForm({ ...inventoryItemForm, item_name: e.target.value })} placeholder="e.g. Firewood" required /></label><label>Category *<select value={inventoryItemForm.category} onChange={e => setInventoryItemForm({ ...inventoryItemForm, category: e.target.value })}>{purchaseCategories.map(x => <option key={x}>{x}</option>)}</select></label><label>Unit *<select value={inventoryItemForm.unit} onChange={e => setInventoryItemForm({ ...inventoryItemForm, unit: e.target.value })}>{purchaseUnits.map(x => <option key={x}>{x}</option>)}</select></label><label>Low-stock / reorder level<input type="number" min="0" step="0.001" value={inventoryItemForm.reorder_level} onChange={e => setInventoryItemForm({ ...inventoryItemForm, reorder_level: e.target.value })} /></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create item'}</button><button className="secondary-btn" type="button" onClick={() => setInventoryItemFormOpen(false)}>Cancel</button></div></form>}
          {stockMovementFormOpen && <form className="record-form" onSubmit={addStockMovement}><label>Item *<select value={stockMovementForm.item_id} onChange={e => setStockMovementForm({ ...stockMovementForm, item_id: e.target.value })} required><option value="">Select item</option>{inventoryItems.map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.unit})</option>)}</select></label><label>Movement type *<select value={stockMovementForm.transaction_type} onChange={e => setStockMovementForm({ ...stockMovementForm, transaction_type: e.target.value })}><option value="consumption">Consumption / stock out</option><option value="adjustment_in">Opening stock / stock in</option><option value="adjustment_out">Stock correction / stock out</option></select></label><label>Quantity *<input type="number" min="0.001" step="0.001" value={stockMovementForm.quantity} onChange={e => setStockMovementForm({ ...stockMovementForm, quantity: e.target.value })} required /></label><label>Date *<input type="date" value={stockMovementForm.transaction_date} onChange={e => setStockMovementForm({ ...stockMovementForm, transaction_date: e.target.value })} required /></label><label className="wide-field">Notes<textarea rows={2} value={stockMovementForm.notes} onChange={e => setStockMovementForm({ ...stockMovementForm, notes: e.target.value })} /></label><div className="form-actions"><button className="primary-btn" type="submit" disabled={busy || !inventoryItems.length}>{busy ? 'Saving…' : 'Save movement'}</button><button className="secondary-btn" type="button" onClick={() => setStockMovementFormOpen(false)}>Cancel</button></div></form>}
          <div className="table-toolbar"><span>{inventoryItems.length} stock items</span><span>Balances from purchases and stock movements</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Item</th><th>Category</th><th>Available stock</th><th>Reorder level</th><th>Status</th></tr></thead><tbody>{inventoryItems.map(i => { const balance = inventoryTransactions.filter(t => t.item_id === i.id).reduce((sum,t) => sum + (['purchase','adjustment_in'].includes(t.transaction_type) ? Number(t.quantity) : -Number(t.quantity)), 0); const low = balance <= Number(i.reorder_level); return <tr key={i.id}><td><strong>{i.item_name}</strong></td><td>{i.category}</td><td>{balance.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {i.unit}</td><td>{Number(i.reorder_level).toLocaleString('en-IN', { maximumFractionDigits: 3 })} {i.unit}</td><td><span className={'stock-status ' + (low ? 'low' : 'normal')}>{low ? 'Low stock' : 'In stock'}</span></td></tr> })}</tbody></table>{!inventoryItems.length && <div className="empty-state"><Boxes size={25} /><strong>No inventory items yet</strong><span>Record a purchase to create a stock item automatically, or add an item and enter opening stock.</span></div>}</div>
          <div className="table-toolbar"><strong>Recent stock movements</strong><span>Latest 500</span></div><div className="table-scroll"><table className="records-table"><thead><tr><th>Date</th><th>Item</th><th>Movement</th><th>Quantity</th><th>Notes</th></tr></thead><tbody>{inventoryTransactions.slice(0,100).map(t => { const item = inventoryItems.find(i => i.id === t.item_id); return <tr key={t.id}><td>{t.transaction_date}</td><td>{item?.item_name ?? 'Inventory item'}</td><td>{t.transaction_type.replace(/_/g, ' ')}</td><td>{Number(t.quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })} {item?.unit ?? ''}</td><td>{t.notes || '—'}</td></tr> })}</tbody></table>{!inventoryTransactions.length && <div className="empty-state"><Package size={25} /><strong>No stock movements yet</strong><span>Purchases will appear here automatically.</span></div>}</div>
        </section>}
        {page === 'purchases' && <section className="panel data-panel"><div className="section-heading"><div><h2>Purchase management</h2><p>Record factory materials, suppliers, invoices and GST-inclusive totals</p></div><button className="primary-btn" onClick={() => { setPurchaseFormOpen(!purchaseFormOpen); setError(''); setNotice('') }}><Plus size={16} /> Add purchase</button></div>
          <div className="expense-summary"><div><span>This month</span><strong>₹{purchases.filter(x => x.purchase_date.slice(0, 7) === today().slice(0, 7)).reduce((sum, x) => sum + Number(x.total_amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div><div><span>Today</span><strong>₹{purchases.filter(x => x.purchase_date === today()).reduce((sum, x) => sum + Number(x.total_amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div><div><span>Records</span><strong>{purchases.length}</strong></div></div>
          {purchaseFormOpen && <form className="record-form" onSubmit={addPurchase}>
            <label>Purchase date *<input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })} required /></label>
            <label>Supplier name *<input value={purchaseForm.supplier_name} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })} required /></label>
            <label>Supplier phone<input type="tel" value={purchaseForm.supplier_phone} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_phone: e.target.value })} /></label>
            <label>Invoice number<input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })} /></label>
            <label>Category *<select value={purchaseForm.category} onChange={e => setPurchaseForm({ ...purchaseForm, category: e.target.value })}>{purchaseCategories.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Item / material *<input value={purchaseForm.item_name} onChange={e => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })} placeholder="e.g. Firewood" required /></label>
            <label>Quantity *<input type="number" min="0.001" step="0.001" value={purchaseForm.quantity} onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required /></label>
            <label>Unit<select value={purchaseForm.unit} onChange={e => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}>{purchaseUnits.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Unit price (₹) *<input type="number" min="0" step="0.01" value={purchaseForm.unit_price} onChange={e => setPurchaseForm({ ...purchaseForm, unit_price: e.target.value })} required /></label>
            <label>GST (%)<select value={purchaseForm.gst_percent} onChange={e => setPurchaseForm({ ...purchaseForm, gst_percent: e.target.value })}>{['0','5','12','18','28'].map(x => <option key={x} value={x}>{x}%</option>)}</select></label>
            <label>Payment mode<select value={purchaseForm.payment_mode} onChange={e => setPurchaseForm({ ...purchaseForm, payment_mode: e.target.value })}>{paymentModes.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className="wide-field">Notes<textarea rows={2} value={purchaseForm.notes} onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} /></label>
            <div className="purchase-preview"><span>Subtotal: ₹{(Math.max(0, Number(purchaseForm.quantity) || 0) * Math.max(0, Number(purchaseForm.unit_price) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span><span>GST: ₹{((Math.max(0, Number(purchaseForm.quantity) || 0) * Math.max(0, Number(purchaseForm.unit_price) || 0) * Math.max(0, Number(purchaseForm.gst_percent) || 0)) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span><strong>Total: ₹{(Math.max(0, Number(purchaseForm.quantity) || 0) * Math.max(0, Number(purchaseForm.unit_price) || 0) * (1 + Math.max(0, Number(purchaseForm.gst_percent) || 0) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
            <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save purchase'}</button><button className="secondary-btn" type="button" onClick={() => setPurchaseFormOpen(false)}>Cancel</button></div>
          </form>}
          <div className="table-toolbar"><span>{purchases.length} purchase records</span><span>Latest 500 records · Amounts in INR</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Date</th><th>Supplier</th><th>Invoice</th><th>Category / item</th><th>Quantity</th><th>Subtotal</th><th>GST</th><th>Total (₹)</th><th>Payment</th></tr></thead><tbody>{purchases.map(x => <tr key={x.id}><td>{x.purchase_date}</td><td><strong>{x.supplier_name}</strong><br />{x.supplier_phone || ''}</td><td>{x.invoice_number || '—'}</td><td>{x.category}<br /><strong>{x.item_name}</strong></td><td>{Number(x.quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })} {x.unit}</td><td>₹{Number(x.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{Number(x.gst_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({Number(x.gst_percent)}%)</td><td><strong>₹{Number(x.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></td><td>{x.payment_mode || '—'}</td></tr>)}</tbody></table>{!purchases.length && <div className="empty-state"><Package size={25} /><strong>No purchases recorded yet</strong><span>Add firewood, diesel, chemicals, spare parts and other factory purchases here.</span></div>}</div>
        </section>}
        {page === 'expenses' && <section className="panel data-panel"><div className="section-heading"><div><h2>Expense management</h2><p>Track factory operating costs and payment methods</p></div><button className="primary-btn" onClick={() => { setExpenseFormOpen(!expenseFormOpen); setError(''); setNotice('') }}><Plus size={16} /> Add expense</button></div>
          <div className="expense-summary"><div><span>This month</span><strong>₹{expenses.filter(x => x.expense_date.slice(0, 7) === today().slice(0, 7)).reduce((sum, x) => sum + Number(x.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div><div><span>Today</span><strong>₹{expenses.filter(x => x.expense_date === today()).reduce((sum, x) => sum + Number(x.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div><div><span>Records</span><strong>{expenses.length}</strong></div></div>
          {expenseFormOpen && <form className="record-form" onSubmit={addExpense}>
            <label>Expense date *<input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} required /></label>
            <label>Category *<select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} required>{expenseCategories.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Amount (₹) *<input type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="e.g. 2500" required /></label>
            <label>Payment mode<select value={expenseForm.payment_mode} onChange={e => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}>{paymentModes.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className="wide-field">Description / notes<textarea rows={2} value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="e.g. Firewood for boiler" /></label>
            <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save expense'}</button><button className="secondary-btn" type="button" onClick={() => setExpenseFormOpen(false)}>Cancel</button></div>
          </form>}
          <div className="table-toolbar"><span>{expenses.length} expense records</span><span>Latest 500 records · Amounts in INR</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment mode</th><th>Amount (₹)</th></tr></thead><tbody>{expenses.map(x => <tr key={x.id}><td>{x.expense_date}</td><td><strong>{x.category}</strong></td><td>{x.description || '—'}</td><td>{x.payment_mode || '—'}</td><td><strong>{Number(x.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td></tr>)}</tbody></table>{!expenses.length && <div className="empty-state"><Receipt size={25} /><strong>No expenses recorded yet</strong><span>Add your first factory expense to start tracking operating costs.</span></div>}</div>
        </section>}
        {page === 'dispatch' && <section className="panel data-panel"><div className="section-heading"><div><h2>Dispatch management</h2><p>Record finished fabric sent to customers, linked to each job order</p></div><button className="primary-btn" onClick={() => { setDispatchFormOpen(!dispatchFormOpen); setError(''); setNotice('') }}><Plus size={16} /> Record dispatch</button></div>
          {dispatchFormOpen && <form className="record-form" onSubmit={addDispatch}>
            <label>Job order *<select value={dispatchForm.job_order_id} onChange={e => setDispatchForm({ ...dispatchForm, job_order_id: e.target.value })} required><option value="">Select job order</option>{jobOrders.filter(o => o.status !== 'cancelled' && o.status !== 'dispatched').map(o => { const produced = productionEntries.filter(p => p.job_order_id === o.id).reduce((sum, p) => sum + Number(p.output_weight_kg), 0); const sent = dispatches.filter(d => d.job_order_id === o.id).reduce((sum, d) => sum + Number(d.weight_kg), 0); const available = Math.max(0, produced - sent); return available > 0 ? <option key={o.id} value={o.id}>{o.order_number} · {customerName(o.customer_id)} · {available.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg available</option> : null })}</select></label>
            <label>Dispatch date *<input type="date" value={dispatchForm.dispatch_date} onChange={e => setDispatchForm({ ...dispatchForm, dispatch_date: e.target.value })} required /></label>
            <label>Dispatched weight (kg) *<input type="number" min="0.01" step="0.01" value={dispatchForm.weight_kg} onChange={e => setDispatchForm({ ...dispatchForm, weight_kg: e.target.value })} required /></label>
            <label>Vehicle number<input value={dispatchForm.vehicle_number} onChange={e => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value.toUpperCase() })} placeholder="e.g. TN 39 AB 1234" /></label>
            <label>Delivery note number<input value={dispatchForm.delivery_note_number} onChange={e => setDispatchForm({ ...dispatchForm, delivery_note_number: e.target.value })} /></label>
            <label className="wide-field">Notes<textarea rows={2} value={dispatchForm.notes} onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })} /></label>
            <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy || !jobOrders.some(o => o.id === dispatchForm.job_order_id)}>{busy ? 'Saving…' : 'Save dispatch'}</button><button className="secondary-btn" type="button" onClick={() => setDispatchFormOpen(false)}>Cancel</button>{!jobOrders.some(o => productionEntries.some(p => p.job_order_id === o.id) && o.status !== 'cancelled' && o.status !== 'dispatched') && <span className="field-hint">Record production output before dispatching fabric.</span>}</div>
          </form>}
          <div className="table-toolbar"><span>{dispatches.length} dispatch records</span><span>Latest 200 records</span></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th>Date</th><th>Job order</th><th>Customer</th><th>Dispatched (kg)</th><th>Vehicle</th><th>Delivery note</th></tr></thead><tbody>{dispatches.map(d => { const order = jobOrders.find(o => o.id === d.job_order_id); return <tr key={d.id}><td>{d.dispatch_date}</td><td><strong>{order?.order_number ?? 'Job order'}</strong></td><td>{order ? customerName(order.customer_id) : '—'}</td><td>{Number(d.weight_kg).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{d.vehicle_number || '—'}</td><td>{d.delivery_note_number || '—'}</td></tr> })}</tbody></table>{!dispatches.length && <div className="empty-state"><Truck size={25} /><strong>No dispatches recorded yet</strong><span>Once production output is available, record the dispatched weight here.</span></div>}</div>
        </section>}
        {notice && <div className="inline-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        <footer>© 2026 TexFlow <span>Built for textile businesses</span></footer>
      </div>
    </main>
  </div>
}

function Brand() { return <div className="brand"><span className="brand-mark"><span /></span><span>tex<span>flow</span></span></div> }
function LanguageSwitch({ language, setLanguage }: { language: Language; setLanguage: (value: Language) => void }) {
  return <div className="language-switch" aria-label="Language selector"><Languages size={16} /><button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button><span>/</span><button className={language === 'ta' ? 'chosen' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button></div>
}
function StatCard({ icon, label, value, unit, note }: { icon: React.ReactNode; label: string; value: string; unit?: string; note: string }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span className="trend positive"><ArrowUpRight size={14} />LIVE</span></div><p>{label}</p><div className="stat-value">{value} <small>{unit}</small></div><span className="stat-note">{note}</span></article>
}
