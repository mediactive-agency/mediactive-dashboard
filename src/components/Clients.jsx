import { useState, useEffect } from 'react'
import { computeTaskStats } from '../utils/computeTaskStats'
import Dashboard from './Dashboard'
import Outreach from './Outreach'
import Campaigns from './Campaigns'
import { parseOutreachMonth } from './Dashboard'
import { outreachSheets } from '../utils/data'
import { db } from '../firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'

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

function AddClientWizard({ onClose, onAdded, user }) {
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

      await addDoc(collection(db, 'clients'), {
        name, color,
        outreachSheetId: sheetId,
        sheetTabs: tabs,
        calendlyPat: calendlyPat || '',
        calendlyUserUri: calendlyUri || '',
        active: true,
        userId: user.uid,
        createdAt: serverTimestamp()
      })
      onAdded(); onClose()
    } catch(e) {
      setError(e.message || 'Network error')
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
          <button onClick={onClose} className="hoverable" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
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
                <button key={c} onClick={() => setColor(c)} className="hoverable-fade" style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>TRACKING SHEET LINK</label>
            <input style={inputStyle} value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Paste the full Google Sheets link, the rest is detected automatically</div>
          </div>

          {!showCalendly ? (
            <button onClick={() => setShowCalendly(true)} className="hoverable-fade" style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
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

        <button onClick={submit} disabled={loading} className="hoverable-fade" style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 28, opacity: loading ? 0.7 : 1 }}>{loading ? 'Adding...' : 'Add Client'}</button>
      </div>
    </div>
  )
}

function calcStats(data, filter, customFrom, customTo) {
  if (!data) return null
  const allRows = []
  for (const sheet of outreachSheets(data)) {
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
  let initiated = 0, mediaSeen = 0, replies = 0, booked = 0
  rows.forEach(r => {
    initiated++
    if (String(r[10]||'').toUpperCase() === 'YES') mediaSeen++
    if (r[14] && String(r[14]).trim()) replies++
    if (r[27] && String(r[27]).trim()) booked++
  })
  const msr = initiated > 0 ? (mediaSeen/initiated*100).toFixed(1) : null
  const prr = initiated > 0 ? (replies/initiated*100).toFixed(1) : null
  const abr = initiated > 0 ? (booked/initiated*100).toFixed(1) : null
  return { initiated, mediaSeen, replies, booked, msr, prr, abr }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 28, flex: 1 }}>
            {[
              { label: 'Init',    val: stats.initiated, color: '#60A5FA' },
              { label: 'Seen',    val: stats.mediaSeen, color: '#F472B6' },
              { label: 'Replies', val: stats.replies,   color: '#FB923C' },
              { label: 'Booked',  val: stats.booked,    color: '#A855F7' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 5, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'MSR', val: stats.msr !== null ? stats.msr+'%' : '-', color: '#F472B6' },
              { label: 'PRR', val: stats.prr !== null ? stats.prr+'%' : '-', color: '#FB923C' },
              { label: 'ABR', val: stats.abr !== null ? stats.abr+'%' : '-', color: '#A855F7' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 5, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClientStats({ client, data, filter, customFrom, customTo, isMobile, isTablet, user, readOnly }) {
  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const taskStats = computeTaskStats(data)
  const { outreachCount = 0, fuTotal = 0, fuDone = 0, pfuTotal = 0, pfuDone = 0 } = taskStats || {}

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6

  // Monthly performance
  const ALL_MONTH_PAIRS = [['mar','Mar'],['apr','Apr'],['may','May'],['jun','Jun']]
  const currentMonth = new Date().getMonth() // 0=Jan, 5=Jun
  const MONTH_TO_IDX = { mar:2, apr:3, may:4, jun:5 }
  const lastThreePairs = ALL_MONTH_PAIRS.filter(([k]) => MONTH_TO_IDX[k] <= currentMonth && data[k] && data[k].length > 1).slice(-3)
  const MONTH_KEYS = lastThreePairs.map(([k]) => k)
  const MONTH_LABELS = lastThreePairs.map(([,l]) => l)
  const monthlyRows = MONTH_KEYS.map((k, i) => {
    const pm = parseOutreachMonth(data[k]||[])
    if (!pm || !pm.summary) return null
    const s = pm.summary
    return { month: MONTH_LABELS[i], A: s.A, MS: s.MS, B: s.B, C: s.C,
      msr: s.A > 0 ? +((s.MS/s.A)*100).toFixed(1) : 0,
      prr: s.A > 0 ? +((s.B/s.A)*100).toFixed(1) : 0,
      abr: s.A > 0 ? +((s.C/s.A)*100).toFixed(1) : 0 }
  }).filter(Boolean)

  return (
    <div>
      {/* 1. Total Active Funnel */}
      <Outreach data={data} filter={filter} customFrom={customFrom} customTo={customTo} isMobile={isMobile} isTablet={isTablet} mode="funnel" />

      {/* 2. Monthly Performance + Daily Tasks vedle sebe */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, margin: '28px 0' }}>

        {/* Monthly Performance, zactly same layout as main dashboard */}
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Monthly Performance</div>
          {monthlyRows.map((m, mi) => (
            <div key={m.month} style={{ paddingBottom: 14, marginBottom: mi < monthlyRows.length - 1 ? 14 : 0, borderBottom: mi < monthlyRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--text2)', fontSize: 13 }}>{m.month} 2026</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ display: 'flex', gap: 32, flex: 1 }}>
                  {[
                    {val:m.A,  lbl:'INIT',    color:'#60A5FA'},
                    {val:m.MS, lbl:'SEEN',    color:'#F472B6'},
                    {val:m.B,  lbl:'REPLIES', color:'#FB923C'},
                    {val:m.C,  lbl:'BOOKED',  color:'#A855F7'},
                  ].map(x => (
                    <div key={x.lbl} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: x.color }}>{x.val}</div>
                      <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>{x.lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{ width: 1, height: 36, background: 'var(--border)', margin: '0 20px', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: 32 }}>
                  {[
                    {val:m.msr+'%', lbl:'MSR', color:'#F472B6'},
                    {val:m.prr+'%', lbl:'PRR', color:'#FB923C'},
                    {val:m.abr+'%', lbl:'ABR', color:'#A855F7'},
                  ].map(x => (
                    <div key={x.lbl} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: x.color }}>{x.val}</div>
                      <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>{x.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Daily Tasks, standalone karty */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Outreach',       value: `${outreachCount}/20`,        color: outreachCount >= 20 ? '#34D399' : '#EF4444',                                                    sub: outreachCount >= 20 ? 'Goal reached' : 'Messages sent' },
            { label: 'Followups',      value: `${fuDone}/${fuTotal||'-'}`,   color: fuTotal === 0 ? 'var(--text4)' : fuDone >= fuTotal ? '#34D399' : '#EF4444',                    sub: 'Due today' },
            { label: 'Pos. Followups', value: `${pfuDone}/${pfuTotal||'-'}`, color: pfuTotal === 0 ? 'var(--text4)' : pfuDone >= pfuTotal ? '#34D399' : '#F59E0B',                 sub: 'Active sequences' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--card)', borderRadius: 12, padding: '20px 22px', boxShadow: 'var(--card-shadow)', flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              {isWeekend
                ? <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text5)', lineHeight: 1 }}>Not today</div>
                : <>
                  <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{k.sub}</div>
                </>}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Variable funnels */}
      <Outreach data={data} filter={filter} customFrom={customFrom} customTo={customTo} isMobile={isMobile} isTablet={isTablet} mode="variables" />

      {/* 4. Campaigns / pipelines, scoped to this client (separate from your own) */}
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '28px 0 16px' }}>Campaigns</div>
      <Campaigns
        data={data}
        user={user}
        config={{ campaignMessages: client.campaignMessages }}
        clientId={client.ID}
        isMobile={isMobile}
        readOnly={readOnly}
      />
    </div>
  )
}


// Module-level cache so switching away from the Clients tab and back doesn't
// re-run the slow per-client Apps Script fetches every time. Keyed by uid,
// not cleared on unmount (only a real navigation-cycle of the SPA resets it).
const clientsCache = new Map()
const CACHE_STALE_MS = 60 * 1000 // refresh quietly in the background if older than this

export default function Clients({ user, isMobile, isTablet, filter, customFrom, customTo, readOnly, clientsOverride }) {
  const cacheKey = readOnly ? null : user?.uid
  const cached = cacheKey ? clientsCache.get(cacheKey) : null

  const [clients, setClients] = useState(cached?.clients || [])
  const [clientData, setClientData] = useState(cached?.clientData || {})
  const [loading, setLoading] = useState(!cached)
  const [showWizard, setShowWizard] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadClients({ background = false } = {}) {
    if (!background) setLoading(true)
    try {
      let list
      if (readOnly) {
        // Preview mode: no Firestore auth available, use the snapshot taken when the link was created.
        list = (clientsOverride || []).map(c => ({ ID: c.id, Name: c.name, Color: c.color, 'Outreach Sheet ID': c.outreachSheetId, 'Sheet Tabs': c.sheetTabs, 'Calendly PAT': c.calendlyPat, 'Calendly User URI': c.calendlyUserUri, 'Created At': new Date(), campaignMessages: c.campaignMessages || {} }))
      } else {
        const snap = await getDocs(query(collection(db, 'clients'), where('active', '==', true), where('userId', '==', user.uid)))
        list = snap.docs.map(d => ({ ID: d.id, Name: d.data().name, Color: d.data().color, 'Outreach Sheet ID': d.data().outreachSheetId, 'Sheet Tabs': d.data().sheetTabs, 'Calendly PAT': d.data().calendlyPat, 'Calendly User URI': d.data().calendlyUserUri, 'Created At': d.data().createdAt?.toDate?.() || new Date(), campaignMessages: d.data().campaignMessages || {} }))
      }
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
      if (cacheKey) clientsCache.set(cacheKey, { clients: list, clientData: dataMap, ts: Date.now() })
    } catch(e) {
      if (!background) setClients([])
    }
    if (!background) setLoading(false)
  }

  useEffect(() => {
    if (cached) {
      // Already showing cached data instantly. Only hit the network again
      // if it's gotten a bit stale, and do it quietly without a spinner.
      if (Date.now() - cached.ts > CACHE_STALE_MS) loadClients({ background: true })
    } else {
      loadClients()
    }
  }, [])

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} className="hoverable-fade" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Clients
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: selected.Color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
          {selected.Name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{selected.Name}</div>
      </div>
      <ClientStats key={selected.ID} client={selected} data={clientData[selected?.ID]} filter={filter} customFrom={customFrom} customTo={customTo} isMobile={isMobile} isTablet={isTablet} user={user} readOnly={readOnly} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{clients.length} active client{clients.length !== 1 ? 's' : ''}</div>
        {!readOnly && (
        <button onClick={() => setShowWizard(true)} className="btn-outline-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Client
        </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No clients yet</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>{readOnly ? 'No clients to show.' : 'Add your first client to start tracking their outreach'}</div>
          {!readOnly && <button onClick={() => setShowWizard(true)} className="btn-outline-hover" style={{ padding: '12px 24px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Add First Client</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14 }}>
          {clients.map(c => <ClientCard key={c.ID} client={c} data={clientData[c.ID]} filter={filter} customFrom={customFrom} customTo={customTo} onSelect={setSelected} />)}
        </div>
      )}

      {!readOnly && showWizard && <AddClientWizard onClose={() => setShowWizard(false)} onAdded={loadClients} user={user} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
