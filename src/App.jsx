import { useState, useMemo } from 'react'
import './index.css'
import { useData } from './hooks/useData'
import { useTheme } from './hooks/useTheme'
import { useWindowSize } from './hooks/useWindowSize'
import Sidebar, { TogglePill } from './components/Sidebar'
import FilterBar from './components/FilterBar'
import Dashboard from './components/Dashboard'
import Outreach from './components/Outreach'
import Sales from './components/Sales'
import Tasks from './components/Tasks'
import Clients from './components/Clients'
import Login from './components/Login'
import Onboarding from './components/Onboarding'
import { useAuth } from './hooks/useAuth'
import { computeTaskStats } from './utils/computeTaskStats'

function getGreeting(name) {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague', hour: 'numeric', hour12: false }))
  const n = name || 'there'
  if (h >= 5 && h < 12) return `Good morning, ${n}`
  if (h >= 12 && h < 18) return `Good afternoon, ${n}`
  if (h >= 18 && h < 22) return `Good evening, ${n}`
  return `Good night, ${n}`
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const { user, allowed, loading: authLoading, login, logout } = useAuth()
  const { data, loading, error, reload, loadedAt, needsSetup, config } = useData(user)
  const { theme, toggle, isManual } = useTheme()
  const { isMobile, isTablet } = useWindowSize()

  // Compute task stats directly here — no dependency on Tasks tab being visible
  const taskStats = useMemo(() => computeTaskStats(data), [data])
  const dailyStats = taskStats ? {
    fuToday: taskStats.fuTotal,
    fuDoneToday: taskStats.fuDone,
    pfuToday: taskStats.pfuTotal,
    pfuDoneToday: taskStats.pfuDone,
    streak: taskStats.streak,
  } : null

  function handleFilter(key) {
    setFilter(key)
    if (key !== 'custom') { setAppliedFrom(''); setAppliedTo('') }
  }
  function applyCustom() {
    if (!customFrom || !customTo) return
    setAppliedFrom(customFrom); setAppliedTo(customTo); setFilter('custom')
  }

  const PAGE_TITLES = { dashboard: getGreeting(config?.userName), outreach: 'Outreach', sales: 'Sales Calls', tasks: 'Daily Tasks', clients: 'Clients' }
  const isDark = theme === 'dark'

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>
  if (!user || !allowed) return <Login onLogin={login} />
  if (needsSetup) return <Onboarding user={user} onComplete={reload} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={page} onNav={setPage}
        loadedAt={loadedAt} loading={loading} error={error}
        theme={theme} onThemeToggle={toggle} isManualTheme={isManual}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
        onLogout={logout}
      />

      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, minHeight: '100vh', transition: 'margin 0.25s' }}>
        {/* Topbar */}
        <div style={{ padding: isMobile ? '20px 16px 0' : '28px 40px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', padding: 4, cursor: 'pointer', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{PAGE_TITLES[page]}</div>
          </div>

          {/* Filter + toggle on desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isMobile && <TogglePill isDark={isDark} onToggle={toggle} />}
            <FilterBar active={filter} onFilter={handleFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} onCustomApply={applyCustom} isMobile={isMobile} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '0 16px 32px' : '0 40px 40px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>Fetching live data...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ color: '#EF4444', marginBottom: 8 }}>{error}</div>
              <button onClick={reload} style={{ padding: '8px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Retry</button>
            </div>
          ) : data ? (
            <>
              {page === 'dashboard' && <Dashboard data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} dailyStats={dailyStats} theme={theme} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'outreach'  && <Outreach  data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'sales'     && <Sales     data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'tasks'     && <Tasks     stats={taskStats} filter={filter} isMobile={isMobile} />}
              {page === 'clients'   && <Clients   user={user} isMobile={isMobile} isTablet={isTablet} filter={filter} customFrom={appliedFrom} customTo={appliedTo} />}
            </>
          ) : null}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
