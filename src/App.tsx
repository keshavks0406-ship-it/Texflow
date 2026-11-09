import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, Factory, Languages, LogOut, Menu, Package, Settings, ShieldCheck, Users, Wallet, X, Eye, EyeOff } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Tables } from './types/database'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Language = 'en' | 'ta'
type Organization = Tables<'organizations'>
type FactoryRow = Tables<'factories'>
const dateToday = () => new Date().toLocaleDateString('en-CA')

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
  const [menuOpen, setMenuOpen] = useState(false)
  const isTa = language === 'ta'
  const t = useMemo(() => ({
    signin: isTa ? 'உள்நுழைக' : 'Sign in',
    signup: isTa ? 'கணக்கை உருவாக்கு' : 'Create account',
    email: isTa ? 'மின்னஞ்சல்' : 'Email address',
    password: isTa ? 'கடவுச்சொல்' : 'Password',
    name: isTa ? 'முழுப் பெயர்' : 'Full name',
    company: isTa ? 'நிறுவனத்தின் பெயர்' : 'Company name',
    companyGstin: isTa ? 'நிறுவன GSTIN (விருப்பம்)' : 'Company GSTIN (optional)',
    factory: isTa ? 'தொழிற்சாலை பெயர்' : 'Factory name',
    address: isTa ? 'தொழிற்சாலை முகவரி' : 'Factory address',
    factoryGstin: isTa ? 'தொழிற்சாலை GSTIN (விருப்பம்)' : 'Factory GSTIN (optional)',
    overview: isTa ? 'தொழிற்சாலை கண்ணோட்டம்' : 'Factory overview',
    orders: isTa ? 'செயலில் உள்ள வேலை ஆர்டர்கள்' : 'Active job orders',
    production: isTa ? 'இன்றைய உற்பத்தி' : "Today's production",
    dispatch: isTa ? 'அனுப்ப வேண்டியவை' : 'Pending dispatch',
    expenses: isTa ? 'இன்றைய செலவுகள்' : "Today's expenses",
    signout: isTa ? 'வெளியேறு' : 'Sign out',
    save: isTa ? 'பணியிடத்தை உருவாக்கு' : 'Create workspace',
  }), [isTa])

  useEffect(() => {
    const client = supabase
    if (!client) { setAuthReady(true); return }
    let alive = true
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError(sessionError.message)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setError('')
      setNotice('')
      setAuthReady(true)
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client || !user) {
      setOrganizations([]); setSelectedOrg(''); setFactories([]); setSelectedFactory('')
      setWorkspaceReady(true)
      return
    }
    let alive = true
    setWorkspaceReady(false)
    const load = async () => {
      const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
      const { error: profileError } = await client.from('profiles').upsert({ id: user.id, full_name: name || null })
      if (profileError) throw profileError
      const { data, error: orgError } = await client.from('organizations').select('*').order('created_at')
      if (orgError) throw orgError
      if (!alive) return
      const rows = data ?? []
      setOrganizations(rows)
      setSelectedOrg(current => rows.some(org => org.id === current) ? current : (rows[0]?.id ?? ''))
      setWorkspaceReady(true)
    }
    load().catch(err => {
      if (alive) { setError(err instanceof Error ? err.message : 'Could not load workspace.'); setWorkspaceReady(true) }
    })
    return () => { alive = false }
  }, [user])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !selectedOrg) { setFactories([]); setSelectedFactory(''); return }
    let alive = true
    client.from('factories').select('*').eq('organization_id', selectedOrg).order('name').then(({ data, error: factoryError }) => {
      if (!alive) return
      if (factoryError) { setError(factoryError.message); return }
      const rows = data ?? []
      setFactories(rows)
      setSelectedFactory(current => rows.some(item => item.id === current) ? current : (rows[0]?.id ?? ''))
    })
    return () => { alive = false }
  }, [user, selectedOrg])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !selectedOrg || !selectedFactory) { setMetricsReady(false); return }
    let alive = true
    setMetricsReady(false)
    const load = async () => {
      const day = dateToday()
      const [orders, production, dispatch, expenses] = await Promise.all([
        client.from('job_orders').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).in('status', ['received', 'in_production']),
        client.from('production_entries').select('output_weight_kg').eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).eq('production_date', day),
        client.from('job_orders').select('id', { count: 'exact', head: true }).eq('organization_id', selectedOrg).eq('factory_id', selectedFactory).eq('status', 'completed'),
        client.from('expenses').select('amount').eq('organization_id', selectedOrg).eq('expense_date', day)
      ])
      const failed = [orders.error, production.error, dispatch.error, expenses.error].find(Boolean)
      if (failed) throw failed
      if (!alive) return
      setMetrics({
        orders: orders.count ?? 0,
        production: (production.data ?? []).reduce((sum, row) => sum + Number(row.output_weight_kg), 0),
        dispatch: dispatch.count ?? 0,
        expenses: (expenses.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
      })
      setMetricsReady(true)
    }
    load().catch(err => { if (alive) { setError(err instanceof Error ? err.message : 'Could not load dashboard.'); setMetricsReady(true) } })
    return () => { alive = false }
  }, [user, selectedOrg, selectedFactory])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } }
        })
        if (authError) throw authError
        if (!data.session) {
          setNotice('Account created. Check your email to confirm your address, then sign in.')
          setMode('signin')
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  async function resetPassword() {
    if (!supabase || !email.trim()) { setError('Enter your email address first.'); return }
    setBusy(true); setError(''); setNotice('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    if (resetError) setError(resetError.message)
    else setNotice('Password reset link sent. Check your email.')
  }

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    setBusy(true); setError('')
    try {
      let orgId = selectedOrg
      if (!orgId) {
        if (!companyName.trim()) throw new Error('Enter your company name.')
        const { data, error: orgError } = await supabase.from('organizations').insert({
          name: companyName.trim(), gstin: companyGstin.trim() || null, created_by: user.id
        }).select('*').single()
        if (orgError) throw orgError
        orgId = data.id
        setOrganizations([data])
        setSelectedOrg(orgId)
      }
      if (!factoryName.trim()) throw new Error('Enter your factory name.')
      const { data: factory, error: factoryError } = await supabase.from('factories').insert({
        organization_id: orgId, name: factoryName.trim(),
        address: factoryAddress.trim() || null, gstin: factoryGstin.trim() || null
      }).select('*').single()
      if (factoryError) throw factoryError
      setFactories([factory]); setSelectedFactory(factory.id)
      setNotice('Your factory has been registered successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save workspace.') }
    finally { setBusy(false) }
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  if (!authReady || (user && !workspaceReady)) return <main className="login-page"><div className="login-card"><Brand /><p className="auth-muted">Loading your secure TexFlow workspace…</p></div></main>

  if (!isSupabaseConfigured) return (
    <main className="login-page"><div className="login-card auth-card">
      <Brand /><span className="eyebrow">SUPABASE CONNECTION REQUIRED</span>
      <h1>Welcome to TexFlow</h1><p>Manage your textile business in one place.</p>
      <div className="setup-notice"><ShieldCheck size={19} /><div><strong>Connect the app to your Supabase project</strong><p>Add these variables to your local .env.local file and hosting settings. Never use a service-role key in the browser.</p></div></div>
      <pre className="env-snippet">VITE_SUPABASE_URL=https://mqujkkdiopiakffnyenu.supabase.co{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY=your_sb_publishable_key</pre>
      <LanguageSwitch language={language} setLanguage={setLanguage} />
      <p className="login-note">The project URL is filled in. Add the publishable key from Supabase → Project Settings → API Keys.</p>
    </div></main>
  )

  if (!user) return (
    <main className="login-page"><div className="login-card auth-card">
      <Brand /><span className="eyebrow">SECURE FACTORY MANAGEMENT</span>
      <h1>Welcome to TexFlow</h1><p>Manage your textile business in one place.</p>
      <div className="auth-tabs">
        <button className={mode === 'signin' ? 'selected' : ''} onClick={() => { setMode('signin'); setError(''); setNotice('') }}>Sign in</button>
        <button className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Create account</button>
      </div>
      <form className="auth-form" onSubmit={submitAuth}>
        {mode === 'signup' && <label>Full name<input autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required /></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {mode === 'signin' && <button type="button" className="forgot-btn" onClick={resetPassword} disabled={busy}>Forgot password?</button>}
        <button className="primary-btn full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? t.signin : t.signup}</button>
      </form>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message success-message" role="status">{notice}</p>}
      <LanguageSwitch language={language} setLanguage={setLanguage} />
      <p className="login-note"><ShieldCheck size={14} /> Supabase authentication · Secure session</p>
    </div></main>
  )

  const currentOrg = organizations.find(org => org.id === selectedOrg)
  if (organizations.length === 0 || factories.length === 0) return (
    <main className="login-page"><div className="login-card auth-card onboarding-card">
      <Brand /><span className="eyebrow">WORKSPACE SETUP</span>
      <h1>{organizations.length === 0 ? 'Set up your company' : 'Register your first factory'}</h1>
      <p>Enter your company and first factory details to get started.</p>
      <form className="auth-form" onSubmit={saveWorkspace}>
        {organizations.length === 0 && <>
          <label>{t.company}<input value={companyName} onChange={e => setCompanyName(e.target.value)} required /></label>
          <label>{t.companyGstin}<input value={companyGstin} onChange={e => setCompanyGstin(e.target.value.toUpperCase())} /></label>
        </>}
        <label>{t.factory}<input value={factoryName} onChange={e => setFactoryName(e.target.value)} required /></label>
        <label>{t.address}<textarea rows={2} value={factoryAddress} onChange={e => setFactoryAddress(e.target.value)} /></label>
        <label>{t.factoryGstin}<input value={factoryGstin} onChange={e => setFactoryGstin(e.target.value.toUpperCase())} /></label>
        <button className="primary-btn full" type="submit" disabled={busy}>{busy ? 'Saving…' : t.save}</button>
      </form>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <button className="subtle-btn" onClick={signOut}>{t.signout}</button>
    </div></main>
  )

  const modules = [
    { icon: Activity, label: isTa ? 'உற்பத்தி' : 'Production', color: 'mint' },
    { icon: Package, label: isTa ? 'வேலை ஆர்டர்கள்' : 'Job orders', color: 'blue' },
    { icon: Boxes, label: isTa ? 'சரக்கு' : 'Inventory', color: 'violet' },
    { icon: Users, label: isTa ? 'பணியாளர்கள்' : 'Employees', color: 'amber' },
    { icon: Wallet, label: isTa ? 'கணக்குகள்' : 'Accounts', color: 'green' },
    { icon: CalendarDays, label: isTa ? 'அறிக்கைகள்' : 'Reports', color: 'rose' }
  ]
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (menuOpen ? 'sidebar-open' : '')}>
        <div className="side-brand"><Brand /></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="factory-chip"><Building2 size={17} /><select aria-label="Select company" value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><ChevronDown size={14} /></div>
        <div className="factory-chip factory-select"><Factory size={17} /><select aria-label="Select factory" value={selectedFactory} onChange={e => setSelectedFactory(e.target.value)}>{factories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div>
        <nav className="side-nav"><span className="nav-caption">OVERVIEW</span><button className="nav-link active"><Activity size={18} />{t.overview}</button>
          {modules.map(({ icon: Icon, label }) => <button className="nav-link" key={label} onClick={() => setNotice(label + ' module will be enabled in the next stage.')}><Icon size={18} />{label}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link" onClick={() => setNotice('Settings will be added in a later stage.')}><Settings size={18} />Settings</button>
          <button className="nav-link" onClick={() => setNotice('Help and support will be added in a later stage.')}><CircleHelp size={18} />Help & support</button>
          <div className="profile-row"><div className="avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div><div><strong>{user.user_metadata?.full_name || user.email}</strong><small>{user.email}</small></div><button className="icon-btn" aria-label={t.signout} onClick={signOut}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button><div className="breadcrumb">{currentOrg?.name ?? 'Workspace'} <span>/</span> {t.overview}</div><div className="top-actions"><LanguageSwitch language={language} setLanguage={setLanguage} /><button className="icon-btn notification" aria-label="Notifications"><Bell size={19} /></button><div className="top-avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><span className="eyebrow">LIVE WORKSPACE · {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</span><h1>Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]} <span>✦</span></h1><p>Here is the live overview of your factory workspace.</p></div><div className="demo-tag"><span />Connected</div></div>
          <section className="stats-section"><div className="section-heading"><div><h2>{t.overview}</h2><p>{factories.find(item => item.id === selectedFactory)?.name}</p></div><span className="period-pill"><CalendarDays size={15} /> Today</span></div>
            <div className="stats-grid">
              <StatCard icon={<Activity />} label={t.orders} value={metricsReady ? String(metrics.orders) : '—'} note="Received and in production" />
              <StatCard icon={<Package />} label={t.production} value={metricsReady ? metrics.production.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'} unit="kg" note="Recorded output weight" />
              <StatCard icon={<Boxes />} label={t.dispatch} value={metricsReady ? String(metrics.dispatch) : '—'} note="Completed job orders" />
              <StatCard icon={<Wallet />} label={t.expenses} value={metricsReady ? '₹' + metrics.expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'} note="Expenses recorded today" />
            </div>
          </section>
          <section className="lower-grid">
            <div className="panel quick-panel"><div className="section-heading"><div><h2>Quick access</h2><p>Your factory modules</p></div></div><div className="module-grid">{modules.map(({ icon: Icon, label, color }) => <button className="module-tile" key={label} onClick={() => setNotice(label + ' module is coming next.')}><span className={'module-icon ' + color}><Icon size={21} /></span><strong>{label}</strong><span className="tile-arrow">↗</span></button>)}</div></div>
            <div className="panel activity-panel"><div className="section-heading"><div><h2>Workspace details</h2><p>Your registered business</p></div></div>
              <div className="workspace-detail"><Building2 size={18} /><div><strong>{currentOrg?.name}</strong><small>{currentOrg?.gstin || 'Company GSTIN not added'}</small></div></div>
              <div className="workspace-detail"><Factory size={18} /><div><strong>{factories.find(item => item.id === selectedFactory)?.name}</strong><small>{factories.find(item => item.id === selectedFactory)?.address || 'Factory address not added'}</small></div></div>
              <div className="workspace-detail"><ShieldCheck size={18} /><div><strong>{user.email}</strong><small>Authenticated Supabase account</small></div></div>
            </div>
          </section>
          {notice && <div className="inline-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          <div className="demo-banner"><CheckCircle2 size={19} /><div><strong>Connected to your live database</strong><p>{metricsReady ? 'Dashboard figures are calculated from your saved job orders, production entries and expenses. Add records to see live totals.' : 'Loading live figures from your factory records.'}</p></div></div>
          <footer>© 2026 TexFlow <span>Built for textile businesses</span></footer>
        </div>
      </main>
    </div>
  )
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><span /></span><span>tex<span>flow</span></span></div>
}
function LanguageSwitch({ language, setLanguage }: { language: Language; setLanguage: (value: Language) => void }) {
  return <div className="language-switch" aria-label="Language selector"><Languages size={16} /><button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button><span>/</span><button className={language === 'ta' ? 'chosen' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button></div>
}
function StatCard({ icon, label, value, unit, note }: { icon: React.ReactNode; label: string; value: string; unit?: string; note: string }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span className="trend positive"><ArrowUpRight size={14} />LIVE</span></div><p>{label}</p><div className="stat-value">{value} <small>{unit}</small></div><span className="stat-note">{note}</span></article>
}
