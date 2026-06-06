import { useState } from 'react'
import './index.css'
import { useData } from './hooks/useData'
import { useTheme } from './hooks/useTheme'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import Dashboard from './components/Dashboard'
import Outreach from './components/Outreach'
import Sales from './components/Sales'
import Tasks from './components/Tasks'

function getGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague', hour: 'numeric', hour12: false }))
  if (h >= 5 && h < 12) return 'Good morning, Kryštof'
  if (h >= 12 && h < 18) return 'Good afternoon, Kryštof'
  if (h >= 18 && h < 22) return 'Good evening, Kryštof'
  return 'Good night, Kryštof'
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [dailyStats, setDailyStats] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data, loading, error, reload, loadedAt } = useData()
  const { theme, toggle, isManual } = useTheme()

  function handleFilter(key) {
    setFilter(key)
    if (key !== 'custom') { setAppliedFrom(''); setAppliedTo('') }
  }
  function applyCustom() {
    if (!customFrom || !customTo) return
    setAppliedFrom(customFrom); setAppliedTo(customTo); setFilter('custom')
  }

  const PAGE_TITLES = { dashboard: getGreeting(), outreach: 'Outreach', sales: 'Sales Calls', tasks: 'Daily Tasks' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={page} onNav={setPage}
        loadedAt={loadedAt} loading={loading} error={error}
        theme={theme} onThemeToggle={toggle} isManualTheme={isManual}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
      />

      <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', transition: 'margin 0.25s' }} className="main-content">
        {/* Topbar */}
        <div style={{ padding: '28px 40px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="hamburger" onClick={() => setMobileOpen(true)} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text)', padding: 4, cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>{PAGE_TITLES[page]}</div>
          </div>
          <FilterBar active={filter} onFilter={handleFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} onCustomApply={applyCustom} />
        </div>

        <div className="page-body" style={{ padding: '0 40px 40px' }}>
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
              {page === 'dashboard' && <Dashboard data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} dailyStats={dailyStats} theme={theme} />}
              {page === 'outreach'  && <Outreach  data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} />}
              {page === 'sales'     && <Sales     data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} />}
              {page === 'tasks'     && <Tasks     data={data} onDailyStats={setDailyStats} filter={filter} theme={theme} />}
            </>
          ) : null}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
          .main-content > div:first-child { padding: 20px 16px 0 !important; }
          .page-body { padding: 0 16px 32px !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
