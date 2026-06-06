import { useMemo } from 'react'
import { TODAY, toDateStr, toSalesDateStr, inRange } from '../utils/data'

const OBJ_CATS = [
  { key: 'too_expensive', label: 'Too Expensive',      color: '#EF4444', patterns: ['price','expensive','budget','afford','cost','payment','invest','money','fund','cash','financial','runway'] },
  { key: 'need_to_think', label: 'Need to Think',      color: '#F97316', patterns: ['think','time','days','process','sleep','decide','decision','later','consider'] },
  { key: 'third_party',   label: '3rd Party Approval', color: '#F59E0B', patterns: ['partner','lawyer','husband','wife','cfo','coo','approval','consult','family'] },
  { key: 'burned_before', label: 'Burned Before',      color: '#A78BFA', patterns: ['burned','scam','previous','past','bad experience','failed','waste'] },
  { key: 'lack_of_trust', label: 'Lack of Trust',      color: '#60A5FA', patterns: ['trust','case stud','nda','proof','guarantee','result','evidence','testimonial','credential'] },
  { key: 'not_urgent',    label: 'Not Right Now',      color: 'var(--text4)', patterns: ['not urgent','no need','no rush','future','not ready','not now','eventually','revisit'] },
]

function normalizeObjection(raw) {
  const lower = raw.trim().toLowerCase()
  if (lower.startsWith('too expensive'))    return OBJ_CATS[0]
  if (lower.startsWith('need to think'))    return OBJ_CATS[1]
  if (lower.startsWith('3rd party'))        return OBJ_CATS[2]
  if (lower.startsWith('burned before'))    return OBJ_CATS[3]
  if (lower.startsWith('lack of trust'))    return OBJ_CATS[4]
  if (lower.startsWith('not right now'))    return OBJ_CATS[5]
  const bp = (raw.split('(')[0]).toLowerCase().trim()
  for (const cat of OBJ_CATS) { if (cat.patterns.some(p => bp.includes(p))) return cat }
  return null
}

const Q_COLORS = { 1: '#EF4444', 2: '#F97316', 3: '#F59E0B', 4: '#6EE7B7', 5: '#34D399' }
const Q_LABELS = { 1: 'Bad fit', 2: 'Weak', 3: 'Maybe', 4: 'Strong', 5: 'Ready' }

const ICO = {
  clients:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  revenue:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  channel:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  target:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  clock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  note:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  warn:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  check:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  linkedin: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  meet:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
}

function parseSituation(str) {
  if (!str || str === 'n/a') return null
  const parts = str.split('|').map(s => s.trim()).filter(Boolean)
  const out = { revenue: null, clients: null, channels: [], other: [] }
  parts.forEach(p => {
    const pl = p.toLowerCase()
    if (pl.startsWith('clients:')) out.clients = p.replace(/clients:/i, '').trim()
    else if (pl.startsWith('revenue:')) out.revenue = p.replace(/revenue:/i, '').trim()
    else if (!/n\/a/.test(pl)) out.channels.push(p)
  })
  return out
}

function parseGoal(str) {
  if (!str || str === 'n/a') return null
  const parts = str.split('|').map(s => s.trim()).filter(Boolean)
  const out = { revenue: null, clients: null, timeline: null, other: [] }
  parts.forEach(p => {
    const pl = p.toLowerCase().trim()
    if (/^\d+\s*clients?/i.test(p) || /clients?:/i.test(p)) out.clients = p.replace(/clients?:/i, '').trim()
    else if (/\$/.test(p) && (/\/month|\/year|k\/|arr/i.test(pl) || pl.includes('revenue'))) out.revenue = p.replace(/revenue:/i, '').trim()
    else if (/no specific revenue|no revenue target|no target/i.test(pl)) out.revenue = 'No specific'
    else if (/^in \d+|^\d+\s*(month|year|week)s?|by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d\d)|end of/i.test(pl)) out.timeline = p
    else out.other.push(p)
  })
  return out
}

const UPCOMING_CALLS = [
  { name: 'Blair William',    datetime: new Date('2026-06-06T15:30:00Z'), date: '6 Jun 2026',  time: '17:30', confirmed: false, meet: 'https://calendly.com/events/8dcdb646-4d82-4f10-a790-6ce3dfd72199/google_meet' },
  { name: 'Savannah Adkins',  datetime: new Date('2026-06-12T18:00:00Z'), date: '12 Jun 2026', time: '20:00', confirmed: true,  meet: 'https://calendly.com/events/21a9c7c6-b668-4334-82f1-320d4c1d5f80/google_meet' },
]

function CallCard({ r, linkedinMap }) {
  const res = (() => {
    const v = String(r[5]||'').toLowerCase()
    if (v === 'yes') return { color: '#34D399', label: 'Closed' }
    if (v === 'follow-up') return { color: '#F59E0B', label: 'Follow-up' }
    return { color: '#EF4444', label: 'Lost' }
  })()
  const q = parseInt(r[9])
  const qc = Q_COLORS[q] || '#555558'
  const ql = Q_LABELS[q] || ''
  const rawObjs = String(r[4]||'').trim() === 'None' || !String(r[4]||'').trim() ? [] : String(r[4]||'').split('|').map(s => s.trim()).filter(s => s.length > 2)
  const seenKeys = new Set()
  const uniqueObjs = rawObjs.map(o => normalizeObjection(o)).filter(Boolean).filter(o => { if (seenKeys.has(o.key)) return false; seenKeys.add(o.key); return true })
  const cur = parseSituation(r[2])
  const goal = parseGoal(r[3])
  const subjectColor = r[8] === 'Appt. Booking' ? '#A78BFA' : r[8] === 'Website + Appt. Booking' ? '#F472B6' : '#60A5FA'
  const li = linkedinMap[String(r[0]||'').toLowerCase()] || {}

  const ROWS = [
    { key: 'revenue', label: 'Revenue', ico: ICO.revenue, color: '#34D399' },
    { key: 'clients', label: 'Clients', ico: ICO.clients, color: '#60A5FA' },
    { key: 'timeline', label: 'Timeline', ico: ICO.clock, color: '#F59E0B', goalOnly: true },
    { key: 'channels', label: 'Channels', ico: ICO.channel, color: '#F472B6', curOnly: true },
    { key: 'other', label: 'Other', ico: ICO.target, color: '#A78BFA' },
  ]
  function getVal(parsed, key) {
    if (!parsed) return null
    if (key === 'channels') return parsed.channels?.length > 0 ? parsed.channels.join(', ') : null
    if (key === 'other') return parsed.other?.length > 0 ? parsed.other.join(', ') : null
    return parsed[key] || null
  }
  const visibleRows = ROWS.filter(row => {
    if (row.goalOnly) return getVal(goal, row.key)
    if (row.curOnly) return getVal(cur, row.key)
    return getVal(cur, row.key) || getVal(goal, row.key)
  })

  function Cell({ ico, color, label, val }) {
    if (!val) return null
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <span style={{ color, flexShrink: 0, marginTop: 1 }}>{ico}</span>
        <span style={{ fontSize: isMobile ? 13 : 11, color: 'var(--text4)', minWidth: isMobile ? 72 : 60, flexShrink: 0, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: isMobile ? 15 : 13, color: 'var(--text2)', lineHeight: 1.5 }}>{val}</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--card)', borderRadius: 14, padding: '24px 28px', marginBottom: 14, border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
          <div style={{ fontSize: isMobile ? 22 : 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{r[0]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {q >= 1 && q <= 5 && (
              <div style={{ textAlign: 'center', minWidth: 44 }}>
                <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 900, color: qc, lineHeight: 1 }}>{q}</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2, letterSpacing: '0.06em' }}>QUALITY</div>
              </div>
            )}
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', minWidth: 64 }}>
              <div style={{ fontSize: isMobile ? 16 : 15, fontWeight: 800, color: res.color }}>{res.label}</div>
              <div style={{ width: '100%', height: 2, background: res.color, borderRadius: 1, marginTop: 4, opacity: 0.5 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isMobile ? 14 : 13, color: 'var(--text4)' }}>{ICO.calendar} {toSalesDateStr(r[1])}</span>
          {r[7] && <span style={{ fontSize: isMobile ? 14 : 13, color: 'var(--text4)' }}>{r[7]}</span>}
          {r[8] && <span style={{ fontSize: isMobile ? 13 : 12, color: subjectColor, background: subjectColor + '18', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{r[8]}</span>}
          {li.linkedin && <a href={li.linkedin} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isMobile ? 14 : 13, color: '#0A66C2', fontWeight: 600 }}>{ICO.linkedin} LinkedIn</a>}
        </div>
      </div>

      {/* Current / Desired situation — dark inset panels */}
      {(cur || goal || r[2] || r[3]) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: isMobile ? 12 : 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', marginBottom: 10 }}>CURRENT SITUATION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cur ? visibleRows.filter(row => !row.goalOnly).map(row => <Cell key={row.key} ico={row.ico} color={row.color} label={row.label} val={getVal(cur, row.key)} />) : r[2] ? <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{r[2]}</div> : null}
            </div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', borderLeft: '2px solid #34D39944' }}>
            <div style={{ fontSize: isMobile ? 12 : 10, fontWeight: 700, color: '#34D399', letterSpacing: '0.1em', marginBottom: 10 }}>DESIRED SITUATION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goal ? visibleRows.filter(row => !row.curOnly).map(row => <Cell key={row.key} ico={row.ico} color={row.color} label={row.label} val={getVal(goal, row.key)} />) : r[3] ? <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{r[3]}</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {r[6] && (
        <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 14, paddingLeft: 12, borderLeft: '2px solid var(--border2)' }}>
          <span style={{ color: 'var(--text5)', flexShrink: 0, marginTop: 2 }}>{ICO.note}</span>
          <span>{r[6]}</span>
        </div>
      )}

      {/* Objections */}
      {uniqueObjs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text5)', flexShrink: 0 }}>{ICO.warn}</span>
          {uniqueObjs.map(o => (
            <span key={o.key} style={{ fontSize: 13, color: o.color, background: o.color + '15', border: `1px solid ${o.color}33`, padding: '4px 14px', borderRadius: 20, fontWeight: 600 }}>{o.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sales({ data, filter, customFrom, customTo }) {
  const { filtered, linkedinMap, stats } = useMemo(() => {
    if (!data) return { filtered: [], linkedinMap: {}, stats: null }
    const rows = data.sales.slice(1).filter(r => r && r[0])
    const filtered = rows.filter(r => inRange(toSalesDateStr(r[1]), filter, customFrom, customTo))

    // LinkedIn map from outreach
    const linkedinMap = {}
    const allOutreach = [...data.mar, ...data.apr, ...data.may, ...(data.jun||[])]
    let foundH = false
    for (const r of allOutreach) {
      if (!foundH) { if (r && r[1] === 'Name' && r[3] === 'Date') { foundH = true } continue }
      if (!r || !r[1]) continue
      const name = (r[1]||'').toString().trim().toLowerCase()
      if (name && !linkedinMap[name]) {
        const li = (r[2]||'').toString().trim()
        linkedinMap[name] = { linkedin: li.startsWith('http') ? li : null, account: String(r[4]||'').trim() || null }
      }
    }

    const total = filtered.length
    const closed = filtered.filter(r => String(r[5]||'').toLowerCase() === 'yes').length
    const followUp = filtered.filter(r => String(r[5]||'').toLowerCase() === 'follow-up').length
    const qs = filtered.map(r => parseInt(r[9])).filter(q => q >= 1 && q <= 5)
    const avgQ = qs.length > 0 ? +(qs.reduce((a,b) => a+b, 0) / qs.length).toFixed(1) : null
    const closeRate = total > 0 ? +((closed/total)*100).toFixed(1) : 0

    const catCounts = {}
    OBJ_CATS.forEach(c => catCounts[c.key] = 0)
    filtered.forEach(r => {
      if (!r[4]) return
      String(r[4]||'').split('|').map(s => s.trim()).filter(s => s.length > 2).forEach(raw => {
        const cat = normalizeObjection(raw); if (cat) catCounts[cat.key]++
      })
    })
    const maxCat = Math.max(...Object.values(catCounts), 1)

    const qDist = [1,2,3,4,5].map(q => ({ score: q, count: filtered.filter(r => parseInt(r[9]) === q).length }))

    return { filtered, linkedinMap, stats: { total, closed, followUp, closeRate, avgQ, catCounts, maxCat, qDist } }
  }, [data, filter, customFrom, customTo])

  if (!stats) return null
  const { total, closed, followUp, closeRate, avgQ, catCounts, maxCat, qDist } = stats
  const avgQColor = avgQ !== null ? (Q_COLORS[Math.round(avgQ)] || '#A78BFA') : '#555558'
  const upcomingNow = UPCOMING_CALLS.filter(c => c.datetime > TODAY)

  return (
    <div>
      {/* Upcoming */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Upcoming Calls</div><div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', marginBottom: 28, overflow: 'hidden' }}>
        {upcomingNow.length === 0 ? <div style={{ color: 'var(--text4)', fontSize: 13, padding: '20px 24px' }}>No upcoming calls scheduled</div> : upcomingNow.map((c, ci) => {
          const li = linkedinMap[c.name.toLowerCase()] || {}
          return (
            <div key={c.name} style={{ padding: '20px 24px', borderBottom: ci < upcomingNow.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--upcoming-card-name)', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--upcoming-card-meta)' }}>
                    <span style={{ color: 'var(--text2)' }}>{ICO.calendar}</span>
                    {c.date} · {c.time}
                  </div>
                </div>
                {c.confirmed
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: 20 }}>{ICO.check} Confirmed</div>
                  : <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '3px 8px', borderRadius: 20 }}>Not Confirmed</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <a href={c.meet} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563EB', fontWeight: 600 }}>{ICO.meet} Join Meet</a>
                {(c.linkedin || li.linkedin) && <><span style={{ color: 'var(--text2)' }}>·</span><a href={c.linkedin || li.linkedin} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#0A66C2', fontWeight: 600 }}>{ICO.linkedin} LinkedIn</a></>}
              </div>
            </div>
          )
        })}
        </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total Calls', value: total, suffix: '', sub: 'logged', color: '#60A5FA' },
          { label: 'Close Rate', value: closeRate, suffix: '%', sub: `${closed} closed`, color: '#34D399' },
          { label: 'Follow-ups', value: followUp, suffix: '', sub: 'open pipeline', color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card)', borderRadius: 12, padding: '22px 24px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4 }}>{typeof k.value === 'number' ? (Number.isInteger(k.value) ? k.value : k.value.toFixed(1)) : k.value}{k.suffix}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{k.sub}</div>
          </div>
        ))}
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '22px 24px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: avgQColor, lineHeight: 1, marginTop: 8 }}>{avgQ !== null ? avgQ : '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Lead Quality</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Objections</div>
          {OBJ_CATS.map(cat => {
            const count = catCounts[cat.key]; const w = (count/maxCat)*100
            return (
              <div key={cat.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{cat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? cat.color : '#333336', marginLeft: 8, flexShrink: 0 }}>{count}×</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${w}%`, background: cat.color, borderRadius: 2, opacity: count > 0 ? 1 : 0.15 }} />
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Lead Quality</div>
          {[5,4,3,2,1].map(q => {
            const count = qDist.find(d => d.score === q).count; const w = total > 0 ? (count/total)*100 : 0
            return (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: Q_COLORS[q], fontWeight: 700, width: 16, textAlign: 'right', flexShrink: 0 }}>{q}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', width: 44, flexShrink: 0 }}>{Q_LABELS[q]}</div>
                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${w}%`, background: Q_COLORS[q], borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Call log */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Call Log</div><div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        {filtered.length === 0
          ? <div style={{ color: 'var(--text4)', fontSize: 14, textAlign: 'center', padding: 48 }}>No calls in selected period</div>
          : [...filtered].reverse().map((r, i) => <CallCard key={i} r={r} linkedinMap={linkedinMap} />)}
      </div>
    </div>
  )
}
