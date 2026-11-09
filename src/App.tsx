import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, Building2,
  CalendarDays, CheckCircle2, ChevronDown, CircleHelp, Factory,
  Languages, LogOut, Menu, Package, Settings, ShieldCheck, Users,
  Wallet, X
} from 'lucide-react'

type Language = 'en' | 'ta'

const copy = {
  en: {
    welcome: 'Good morning', subtitle: 'Here is what is happening in your factory today.',
    overview: 'Factory overview', today: "TODAY'S OVERVIEW", production: 'Production today',
    orders: 'Active job orders', pending: 'Pending dispatch', collection: 'Today collection',
    productionNote: 'Target: 10,000 kg', ordersNote: 'Across all processes',
    dispatchNote: 'Awaiting quality / packing', collectionNote: 'Demo figures',
    quick: 'Quick access', productionMenu: 'Production', jobOrders: 'Job orders',
    inventory: 'Inventory', employees: 'Employees', accounts: 'Accounts',
    reports: 'Reports', recent: 'Recent activity', viewAll: 'View all',
    activity1: 'New job order received', activity2: 'Production entry recorded',
    activity3: 'Dispatch marked as pending', justNow: 'Just now', minutes: '25 min ago',
    hour: '1 hour ago', demo: 'Demo workspace', demoText: 'Sample information only. No real factory data is saved.',
    selectFactory: 'Select factory', compacting: 'Compacting unit', welcomeBack: 'Welcome to TexFlow',
    loginText: 'Your textile factory, organised.', continue: 'Enter demo workspace',
    choose: 'Choose a factory to continue', language: 'Language', signOut: 'Sign out',
    phase: 'Stage 1 preview', allModules: 'More factory modules will be added in upcoming stages.'
  },
  ta: {
    welcome: 'காலை வணக்கம்', subtitle: 'இன்றைய தொழிற்சாலை செயல்பாடுகளின் விவரம்.',
    overview: 'தொழிற்சாலை கண்ணோட்டம்', today: 'இன்றைய நிலவரம்', production: 'இன்றைய உற்பத்தி',
    orders: 'செயலில் உள்ள ஆர்டர்கள்', pending: 'அனுப்ப வேண்டியவை', collection: 'இன்றைய வசூல்',
    productionNote: 'இலக்கு: 10,000 கிலோ', ordersNote: 'அனைத்து செயல்முறைகளும்',
    dispatchNote: 'தரச் சோதனை / பேக்கிங் நிலுவை', collectionNote: 'மாதிரி தரவு',
    quick: 'விரைவு அணுகல்', productionMenu: 'உற்பத்தி', jobOrders: 'வேலை ஆர்டர்கள்',
    inventory: 'சரக்கு', employees: 'பணியாளர்கள்', accounts: 'கணக்குகள்',
    reports: 'அறிக்கைகள்', recent: 'சமீபத்திய செயல்பாடுகள்', viewAll: 'அனைத்தும்',
    activity1: 'புதிய வேலை ஆர்டர் பெறப்பட்டது', activity2: 'உற்பத்தி பதிவு செய்யப்பட்டது',
    activity3: 'அனுப்புதல் நிலுவையில் உள்ளது', justNow: 'இப்போது', minutes: '25 நிமிடங்களுக்கு முன்',
    hour: '1 மணி நேரத்திற்கு முன்', demo: 'மாதிரி பணியிடம்', demoText: 'இவை மாதிரி விவரங்கள் மட்டுமே. உண்மையான தரவு சேமிக்கப்படவில்லை.',
    selectFactory: 'தொழிற்சாலையைத் தேர்வு செய்க', compacting: 'காம்பாக்டிங் பிரிவு', welcomeBack: 'TexFlow-க்கு வரவேற்கிறோம்',
    loginText: 'உங்கள் ஜவுளித் தொழிற்சாலை, ஒரே இடத்தில்.', continue: 'மாதிரி பணியிடத்திற்குச் செல்ல',
    choose: 'தொடர தொழிற்சாலையைத் தேர்வு செய்யவும்', language: 'மொழி', signOut: 'வெளியேறு',
    phase: 'முதல் கட்ட முன்னோட்டம்', allModules: 'அடுத்த கட்டங்களில் மேலும் தொழிற்சாலை வசதிகள் சேர்க்கப்படும்.'
  }
}

const activities = [
  { icon: Package, tone: 'mint', title: 'activity1', time: 'justNow' },
  { icon: Activity, tone: 'blue', title: 'activity2', time: 'minutes' },
  { icon: Boxes, tone: 'amber', title: 'activity3', time: 'hour' }
] as const

export default function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [factory, setFactory] = useState('Compacting Unit')
  const [loggedIn, setLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const t = copy[language]

  const modules = useMemo(() => [
    { icon: Activity, label: t.productionMenu, color: 'mint' },
    { icon: ClipboardIcon, label: t.jobOrders, color: 'blue' },
    { icon: Boxes, label: t.inventory, color: 'violet' },
    { icon: Users, label: t.employees, color: 'amber' },
    { icon: Wallet, label: t.accounts, color: 'green' },
    { icon: CalendarDays, label: t.reports, color: 'rose' }
  ], [t])

  if (!loggedIn) {
    return (
      <main className="login-page">
        <div className="login-card">
          <Brand />
          <span className="eyebrow">{t.phase}</span>
          <h1>{t.welcomeBack}</h1>
          <p>{t.loginText}</p>
          <label className="field-label" htmlFor="factory">{t.selectFactory}</label>
          <div className="select-wrap">
            <Factory size={18} />
            <select id="factory" value={factory} onChange={e => setFactory(e.target.value)}>
              <option value="Compacting Unit">{t.compacting}</option>
              <option value="Textile Processing Unit">Textile Processing Unit</option>
            </select>
            <ChevronDown size={16} />
          </div>
          <button className="primary-btn full" onClick={() => setLoggedIn(true)}>{t.continue}</button>
          <LanguageSwitch language={language} setLanguage={setLanguage} label={t.language} />
          <p className="login-note"><ShieldCheck size={14} /> Demo mode · No password required</p>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="side-brand"><Brand /></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="factory-chip"><Building2 size={17} /><span>{factory}</span><ChevronDown size={14} /></div>
        <nav className="side-nav">
          <span className="nav-caption">OVERVIEW</span>
          <button className="nav-link active"><Activity size={18} />{t.overview}</button>
          {modules.map(({ icon: Icon, label }) => <button className="nav-link" key={label} onClick={() => alert('This module will be enabled in a later TexFlow stage.')}><Icon size={18} />{label}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link"><Settings size={18} />Settings</button>
          <button className="nav-link"><CircleHelp size={18} />Help & support</button>
          <div className="profile-row"><div className="avatar">AD</div><div><strong>Demo Admin</strong><small>Factory administrator</small></div><button className="icon-btn" aria-label={t.signOut} onClick={() => setLoggedIn(false)}><LogOut size={17} /></button></div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <div className="breadcrumb">Workspace <span>/</span> {t.overview}</div>
          <div className="top-actions">
            <LanguageSwitch language={language} setLanguage={setLanguage} label="" />
            <button className="icon-btn notification" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="top-avatar">AD</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div><span className="eyebrow">{t.today} · MONDAY, 09 NOV 2026</span><h1>{t.welcome}, Admin <span>✦</span></h1><p>{t.subtitle}</p></div>
            <div className="demo-tag"><span />{t.demo}</div>
          </div>

          <section className="stats-section">
            <div className="section-heading"><div><h2>{t.overview}</h2><p>Key numbers at a glance</p></div><span className="period-pill"><CalendarDays size={15} /> Today <ChevronDown size={14} /></span></div>
            <div className="stats-grid">
              <StatCard icon={<Activity />} label={t.production} value="2,450" unit="kg" note={t.productionNote} trend="+8.2%" positive />
              <StatCard icon={<Package />} label={t.orders} value="18" note={t.ordersNote} trend="+3" positive />
              <StatCard icon={<Boxes />} label={t.pending} value="6" note={t.dispatchNote} trend="2 urgent" />
              <StatCard icon={<Wallet />} label={t.collection} value="₹48,500" note={t.collectionNote} trend="+12.5%" positive />
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel quick-panel">
              <div className="section-heading"><div><h2>{t.quick}</h2><p>Jump into your daily work</p></div></div>
              <div className="module-grid">{modules.map(({ icon: Icon, label, color }) => <button className="module-tile" key={label} onClick={() => alert('This module will be enabled in a later TexFlow stage.')}><span className={`module-icon ${color}`}><Icon size={21} /></span><strong>{label}</strong><span className="tile-arrow">↗</span></button>)}</div>
            </div>
            <div className="panel activity-panel">
              <div className="section-heading"><div><h2>{t.recent}</h2><p>Latest updates from your workspace</p></div><button className="text-btn">{t.viewAll}</button></div>
              <div className="activity-list">{activities.map(({ icon: Icon, tone, title, time }) => <div className="activity-item" key={title}><span className={`activity-icon ${tone}`}><Icon size={17} /></span><div className="activity-copy"><strong>{t[title]}</strong><small>{t[time]}</small></div><CheckCircle2 className="activity-check" size={17} /></div>)}</div>
            </div>
          </section>
          <div className="demo-banner"><ShieldCheck size={19} /><div><strong>{t.demo}</strong><p>{t.demoText} {t.allModules}</p></div></div>
          <footer>© 2026 TexFlow <span>Built for textile businesses</span></footer>
        </div>
      </main>
    </div>
  )
}

function ClipboardIcon({ size = 20 }: { size?: number }) {
  return <Package size={size} />
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><span /></span><span>tex<span>flow</span></span></div>
}

function LanguageSwitch({ language, setLanguage, label }: { language: Language; setLanguage: (v: Language) => void; label: string }) {
  return <div className="language-switch" aria-label={label || 'Language selector'}><Languages size={16} /><button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button><span>/</span><button className={language === 'ta' ? 'chosen' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button></div>
}

function StatCard({ icon, label, value, unit, note, trend, positive }: { icon: React.ReactNode; label: string; value: string; unit?: string; note: string; trend: string; positive?: boolean }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span className={`trend ${positive ? 'positive' : ''}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend}</span></div><p>{label}</p><div className="stat-value">{value} <small>{unit}</small></div><span className="stat-note">{note}</span></article>
}