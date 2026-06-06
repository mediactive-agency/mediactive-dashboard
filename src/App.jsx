import { useState } from 'react'
import './index.css'
import { useData } from './hooks/useData'
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

  const { data, loading, error, reload, loadedAt } = useData()

  function handleFilter(key) {
    setFilter(key)
    if (key !== 'custom') { setAppliedFrom(''); setAppliedTo('') }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    setAppliedFrom(customFrom); setAppliedTo(customTo)
    setFilter('custom')
  }

  const PAGE_TITLES = { dashboard: getGreeting(), outreach: 'Outreach', sales: 'Sales Calls', tasks: 'Daily Tasks' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar active={page} onNav={setPage} loadedAt={loadedAt} loading={loading} error={error} />

      <main style={{ marginLeft: 240, flex: 1, padding: '36px 40px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{PAGE_TITLES[page]}</div>
          </div>
          <FilterBar active={filter} onFilter={handleFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} onCustomApply={applyCustom} />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ color: '#666669', fontSize: 12 }}>Fetching live data...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ color: '#EF4444', marginBottom: 8 }}>{error}</div>
            <button onClick={reload} style={{ padding: '8px 18px', background: '#FFFFFF', color: '#000', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Retry</button>
          </div>
        ) : data ? (
          <>
            {page === 'dashboard' && <Dashboard data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} dailyStats={dailyStats} />}
            {page === 'outreach'  && <Outreach  data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} />}
            {page === 'sales'     && <Sales     data={data} filter={filter} customFrom={appliedFrom} customTo={appliedTo} />}
            {page === 'tasks'     && <Tasks     data={data} onDailyStats={setDailyStats} filter={filter} />}
          </>
        ) : null}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
