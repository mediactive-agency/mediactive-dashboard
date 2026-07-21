import { useState, useMemo, useEffect } from 'react'
import './index.css'
import { useData } from './hooks/useData'
import { useClients } from './hooks/useClients'
import { useWorkspace } from './hooks/useWorkspace'
import { useTheme } from './hooks/useTheme'
import { useWindowSize } from './hooks/useWindowSize'
import Sidebar, { TogglePill } from './components/Sidebar'
import FilterBar from './components/FilterBar'
import Dashboard from './components/Dashboard'
import Outreach from './components/Outreach'
import Sales from './components/Sales'
import Tasks from './components/Tasks'
import Clients from './components/Clients'
import Campaigns from './components/Campaigns'
import Login from './components/Login'
import InviteLanding from './components/InviteLanding'
import PreviewDashboard from './components/PreviewDashboard'
import OnboardingTour, { HelpButton } from './components/OnboardingTour'
import Onboarding from './components/Onboarding'
import { useAuth } from './hooks/useAuth'
import Settings from './components/Settings'
import Members from './components/Members'
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
  const [tourOpen, setTourOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState(() => {
    const m = window.location.pathname.match(/^\/invite\/([^/]+)/)
    return m ? m[1] : null
  })
  const [previewToken] = useState(() => {
    const m = window.location.pathname.match(/^\/preview\/([^/]+)/)
    return m ? m[1] : null
  })

  const { user, isAdmin, allowed, loading: authLoading, login, logout } = useAuth()
  const workspace = useWorkspace(user)
  const { data, loading, error, reload, loadedAt, needsSetup, config } = useData(user, workspace.activeWorkspaceId)
  // Loads quietly in the background once the dashboard data above is ready, so it
  // doesn't compete with it on login, and is usually already there by the time
  // you click the Clients tab.
  const clientsState = useClients(user, { enabled: !loading && !!data })
  const { theme, toggle, isManual } = useTheme()
  const { isMobile, isTablet } = useWindowSize()

  async function handleAcceptInvite(token) {
    await workspace.redeemInvite(token)
    window.history.replaceState({}, '', '/')
    setInviteToken(null)
  }

  // Compute task stats directly here, no dependency on Tasks tab being visible
  const taskStats = useMemo(() => computeTaskStats(data, { vslMode: config?.vslMode ?? false, weekendOutreach: config?.weekendOutreach ?? false }), [data, config?.vslMode, config?.weekendOutreach])
  const dailyStats = taskStats ? {
    fuToday: taskStats.fuTotal,
    fuDoneToday: taskStats.fuDone,
    pfuToday: taskStats.pfuTotal,
    pfuDoneToday: taskStats.pfuDone,
    streak: taskStats.streak,
    pendingFU: taskStats.pendingFUToday,
    pendingPFU: taskStats.pendingPFUToday,
  } : null

  function handleFilter(key) {
    setFilter(key)
    if (key !== 'custom') { setAppliedFrom(''); setAppliedTo('') }
  }
  function applyCustom() {
    if (!customFrom || !customTo) return
    setAppliedFrom(customFrom); setAppliedTo(customTo); setFilter('custom')
  }

  const PAGE_TITLES = { dashboard: getGreeting(config?.userName), outreach: 'Outreach', sales: 'Sales Calls', tasks: 'Daily Tasks', clients: 'Clients', campaigns: 'Campaigns', settings: 'Settings', members: 'AGP Members' }
  const isDark = theme === 'dark'

  if (previewToken) return <PreviewDashboard token={previewToken} />
  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>
  if (inviteToken) return <InviteLanding token={inviteToken} user={user} onLogin={login} onAccept={handleAcceptInvite} />
  if (!user || !allowed) return <Login onLogin={login} />
  if (workspace.loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ width: 32, height: 32, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>
  function handleSetupComplete(opts) {
    reload()
    if (opts?.showTour) setTourOpen(true)
  }
  if (needsSetup) return <Onboarding user={user} workspaceId={workspace.activeWorkspaceId} onComplete={handleSetupComplete} isMobile={isMobile} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        active={page} onNav={setPage}
        loadedAt={loadedAt} loading={loading} error={error}
        theme={theme} onThemeToggle={toggle} isManualTheme={isManual}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
        onLogout={logout}
        logoUrl={config?.logoUrl}
        isAdmin={isAdmin}
        workspaces={workspace.workspaces}
        activeWorkspaceId={workspace.activeWorkspaceId}
        onSwitchWorkspace={workspace.switchWorkspace}
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
            <HelpButton onClick={() => setTourOpen(true)} />
            <div data-tour="filter-bar">
            <FilterBar active={filter} onFilter={handleFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} onCustomApply={applyCustom} isMobile={isMobile} />
            </div>
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
              {page === 'dashboard' && <Dashboard data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} dailyStats={dailyStats} theme={theme} isMobile={isMobile} isTablet={isTablet} vslMode={config?.vslMode ?? false} />}
              {page === 'outreach'  && <Outreach  data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} vslMode={config?.vslMode ?? false} />}
              {page === 'sales'     && <Sales     data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} theme={theme} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'tasks'     && <Tasks     stats={taskStats} filter={filter} isMobile={isMobile} dailyGoal={config?.dailyGoal ?? 20} weekendOutreach={config?.weekendOutreach ?? false} />}
              {page === 'clients'   && <Clients   user={user} isMobile={isMobile} isTablet={isTablet} filter={filter} customFrom={appliedFrom} customTo={appliedTo} clients={clientsState.clients} clientData={clientsState.clientData} clientsLoading={clientsState.loading} onClientsReload={clientsState.reload} />}
              {page === 'campaigns' && <Campaigns data={data} user={user} config={config} isMobile={isMobile} isTablet={isTablet} />}
              {page === 'settings'  && <Settings  user={user} config={config} workspaceId={workspace.activeWorkspaceId} workspace={workspace} isOwner={workspace.activeRole === 'owner'} onSaved={reload} isMobile={isMobile} />}
              {page === 'members'   && isAdmin && <Members isMobile={isMobile} isTablet={isTablet} />}
            </>
          ) : null}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      {tourOpen && (
        <OnboardingTour
          userName={config?.userName}
          onClose={() => setTourOpen(false)}
          onNav={(p, keepTour) => { setPage(p); if (!keepTour) setTourOpen(false) }}
          isMobile={isMobile}
          vslMode={config?.vslMode ?? false}
        />
      )}
    </div>
  )
}
