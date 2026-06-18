import { useMemo, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TODAY, toDateStr, toSalesDateStr, inRange, normName, pct, dateStr, ago, todayStr } from '../utils/data'

export function parseOutreachMonth(rows) {
  let summary = null
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = rows[i]
    if (r && (r[1] === 'Total' || r[0] === 'Total')) {
      summary = { A: parseInt(r[2])||0, MS: parseInt(r[3])||0, B: parseInt(r[5])||0, C: parseInt(r[7])||0, D: parseInt(r[9])||0 }
      break
    }
  }
  let ds = -1
  for (let i = 0; i < rows.length; i++) { if (rows[i] && rows[i][1] === 'Name' && rows[i][3] === 'Date') { ds = i+1; break } }
  const rawRows = []
  if (ds > 0) {
    for (let i = ds; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[3]) continue
      const date = toDateStr(r[3])
      if (!date) continue
      const hasMS = r[10] === 'YES'
      const hasB = !!(r[14] && toDateStr(r[14]))
      const hasC = !!(r[27] && toDateStr(r[27]))
      const hasD = !!(r[40] && toDateStr(r[40]))
      const hasE = !!(r[28] && String(r[28]).trim())      // Calendly'd = AC
      const hasVSLB = !!(r[41] && String(r[41]).trim())  // VSL Booked = AP
      let followups = 0
      if (hasC) {
        const calendlyDate = toDateStr(r[27])
        for (let fi = 16; fi <= 22; fi++) { if (r[fi]) { const fd = toDateStr(r[fi]); if (fd && fd <= calendlyDate) followups++ } }
      }
      const daysToBook = hasC && r[3] && r[27] ? (() => { const d1 = new Date(toDateStr(r[3])); const d2 = new Date(toDateStr(r[27])); const diff = Math.round((d2-d1)/(1000*60*60*24)); return diff >= 0 ? diff : null })() : null
      const varName = r[4] ? normName(String(r[4]).trim()) : null
      rawRows.push({ date, hasMS, hasB, hasC, hasD, hasE, hasVSLB, followups, daysToBook, varName })
    }
  }
  if (!summary && rawRows.length > 0) {
    summary = {
      A: rawRows.length,
      MS: rawRows.filter(r => r.hasMS).length,
      B: rawRows.filter(r => r.hasB).length,
      C: rawRows.filter(r => r.hasC).length,
      D: rawRows.filter(r => r.hasD).length,
      E: rawRows.filter(r => r.hasE).length,
      VSLB: rawRows.filter(r => r.hasVSLB).length,
    }
  }
  return { summary, rawRows }
}

const VAR_TREND_COLORS = ['#60A5FA', '#F472B6', '#FB923C', '#34D399', '#A78BFA', '#FBBF24', '#F87171']

const OBJ_CATS = [
  { key: 'too_expensive',  label: 'Too Expensive',      color: '#EF4444' },
  { key: 'need_to_think',  label: 'Need to Think',      color: '#F97316' },
  { key: 'third_party',    label: '3rd Party Approval', color: '#F59E0B' },
  { key: 'burned_before',  label: 'Burned Before',      color: '#A78BFA' },
  { key: 'lack_of_trust',  label: 'Lack of Trust',      color: '#60A5FA' },
  { key: 'not_urgent',     label: 'Not Right Now',      color: 'var(--text4)' },
]

function normObj(raw) {
  const lower = raw.trim().toLowerCase()
  if (lower.startsWith('too expensive'))     return 'too_expensive'
  if (lower.startsWith('need to think'))     return 'need_to_think'
  if (lower.startsWith('3rd party'))         return 'third_party'
  if (lower.startsWith('burned before'))     return 'burned_before'
  if (lower.startsWith('lack of trust'))     return 'lack_of_trust'
  if (lower.startsWith('not right now'))     return 'not_urgent'
  const bp = (raw.split('(')[0]).toLowerCase().trim()
  const map = [
    ['too_expensive',  ['price','expensive','budget','cost','payment','money','fund','cash','financial']],
    ['need_to_think',  ['think','time','process','sleep','decide','decision','consider']],
    ['third_party',    ['partner','lawyer','husband','wife','cfo','approval','consult','family']],
    ['burned_before',  ['burned','scam','previous','past','bad experience','failed','waste']],
    ['lack_of_trust',  ['trust','case stud','nda','proof','guarantee','result','evidence','credential']],
    ['not_urgent',     ['not urgent','no need','no rush','future','not ready','not now','eventually','revisit']],
  ]
  for (const [key, pats] of map) { if (pats.some(p => bp.includes(p))) return key }
  return null
}

const ICONS = {
  initiated: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  seen:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  reply:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  booked:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  call:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01-.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  closed:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
}

const ARROW = <svg width="52" height="20" viewBox="0 0 60 20" fill="none" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="10" x2="52" y2="10"/><polyline points="44 3 52 10 44 17"/></svg>

function getGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague', hour: 'numeric', hour12: false }))
  if (h >= 5 && h < 12) return 'Good morning, Kryštof'
  if (h >= 12 && h < 18) return 'Good afternoon, Kryštof'
  if (h >= 18 && h < 22) return 'Good evening, Kryštof'
  return 'Good night, Kryštof'
}

export default function Dashboard({ data, filter, customFrom, customTo, vslMode = false, dailyStats, isMobile, isTablet, clientMode }) {
  const [selectedVars, setSelectedVars] = useState(['__all__'])
  const stats = useMemo(() => {
    if (!data) return null
    const M = {
      Mar: parseOutreachMonth(data.mar),
      Apr: parseOutreachMonth(data.apr),
      May: parseOutreachMonth(data.may),
      Jun: parseOutreachMonth(data.jun || []),
    }
    const allRaw = [...M.Mar.rawRows, ...M.Apr.rawRows, ...M.May.rawRows, ...M.Jun.rawRows]
    const filtered = filter === 'all' ? allRaw : allRaw.filter(r => inRange(r.date, filter, customFrom, customTo))
    const A = filtered.length
    const MS = filtered.filter(r => r.hasMS).length
    const B = filtered.filter(r => r.hasB).length
    const C = filtered.filter(r => r.hasC).length
    const D = filtered.filter(r => r.hasD).length
    const E = filtered.filter(r => r.hasE).length
    const VSLB = filtered.filter(r => r.hasVSLB).length

    const ALL_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
    const currentMonthIdx = new Date().getMonth()
    const MONTH_TO_KEY = { Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11, Jan:0, Feb:1 }
    const lastThree = ALL_MONTHS.filter(m => MONTH_TO_KEY[m] <= currentMonthIdx && M[m]).slice(-3)
    const monthlyPerf = lastThree.map(m => {
      const s = M[m] && M[m].summary; if (!s) return null
      return { month: m, ...s, msr: pct(s.MS, s.A), prr: pct(s.B, s.A), abr: pct(s.C, s.A) }
    }).filter(Boolean)

    // ---- Date-range-aware trend buckets (daily if range < 30 days, otherwise weekly) ----
    const allDates = filtered.map(r => r.date).filter(Boolean).sort()
    let rangeStart = null, rangeEnd = null
    if (filter === 'custom') {
      rangeStart = customFrom || (allDates[0] || null)
      rangeEnd = customTo || (allDates[allDates.length - 1] || null)
    } else if (filter === 'all') {
      rangeStart = allDates[0] || null
      rangeEnd = allDates[allDates.length - 1] || null
    } else {
      const map = { today: 0, yesterday: 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90 }
      const days = map[filter] ?? 30
      rangeStart = ago(days)
      rangeEnd = todayStr
    }

    const fmtShort = (ds) => { const [y, mo, d] = ds.split('-'); return `${d}.${mo}.` }

    let buckets = [] // [{ key, label, start, end }]
    if (rangeStart && rangeEnd) {
      const start = new Date(rangeStart)
      const end = new Date(rangeEnd)
      const spanDays = Math.max(1, Math.round((end - start) / 86400000) + 1)
      const useWeekly = spanDays >= 30
      if (useWeekly) {
        let cursor = new Date(start)
        while (cursor <= end) {
          const wStart = dateStr(cursor)
          const wEndDate = new Date(cursor); wEndDate.setDate(wEndDate.getDate() + 6)
          const wEnd = dateStr(wEndDate > end ? end : wEndDate)
          buckets.push({ key: wStart, label: fmtShort(wEnd), start: wStart, end: wEnd })
          cursor.setDate(cursor.getDate() + 7)
        }
      } else {
        let cursor = new Date(start)
        while (cursor <= end) {
          const ds = dateStr(cursor)
          buckets.push({ key: ds, label: fmtShort(ds), start: ds, end: ds })
          cursor.setDate(cursor.getDate() + 1)
        }
      }
    }

    function bucketAgg(rows) {
      return buckets.map(b => {
        const inBucket = rows.filter(r => r.date >= b.start && r.date <= b.end)
        const a = inBucket.length
        const ms = inBucket.filter(r => r.hasMS).length
        const b_ = inBucket.filter(r => r.hasB).length
        const c = inBucket.filter(r => r.hasC).length
        return { period: b.label, msr: a > 0 ? pct(ms, a) : null, prr: a > 0 ? pct(b_, a) : null, abr: a > 0 ? pct(c, a) : null }
      })
    }

    const monthlyTable = bucketAgg(filtered)

    // Per-variable trend across the same buckets (for "By Variable" toggle)
    const varTotals = {}
    filtered.forEach(r => { if (r.varName) varTotals[r.varName] = (varTotals[r.varName] || 0) + 1 })
    const allVariables = Object.keys(varTotals)
      .sort((a, b) => varTotals[b] - varTotals[a])
      .map(name => ({
        name,
        total: varTotals[name],
        series: bucketAgg(filtered.filter(r => r.varName === name)),
      }))

    const bookedRows = filtered.filter(r => r.hasC)
    const avgFollowups = bookedRows.length > 0 ? +(bookedRows.reduce((s, r) => s + r.followups, 0) / bookedRows.length).toFixed(1) : null
    const avgDaysToBook = bookedRows.filter(r => r.daysToBook !== null).length > 0
      ? Math.round(bookedRows.filter(r => r.daysToBook !== null).reduce((s, r) => s + r.daysToBook, 0) / bookedRows.filter(r => r.daysToBook !== null).length)
      : null

    const sf = (data.sales || []).slice(1).filter(r => r && r[0]).filter(r => inRange(toSalesDateStr(r[1]), filter, customFrom, customTo))
    const total = sf.length
    const closed = sf.filter(r => (r[5]||'').toLowerCase() === 'yes').length
    const followUp = sf.filter(r => (r[5]||'').toLowerCase() === 'follow-up').length
    const lost = sf.filter(r => (r[5]||'').toLowerCase() === 'no').length

    const objCounts = {}
    OBJ_CATS.forEach(c => objCounts[c.key] = 0)
    sf.forEach(r => {
      if (!r[4]) return
      String(r[4]||'').split('|').map(s => s.trim()).filter(s => s.length > 2).forEach(raw => {
        const key = normObj(raw); if (key) objCounts[key]++
      })
    })
    const topObj = OBJ_CATS.map(c => ({ ...c, count: objCounts[c.key] })).filter(c => c.count > 0).sort((a, b) => b.count - a.count)

    return { A, MS, B, C, D, E, VSLB, total, closed, followUp, lost, monthlyPerf, monthlyTable, allVariables, avgFollowups, avgDaysToBook, topObj }
  }, [data, filter, customFrom, customTo])

  if (!stats) return null

  const { A, MS, B, C, D, E, VSLB, total, closed, followUp, lost, monthlyPerf, monthlyTable, allVariables, avgFollowups, avgDaysToBook, topObj } = stats
  const top5Variables = allVariables.slice(0, 5)
  const otherVariables = allVariables.slice(5)

  const bookedCount = vslMode ? VSLB : C
  const funnelSteps = clientMode ? [
    { icon: ICONS.initiated, count: A,          label: 'Initiated',            color: '#60A5FA' },
    { icon: ICONS.seen,      count: MS,          label: 'Media Seen',           color: '#F472B6' },
    { icon: ICONS.reply,     count: B,           label: 'Positive Replies',     color: '#FB923C' },
    ...(vslMode ? [{ icon: ICONS.booked, count: E, label: "Calendly'd", color: '#34D399' }] : []),
    { icon: ICONS.booked,    count: bookedCount, label: 'Appointments Booked',  color: '#A855F7' },
  ] : [
    { icon: ICONS.initiated, count: A,          label: 'Initiated',            color: '#60A5FA' },
    { icon: ICONS.seen,      count: MS,         label: 'Media Seen',           color: '#F472B6' },
    { icon: ICONS.reply,     count: B,          label: 'Positive Replies',     color: '#FB923C' },
    ...(vslMode ? [{ icon: ICONS.booked, count: E, label: "Calendly'd", color: '#34D399' }] : []),
    { icon: ICONS.booked,    count: bookedCount, label: 'Appointments Booked', color: '#A855F7' },
    { icon: ICONS.call,      count: total,      label: 'Calls Held',           color: '#FBBF24' },
    { icon: ICONS.closed,    count: closed,     label: 'Closed',               color: '#34D399' },
  ]

  const rates = clientMode ? [
    { label: 'Media Seen Rate',          value: A > 0 ? +((MS/A)*100).toFixed(1) : 0, suffix: '%', sub: 'Initiated → Seen',     color: '#F472B6' },
    { label: 'Positive Reply Rate',      value: A > 0 ? +((B/A)*100).toFixed(1) : 0, suffix: '%', sub: 'Initiated → Replied',   color: '#FB923C' },
    { label: 'Appointment Booking Rate', value: A > 0 ? +((C/A)*100).toFixed(1) : 0, suffix: '%', sub: 'Initiated → Booked',    color: '#A855F7' },
  ] : [
    { label: 'Positive Reply Rate',      value: A > 0 ? +((B/A)*100).toFixed(1) : 0, suffix: '%', sub: 'Initiated → Replied',   color: '#FB923C' },
    { label: 'Avg Followups',            value: avgFollowups,                          suffix: 'x', sub: 'before booking',        color: '#A78BFA' },
    { label: 'Avg Days to Book',         value: avgDaysToBook,                         suffix: 'd', sub: 'from first contact',    color: '#FBBF24' },
    { label: 'Appointment Booking Rate', value: A > 0 ? +((bookedCount/A)*100).toFixed(1) : 0, suffix: '%', sub: 'Initiated → Booked',    color: '#A855F7' },
    { label: 'Show Up Rate',             value: C > 0 ? +((total/C)*100).toFixed(1) : 0, suffix: '%', sub: 'Booked → Held',     color: '#FBBF24' },
    { label: 'Call Close Rate',          value: total > 0 ? +((closed/total)*100).toFixed(1) : 0, suffix: '%', sub: 'Held → Closed', color: '#34D399' },
  ].filter(r => r.value !== null && r.value !== undefined)

  const s = card => ({ background: 'var(--card)', borderRadius: 12, padding: '20px 22px', boxShadow: 'var(--card-shadow)', ...card })

  // Today stats
  const now = new Date()
  const tod = new Date(now)
  if (now.getHours() < 3) tod.setDate(tod.getDate() - 1)
  const todStr = tod.getFullYear() + '-' + String(tod.getMonth()+1).padStart(2,'0') + '-' + String(tod.getDate()).padStart(2,'0')
  let outToday = 0
  for (const sheet of [data.mar, data.apr, data.may, data.jun || []]) {
    let ds = -1
    for (let i = 0; i < sheet.length; i++) { if (sheet[i] && sheet[i][1] === 'Name' && sheet[i][3] === 'Date') { ds = i+1; break } }
    if (ds < 0) continue
    for (let i = ds; i < sheet.length; i++) { const r = sheet[i]; if (!r || !r[3]) continue; if (toDateStr(r[3]) === todStr) outToday++ }
  }
  const isWeekend = new Date(todStr + 'T12:00:00').getDay() === 0 || new Date(todStr + 'T12:00:00').getDay() === 6
  const dd = dailyStats || { fuToday: 0, fuDoneToday: 0, pfuToday: 0, pfuDoneToday: 0, streak: 0 }
  const outColor = outToday >= 20 ? '#34D399' : outToday > 0 ? '#F59E0B' : '#EF4444'
  const fuColor = dd.fuToday === 0 ? '#34D399' : dd.fuDoneToday >= dd.fuToday ? '#34D399' : '#EF4444'
  const pfuColor = dd.pfuToday === 0 ? '#555558' : dd.pfuDoneToday >= dd.pfuToday ? '#34D399' : '#F59E0B'

  if (clientMode) return null

  return (
    <div>
      {/* Funnel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Full Sales Funnel</div>
        {isMobile ? (
          <div style={{ background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
            {funnelSteps.map((step, i) => {
              const pct = i < funnelSteps.length - 1 && step.count > 0
                ? +((funnelSteps[i+1].count / step.count) * 100).toFixed(1) + '%' : null
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 16 }}>
                    <div style={{ color: step.color, opacity: 0.8, flexShrink: 0 }}>{step.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{step.label}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.count.toLocaleString()}</div>
                    </div>
                    {pct && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{pct}</div>
                        <svg width="16" height="22" viewBox="0 0 16 28" fill="none" stroke="var(--text3)" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="8" y1="2" x2="8" y2="22"/>
                          <polyline points="2 16 8 23 14 16"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {i < funnelSteps.length - 1 && <div style={{ height: 1, background: 'var(--border)' }} />}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', borderRadius: 12, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
            {funnelSteps.map((step, i) => (
              <>
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '22px 8px', background: 'var(--card)' }}>
                  <div style={{ marginBottom: 8, opacity: 0.5, color: step.color }}>{step.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.count.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5, textAlign: 'center', lineHeight: 1.3 }}>{step.label}</div>
                </div>
                {i < funnelSteps.length - 1 && (
                  <div key={`a${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 2px', background: 'var(--card)', gap: 4, flexShrink: 0, width: 80 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                    {step.count > 0 ? +((funnelSteps[i+1].count / step.count) * 100).toFixed(1) + '%' : '—'}
                    </div>
                    {ARROW}
                  </div>
                )}
              </>
            ))}
          </div>
        )}
      </div>

            {/* Rate cards */}
      <div className="rate-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: 10, marginBottom: 20, width: '100%' }}>
        {rates.map(r => (
          <div key={r.label} style={{ background: 'var(--card)', borderRadius: 12, padding: isMobile ? '16px 14px' : '20px 20px', boxShadow: 'var(--card-shadow)', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: isMobile ? 11 : 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{r.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: r.color, lineHeight: 1, marginBottom: 10 }}>
              {r.value !== null ? (Number.isInteger(r.value) ? r.value : r.value) : '—'}{r.value !== null ? r.suffix : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's Tasks */}
      {!clientMode && <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Today's Tasks</div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {isWeekend
          ? ['Outreach', 'Followups', 'Pos. Followups'].map(l => (
            <div key={l} style={s({})}>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{l}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text5)', lineHeight: 1 }}>Not today</div>
            </div>
          ))
          : [
            { label: 'Outreach',      value: `${outToday}/20`, color: outColor, sub: outToday >= 20 ? 'Goal reached' : 'Messages sent' },
            { label: 'Followups',     value: `${dd.fuDoneToday}/${dd.fuToday || '—'}`, color: fuColor, sub: 'Due today' },
            { label: 'Pos. Followups',value: `${dd.pfuDoneToday}/${dd.pfuToday || '—'}`, color: pfuColor, sub: 'Active sequences' },
          ].map(k => (
            <div key={k.label} style={s({})}>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 8 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{k.sub}</div>
            </div>
          ))}
        <div style={s({})}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#FB923C' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg></span>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{dd.streak ?? 0}</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>days</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {(dd.streak ?? 0) === 0 ? "Let's get it" : (dd.streak ?? 0) < 3 ? 'You got this' : (dd.streak ?? 0) < 7 ? 'Keep it up' : (dd.streak ?? 0) < 14 ? "Keep 'em comin'" : (dd.streak ?? 0) < 30 ? 'Way to go' : 'Good shit'}
          </div>
        </div>
      </div>
      </>}

      {/* Rate Trends */}
      {monthlyTable.length > 1 && (
      <div style={{ background: 'var(--card)', borderRadius: 18, padding: '24px 26px', boxShadow: 'var(--card-shadow)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rate Trends</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
            {[{ name: '__all__', label: 'All', color: 'var(--text)' }, ...top5Variables.map((v, vi) => ({ name: v.name, label: v.name, color: VAR_TREND_COLORS[vi % VAR_TREND_COLORS.length] }))].map(chip => {
              const isSel = selectedVars.includes(chip.name)
              return (
                <button
                  key={chip.name}
                  onClick={() => setSelectedVars(prev => prev.includes(chip.name) ? prev.filter(n => n !== chip.name) : [...prev, chip.name])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, border: isSel ? `1px solid ${chip.color}` : '1px solid var(--border)',
                    borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: isSel ? `${chip.color}1f` : 'transparent', color: isSel ? chip.color : 'var(--text3)',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: chip.color, display: 'inline-block', flexShrink: 0 }} />
                  {chip.label}
                </button>
              )
            })}
            {otherVariables.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  value=""
                  onChange={(e) => { const name = e.target.value; if (name) setSelectedVars(prev => prev.includes(name) ? prev : [...prev, name]) }}
                  style={{
                    appearance: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 28px 6px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: 'var(--text3)',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2388888B' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  }}
                >
                  <option value="">Other ({otherVariables.length})</option>
                  {otherVariables.map(v => (
                    <option key={v.name} value={v.name} disabled={selectedVars.includes(v.name)}>
                      {v.name}{selectedVars.includes(v.name) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {selectedVars.length === 0 ? (
          <div style={{ color: 'var(--text4)', fontSize: 12, textAlign: 'center', padding: 20 }}>Select at least one chip above to see a trend</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 28 }}>
            {[
              { key: 'msr', label: 'MSR', color: '#F472B6' },
              { key: 'prr', label: 'PRR', color: '#FB923C' },
              { key: 'abr', label: 'ABR', color: '#34D399' },
            ].map(metric => {
              const allSelected = selectedVars.includes('__all__')
              const latestAllVal = allSelected ? [...monthlyTable].reverse().find(p => p[metric.key] !== null)?.[metric.key] : null
              return (
                <div key={metric.key}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: metric.color, lineHeight: 1 }}>{metric.label}</div>
                    {latestAllVal !== null && latestAllVal !== undefined && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text3)' }}>{latestAllVal}%</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                    {allSelected ? 'Overall, latest period' : 'By variable'}
                  </div>
                  <div style={{ width: '100%', height: isMobile ? 180 : 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedVars.length === 1 && selectedVars[0] === '__all__' ? (
                        <AreaChart data={monthlyTable} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={metric.color} stopOpacity={0.28} />
                              <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="period" stroke="var(--text4)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
                          <YAxis stroke="var(--text4)" fontSize={11} tickLine={false} axisLine={false} unit="%" width={44} />
                          <Tooltip
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: 'var(--text2)', fontWeight: 700, marginBottom: 4 }}
                            formatter={(value) => [value === null ? '—' : `${value}%`, metric.label]}
                          />
                          <Area type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.5} fill={`url(#fill-${metric.key})`} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                        </AreaChart>
                      ) : (
                        <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="period" type="category" allowDuplicatedCategory={false} stroke="var(--text4)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
                          <YAxis stroke="var(--text4)" fontSize={11} tickLine={false} axisLine={false} unit="%" width={44} />
                          <Tooltip
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: 'var(--text2)', fontWeight: 700, marginBottom: 4 }}
                            formatter={(value, name) => [value === null ? '—' : `${value}%`, name]}
                          />
                          {selectedVars.map(name => {
                            const isAll = name === '__all__'
                            const series = isAll ? monthlyTable : allVariables.find(x => x.name === name)?.series
                            if (!series) return null
                            const color = isAll ? 'var(--text)' : VAR_TREND_COLORS[allVariables.findIndex(x => x.name === name) % VAR_TREND_COLORS.length]
                            return (
                              <Line
                                key={name}
                                type="monotone"
                                data={series}
                                dataKey={metric.key}
                                name={isAll ? 'All' : name}
                                stroke={color}
                                strokeWidth={2}
                                dot={{ r: 2.5 }}
                                activeDot={{ r: 4.5 }}
                                connectNulls
                              />
                            )
                          })}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)' }}>Breakdown</div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : clientMode ? '1fr 1fr' : 'repeat(3,1fr)', gap: 12 }}>
        {/* Monthly */}
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Monthly Performance</div>
          {monthlyPerf.map((m, mi) => (
            <div key={m.month} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: mi < monthlyPerf.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--text2)', fontSize: 13 }}>{m.month} 2026</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }} className="monthly-stats-grid">
                 {[
                   { val: m.A,  lbl: 'INIT',    color: '#60A5FA' },
                   { val: m.MS, lbl: 'SEEN',    color: '#F472B6' },
                   { val: m.B,  lbl: 'REPLIES', color: '#FB923C' },
                   { val: m.C,  lbl: 'BOOKED',  color: '#34D399' },
                ].map(x => (
                  <div key={x.lbl} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: x.color }}>{x.val}</div>
                    <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>{x.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {clientMode && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Today's Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Outreach',      val: outToday, total: 20,      color: outToday >= 20 ? '#34D399' : '#EF4444' },
              { label: 'Followups',     val: dd.fuDoneToday,  total: dd.fuToday,  color: dd.fuToday === 0 ? 'var(--text4)' : dd.fuDoneToday >= dd.fuToday ? '#34D399' : '#EF4444' },
              { label: 'Pos. Followups',val: dd.pfuDoneToday, total: dd.pfuToday, color: dd.pfuToday === 0 ? 'var(--text4)' : dd.pfuDoneToday >= dd.pfuToday ? '#34D399' : '#F59E0B' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: t.color, lineHeight: 1 }}>
                  {t.val}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)' }}>/{t.total||'—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {!clientMode && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Pipeline Status</div>
          {[
            { l: 'Closed',    v: closed,   c: '#34D399' },
            { l: 'Follow-up', v: followUp,  c: '#F59E0B' },
            { l: 'Lost',      v: lost,      c: '#EF4444' },
          ].map(x => (
            <div key={x.l} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: isMobile ? 14 : 13, color: 'var(--text2)' }}>{x.l}</span>
                <span style={{ fontSize: isMobile ? 15 : 14, color: x.c, fontWeight: 600 }}>{x.v}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: total > 0 ? `${(x.v/total)*100}%` : 0, background: x.c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        )}
        {!clientMode && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Top Objections</div>
          {topObj.length === 0
            ? <div style={{ color: 'var(--text4)', fontSize: 12 }}>No data yet</div>
            : topObj.map(o => (
              <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: o.color, flexShrink: 0 }}>{o.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{o.label}</div>
              </div>
            ))}
        </div>
        )}
      </div>

    </div>
  )
}


