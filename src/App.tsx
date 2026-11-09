import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, ChevronDown, CircleHelp, Factory, Languages, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, Users, Wallet, X, Eye, EyeOff, ClipboardList, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Tables } from './types/database'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Language = 'en' | 'ta'
type Page = 'overview' | 'customers' | 'orders'
type Organization = Tables<'organizations'>
type FactoryRow = Tables<'factories'>
type Customer = Tables<'customers'>
type JobOrder = Tables<'job_orders'>
const today = () => new Date().toLocaleDateString('en-CA')
const emptyCustomer = { name: '', phone: '', email: '', gstin: '', address: '' }
const emptyOrder = { order_number: '', customer_id: '', fabric_type: 'Knitted fabric', received_weight_kg: '', expected_delivery_date: '', notes: '' }

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
    loadBusinessRecords().catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load records.') })
    return () => { alive = false }
  }, [user, selectedOrg])

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
        supabase.from('job_orders').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).eq('status', 'completed'),
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
        {['Production', 'Inventory', 'Employees', 'Accounts', 'Reports'].map(label => <button className="nav-link" key={label} onClick={() => setNotice(label + ' will be developed in the next stage.')}><Package size={18} />{label}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="nav-link" onClick={() => setNotice('Settings will be added in a later stage.')}><Settings size={18} />Settings</button><button className="nav-link" onClick={() => setNotice('Help and support will be added in a later stage.')}><CircleHelp size={18} />Help & support</button><div className="profile-row"><div className="avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div><div><strong>{user.user_metadata?.full_name || user.email}</strong><small>{user.email}</small></div><button className="icon-btn" aria-label={tr.signout} onClick={signOut}><LogOut size={17} /></button></div></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button><div className="breadcrumb">{currentOrg?.name ?? 'Workspace'} <span>/</span> {page === 'overview' ? tr.overview : page === 'customers' ? tr.customers : tr.orders}</div><div className="top-actions"><LanguageSwitch language={language} setLanguage={setLanguage} /><button className="icon-btn notification" aria-label="Notifications"><Bell size={19} /></button><div className="top-avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div></div></header>
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
