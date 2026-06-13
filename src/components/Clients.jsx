import { useState, useEffect } from 'react'
import { computeTaskStats } from '../utils/computeTaskStats'

const PROXY = "https://script.google.com/macros/s/AKfycbwhZJ3fb9is6_vU1Wh7RdHWM0-dCwNQ6xTkIc3N45v7L9dNnRmycZhEQZfM17nKW2Hy/exec"

const COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  // maybe they pasted just the ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim()
  return ''
}

function AddClientWizard({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [link, setLink] = useState('')
  const [showCalendly, setShowCalendly] = useState(false)
  const [calendlyPat, setCalendlyPat] = useState('')
  const [calendlyUri, setCalendlyUri] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    const sheetId = extractSheetId(link)
    if (!name) { setError('Client name is required'); return }
    if (!sheetId) { setError('Paste a valid Google Sheets link'); return }
    setLoading(true)
    setError('')
    try {
      // Auto-detect tabs from the sheet
      let tabs = 'Mar,Apr,May,Jun'
      try {
        const tabRes = await fetch(`${PROXY}?action=getSheetTabs&sheetId=${encodeURIComponent(sheetId)}`)
        const tabData = await tabRes.json()
        if (tabData.tabs && tabData.tabs.length) tabs = tabData.tabs.join(',')
      } catch(e) { /* fallback to default */ }

      const url = `${PROXY}?action=addClient&name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}&outreachSheetId=${encodeURIComponent(sheetId)}&sheetTabs=${encodeURIComponent(tabs)}&calendlyPat=${encodeURIComponent(calendlyPat)}&calendlyUserUri=${encodeURIComponent(calendlyUri)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) { onAdded(); onClose() }
      else setError('Failed to add client')
    } catch(e) {
      setError('Network error')
    }
    setLoading(false)
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, display: 'block', letterSpacing: '0.05em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Add New Client</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>CLIENT NAME</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Bookkeeping" />
          </div>
          <div>
            <label style={labelStyle}>COLOR</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>TRACKING SHEET LINK</label>
            <input style={inputStyle} value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Paste the full Google Sheets link, the rest is detected automatically</div>
          </div>

          {!showCalendly ? (
            <button onClick={() => setShowCalendly(true)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Calendly (optional)
            </button>
          ) : (
            <>
              <div>
                <label style={labelStyle}>CALENDLY PAT</label>
                <input style={inputStyle} value={calendlyPat} onChange={e => setCalendlyPat(e.target.value)} placeholder="eyJraWQi..." />
              </div>
              <div>
                <label style={labelStyle}>CALENDLY USER URI</label>
                <input style={inputStyle} value={calendlyUri} onChange={e => setCalendlyUri(e.target.value)} placeholder="https://api.calendly.com/users/..." />
              </div>
            </>
          )}
        </div>

        {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 16 }}>{error}</div>}

        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 28, opacity: loading ? 0.7 : 1 }}>{loading ? 'Adding...' : 'Add Client'}</button>
      </div>
    </div>
  )
}

function calcStats(data, filter, customFrom, customTo) {
  if (!data) return null
  const allRows = []
  for (const sheet of [data.mar||[], data.apr||[], data.may||[], data.jun||[]]) {
    let ds = -1
    for (let i = 0; i < sheet.length; i++) {
      if (sheet[i] && sheet[i][1] === 'Name' && sheet[i][3] === 'Date') { ds = i+1; break }
    }
    if (ds < 0) continue
    for (let i = ds; i < sheet.length; i++) {
      const r = sheet[i]; if (!r || !r[3]) continue
      allRows.push(r)
    }
  }
  // Apply filter
  let rows = allRows
  if (filter && filter !== 'all') {
    const now = new Date()
    const days = filter === '7d' ? 7 : filter === '14d' ? 14 : filter === '30d' ? 30 : filter === 'today' ? 0 : filter === 'yesterday' ? 1 : null
    rows = allRows.filter(r => {
      const d = r[3] ? new Date(r[3]) : null
      if (!d) return false
      if (filter === 'custom' && customFrom && customTo) return r[3] >= customFrom && r[3] <= customTo
      if (filter === 'today') return d.toDateString() === now.toDateString()
      if (filter === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString() }
      if (days !== null) { const cutoff = new Date(now); cutoff.setDate(cutoff.getDate()-days); return d >= cutoff }
      return true
    })
  }
  let initiated = 0, replies = 0, booked = 0
  rows.forEach(r => {
    initiated++
    if (r[14] && String(r[14]).trim()) replies++
    if (r[27] && String(r[27]).trim()) booked++
  })
  const prr = initiated > 0 ? (replies/initiated*100).toFixed(1) : null
  const abr = initiated > 0 ? (booked/initiated*100).toFixed(1) : null
  return { initiated, replies, booked, prr, abr }
}

function ClientCard({ client, data, filter, customFrom, customTo, onSelect }) {
  const stats = calcStats(data, filter, customFrom, customTo)
  return (
    <div onClick={() => onSelect(client)} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', padding: '20px 24px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--card-shadow)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: client.Color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {client.Name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{client.Name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Added {new Date(client['Created At']).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
      {!stats ? (
        <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${client.Color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { label: 'Init', val: stats.initiated, color: '#60A5FA' },
            { label: 'Replies', val: stats.replies, color: '#FB923C' },
            { label: 'Booked', val: stats.booked, color: '#A78BFA' },
            { label: 'PRR', val: stats.prr !== null ? stats.prr+'%' : '—', color: '#F472B6' },
            { label: 'ABR', val: stats.abr !== null ? stats.abr+'%' : '—', color: '#34D399' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 3, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClientStats({ client, isMobile }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const tabs = (client['Sheet Tabs'] || 'Mar,Apr,May,Jun').split(',').map(t => t.trim())
        const sheetId = client['Outreach Sheet ID']
        const results = await Promise.all(tabs.map(tab =>
          fetch(`${PROXY}?id=${sheetId}&range=${encodeURIComponent(tab + '!A1:AZ700')}`)
            .then(r => r.json()).then(d => d.values || []).catch(() => [])
        ))
        const dataObj = {}
        tabs.forEach((tab, i) => { dataObj[tab.toLowerCase().slice(0,3)] = results[i] })
        // computeTaskStats reads mar/apr/may/jun; map by month name, fall back to order
        const normalized = {
          mar: dataObj['mar'] || results[0] || [],
          apr: dataObj['apr'] || results[1] || [],
          may: dataObj['may'] || results[2] || [],
          jun: dataObj['jun'] || results[3] || [],
        }
        setData(normalized)
      } catch(e) {
        setError('Failed to load data')
      }
      setLoading(false)
    }
    load()
  }, [client])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
  if (error) return <div style={{ color: '#EF4444', padding: 20 }}>{error}</div>
  if (!data) return null

  const stats = computeTaskStats(data)
  if (!stats) return null

  const { outreachCount, fuTotal, fuDone, pfuTotal, pfuDone, streak, dailyInitiated } = stats

  // Total stats
  const allRows = []
  for (const sheet of [data.mar||[], data.apr||[], data.may||[], data.jun||[]]) {
    let ds = -1
    for (let i = 0; i < sheet.length; i++) {
      if (sheet[i] && sheet[i][1] === 'Name' && sheet[i][3] === 'Date') { ds = i+1; break }
    }
    if (ds < 0) continue
    for (let i = ds; i < sheet.length; i++) {
      const r = sheet[i]; if (!r || !r[3]) continue
      allRows.push(r)
    }
  }
  let initiated = 0, replies = 0, booked = 0
  allRows.forEach(r => {
    initiated++
    if (r[14] && String(r[14]).trim()) replies++
    if (r[27] && String(r[27]).trim()) booked++
  })

  const s = (label, val, color) => (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Overall Pipeline</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {s('Initiated', initiated.toLocaleString(), '#60A5FA')}
        {s('Replies', replies.toLocaleString(), '#FB923C')}
        {s('Booked', booked.toLocaleString(), '#A78BFA')}
        {s('Book Rate', initiated > 0 ? (booked/initiated*100).toFixed(1)+'%' : '—', '#34D399')}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Today</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Outreach</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: outreachCount >= 20 ? '#34D399' : '#EF4444', lineHeight: 1 }}>{outreachCount}<span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>/20</span></div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Followups</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: fuTotal === 0 ? 'var(--text4)' : fuDone >= fuTotal ? '#34D399' : '#EF4444', lineHeight: 1 }}>{fuDone}<span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>/{fuTotal||'—'}</span></div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Pos. Followups</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: pfuTotal === 0 ? 'var(--text4)' : pfuDone >= pfuTotal ? '#34D399' : '#EF4444', lineHeight: 1 }}>{pfuDone}<span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>/{pfuTotal||'—'}</span></div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#FB923C' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg></span>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>days</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Clients({ isMobile, filter, customFrom, customTo }) {
  const [clients, setClients] = useState([])
  const [clientData, setClientData] = useState({})
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadClients() {
    setLoading(true)
    try {
      const res = await fetch(`${PROXY}?action=getClients`)
      const json = await res.json()
      const list = json.clients || []
      setClients(list)
      // Load data for all clients
      const dataMap = {}
      await Promise.all(list.map(async c => {
        try {
          const tabs = (c['Sheet Tabs'] || 'Mar,Apr,May,Jun').split(',').map(t => t.trim())
          const sheetId = c['Outreach Sheet ID']
          const results = await Promise.all(tabs.map(tab =>
            fetch(`${PROXY}?id=${sheetId}&range=${encodeURIComponent(tab + '!A1:AZ700')}`)
              .then(r => r.json()).then(d => d.values || []).catch(() => [])
          ))
          const dataObj = {}
          tabs.forEach((tab, i) => { dataObj[tab.toLowerCase().slice(0,3)] = results[i] })
          dataMap[c.ID] = {
            mar: dataObj['mar'] || results[0] || [],
            apr: dataObj['apr'] || results[1] || [],
            may: dataObj['may'] || results[2] || [],
            jun: dataObj['jun'] || results[3] || [],
          }
        } catch(e) { dataMap[c.ID] = null }
      }))
      setClientData(dataMap)
    } catch(e) {
      setClients([])
    }
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Clients
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected.Color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
          {selected.Name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{selected.Name}</div>
      </div>
      <ClientStats client={selected} data={clientData[selected?.ID]} filter={filter} customFrom={customFrom} customTo={customTo} isMobile={isMobile} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{clients.length} active client{clients.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Client
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No clients yet</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Add your first client to start tracking their outreach</div>
          <button onClick={() => setShowWizard(true)} style={{ padding: '12px 24px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Add First Client</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14 }}>
          {clients.map(c => <ClientCard key={c.ID} client={c} data={clientData[c.ID]} filter={filter} customFrom={customFrom} customTo={customTo} onSelect={setSelected} />)}
        </div>
      )}

      {showWizard && <AddClientWizard onClose={() => setShowWizard(false)} onAdded={loadClients} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
