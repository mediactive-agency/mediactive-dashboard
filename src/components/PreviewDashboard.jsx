import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { fetchDashboardData } from '../hooks/useData'
import { useTheme } from '../hooks/useTheme'
import { useWindowSize } from '../hooks/useWindowSize'
import { computeTaskStats } from '../utils/computeTaskStats'
import { LOGO_SVG } from '../utils/data'
import Sidebar, { TogglePill } from './Sidebar'
import FilterBar from './FilterBar'
import Dashboard from './Dashboard'
import Outreach from './Outreach'
import Sales from './Sales'
import Tasks from './Tasks'
import Clients from './Clients'
import Campaigns from './Campaigns'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
}

function CenteredMessage({ title, body }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '44px 36px', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', filter: 'var(--logo-filter, none)' }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 28 }}>{body}</div>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 22px', borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text)', fontWeight: 600, fontSize: 14,
          textDecoration: 'none', fontFamily: 'inherit',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Back to home
        </a>
      </div>
    </div>
  )
}

export default function PreviewDashboard({ token }) {
  const [link, setLink] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | not-found | expired
  const [page, setPage] = useState('dashboard')
  const [filter, setFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [data, setData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)

  const { theme, toggle, isManual } = useTheme()
  const { isMobile, isTablet } = useWindowSize()

  useEffect(() => {
    let active = true
    getDoc(doc(db, 'previewLinks', token)).then(snap => {
      if (!active) return
      if (!snap.exists()) { setStatus('not-found'); return }
      const d = snap.data()
      if (d.revoked || (d.expiresAt && Date.now() > d.expiresAt)) { setStatus('expired'); return }
      setLink(d)
      setStatus('ok')
    }).catch(() => { if (active) setStatus('not-found') })
    return () => { active = false }
  }, [token])

  async function loadData() {
    if (!link) return
    setDataLoading(true); setDataError(null)
    try {
      const result = await fetchDashboardData(link.config)
      setData(result)
      setLoadedAt(new Date())
    } catch (e) {
      setDataError(e.message)
    }
    setDataLoading(false)
  }

  useEffect(() => { loadData() }, [link])

  const config = link?.config
  const taskStats = useMemo(() => computeTaskStats(data, { vslMode: config?.vslMode ?? false, weekendOutreach: config?.weekendOutreach ?? false }), [data, config?.vslMode, config?.weekendOutreach])
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

  if (status === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>
  }
  if (status === 'not-found') {
    return <CenteredMessage title="Preview not found" body="This preview link is invalid or was revoked. Ask whoever sent it for a new one." />
  }
  if (status === 'expired') {
    return <CenteredMessage title="Preview link expired" body="This preview link is no longer active. Ask whoever sent it for a new one." />
  }

  const PAGE_TITLES = { dashboard: getGreeting(), outreach: 'Outreach', sales: 'Sales Calls', tasks: 'Daily Tasks', clients: 'Clients', campaigns: 'Campaigns' }
  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={page} onNav={setPage}
        loadedAt={loadedAt} loading={dataLoading} error={dataError}
        theme={theme} onThemeToggle={toggle} isManualTheme={isManual}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
        onLogout={null}
        logoUrl={config?.logoUrl}
        isAdmin={false}
        workspaces={[]}
        activeWorkspaceId={null}
        onSwitchWorkspace={() => {}}
        navItems={['dashboard', 'outreach', 'sales', 'tasks', 'clients', 'campaigns']}
      />

      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, minHeight: '100vh', transition: 'margin 0.25s' }}>
        <div style={{ padding: isMobile ? '20px 16px 0' : '28px 40px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', padding: 4, cursor: 'pointer', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>{PAGE_TITLES[page]}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isMobile && <TogglePill isDark={isDark} onToggle={toggle} />}
            <FilterBar active={filter} onFilter={handleFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} onCustomApply={applyCustom} isMobile={isMobile} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '0 16px 32px' : '0 40px 40px' }}>
          {dataLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>Fetching live data...</div>
            </div>
          ) : dataError ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ color: '#EF4444', marginBottom: 8 }}>{dataError}</div>
              <button onClick={loadData} style={{ padding: '8px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Retry</button>
            </div>
          ) : data ? (
            <>
              {page === 'dashboard' && <Dashboard data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} dailyStats={dailyStats} theme={theme} isMobile={isMobile} isTablet={isTablet} vslMode={config?.vslMode ?? false} />}
              {page === 'outreach'  && <Outreach  data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} vslMode={config?.vslMode ?? false} />}
              {page === 'sales'     && <Sales     data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'tasks'     && <Tasks     stats={taskStats} filter={filter} isMobile={isMobile} dailyGoal={config?.dailyGoal ?? 20} weekendOutreach={config?.weekendOutreach ?? false} />}
              {page === 'clients'   && <Clients   isMobile={isMobile} isTablet={isTablet} filter={filter} customFrom={appliedFrom} customTo={appliedTo} readOnly clientsOverride={link.clients || []} />}
              {page === 'campaigns' && <Campaigns data={data} config={config} isMobile={isMobile} isTablet={isTablet} readOnly />}
            </>
          ) : null}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
