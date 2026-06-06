import { useMemo, useState } from 'react'
import { TODAY, toDateStr, dateStr, normName } from '../utils/data'

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function nextBizDay(d) {
  const n = new Date(d); n.setDate(n.getDate()+1)
  if (n.getDay() === 6) n.setDate(n.getDate()+2)
  if (n.getDay() === 0) n.setDate(n.getDate()+1)
  return n
}

const ICO_CHECK = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const ICO_X     = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const ICO_FIRE  = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>

export default function Tasks({ data, onDailyStats, filter }) {
  const now = new Date(TODAY)
  const today = new Date(now)
  if (now.getHours() < 3) today.setDate(today.getDate() - 1)
  const todayStr = dateStr(today)


  const stats = useMemo(() => {
    if (!data) return null

    const allRows = []
    for (const sheet of [data.mar, data.apr, data.may, data.jun||[]]) {
      let ds = -1
      for (let i = 0; i < sheet.length; i++) { if (sheet[i] && sheet[i][1] === 'Name' && sheet[i][3] === 'Date') { ds = i+1; break } }
      if (ds < 0) continue
      for (let i = ds; i < sheet.length; i++) {
        const r = sheet[i]; if (!r || !r[3]) continue
        const d = toDateStr(r[3]); if (!d) continue
        allRows.push({ r, date: d })
      }
    }

    const dailyInitiated = {}, dailyFUDone = {}, dailyFUTotal = {}, dailyPFUDone = {}, dailyPFUTotal = {}

    const calDays = []
    { const start = new Date('2026-03-01T12:00:00'); const end = new Date(todayStr+'T12:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) { if (d.getDay() !== 0 && d.getDay() !== 6) calDays.push(dateStr(d)) } }

    allRows.forEach(x => { dailyInitiated[x.date] = (dailyInitiated[x.date]||0) + 1 })

    allRows.forEach(x => {
      const r = x.r
      const varN = String(r[4]||'').toLowerCase()
      if (varN.includes('inmail')) return
      const bookedDate = toDateStr(r[27])
      const hasPositiveReply = !!(r[14] && toDateStr(r[14]))

      if (!hasPositiveReply) {
        const fuDoneDate = r[5] ? toDateStr(r[5]) : null
        if ((r[6]||r[7]||r[8]||r[9]) && !fuDoneDate) return
        const dueDate = dateStr(nextBizDay(new Date(x.date+'T12:00:00')))
        if (bookedDate && bookedDate <= dueDate) return
        dailyFUTotal[dueDate] = (dailyFUTotal[dueDate]||0) + 1
        if (fuDoneDate === dueDate) dailyFUDone[dueDate] = (dailyFUDone[dueDate]||0) + 1
      } else {
        const replyDate = toDateStr(r[14]); if (!replyDate) return
        const slots = []
        for (let i = 0; i < 7; i++) {
          const v = (r[16+i]||'').toString().trim(); const sd = toDateStr(r[16+i])
          if (!v) slots.push({ date: null, text: false })
          else if (sd) slots.push({ date: sd, text: false })
          else slots.push({ date: null, text: true })
        }
        const slotDueDates = []; let prevDate = replyDate
        for (let i = 0; i < 7; i++) {
          const due = dateStr(nextBizDay(new Date(prevDate+'T12:00:00')))
          slotDueDates.push(due); prevDate = slots[i].date || due
        }
        const activeFrom = dateStr(nextBizDay(new Date(replyDate+'T12:00:00')))
        for (const D of calDays) {
          if (D < activeFrom) continue
          if (bookedDate && bookedDate <= D) break
          let endedAsOfD = false, filledAsOfD = 0
          for (let i = 0; i < 7; i++) {
            if (slots[i].text && slotDueDates[i] <= D) { endedAsOfD = true; break }
            if (slots[i].date && slots[i].date <= D) filledAsOfD++
          }
          if (endedAsOfD) break; if (filledAsOfD === 7) break
          dailyPFUTotal[D] = (dailyPFUTotal[D]||0) + 1
          for (let i = 0; i < 7; i++) { if (slots[i].date === D) { dailyPFUDone[D] = (dailyPFUDone[D]||0) + 1; break } }
        }
      }
    })

    const dailyFollowupTotal = {}, dailyFollowupDone = {}
    calDays.forEach(D => {
      const t = (dailyFUTotal[D]||0) + (dailyPFUTotal[D]||0)
      const d = (dailyFUDone[D]||0) + (dailyPFUDone[D]||0)
      if (t > 0) dailyFollowupTotal[D] = t
      if (d > 0) dailyFollowupDone[D] = d
    })

    const outreachCount = allRows.filter(x => x.date === todayStr).length
    const checkDate = todayStr
    const fuTotal = dailyFUTotal[checkDate]||0
    const fuDone = dailyFUDone[checkDate]||0
    const pfuTotal = dailyPFUTotal[checkDate]||0
    const pfuDone = dailyPFUDone[checkDate]||0

    // Streak
    let streak = 0
    for (let i = 89; i >= 1; i--) {
      const d = new Date(today); d.setDate(d.getDate()-i)
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const ds2 = dateStr(d)
      const initiated = dailyInitiated[ds2]||0
      const total = dailyFollowupTotal[ds2]||0
      const done = dailyFollowupDone[ds2]||0
      if (initiated >= 20 && (total === 0 || done >= total)) streak++
      else break
    }

    return { dailyInitiated, dailyFUTotal, dailyFUDone, dailyPFUTotal, dailyPFUDone, dailyFollowupTotal, dailyFollowupDone, outreachCount, fuTotal, fuDone, pfuTotal, pfuDone, streak, calDays, checkDate }
  }, [data])

  // Expose daily stats to parent for dashboard widget
  useMemo(() => {
    if (stats && onDailyStats) {
      onDailyStats({ fuToday: stats.fuTotal, fuDoneToday: stats.fuDone, pfuToday: stats.pfuTotal, pfuDoneToday: stats.pfuDone })
    }
  }, [stats])

  if (!stats) return null

  const { dailyInitiated, dailyFUTotal, dailyFUDone, dailyPFUTotal, dailyPFUDone, dailyFollowupTotal, dailyFollowupDone, outreachCount, fuTotal, fuDone, pfuTotal, pfuDone, streak, checkDate } = stats

  const checkDay = new Date(checkDate+'T12:00:00').getDay()
  const isCheckWeekend = checkDay === 0 || checkDay === 6
  const task1Done = outreachCount >= 20
  const task2Done = fuTotal === 0 || fuDone >= fuTotal
  const pfuTask3Done = pfuTotal === 0 || pfuDone >= pfuTotal
  const task1Color = task1Done ? '#34D399' : '#EF4444'
  const task2Color = task2Done ? '#34D399' : fuTotal === 0 ? '#555558' : '#EF4444'
  const pfuColor = pfuTask3Done ? (pfuTotal === 0 ? '#555558' : '#34D399') : '#EF4444'

  const NOT_TODAY = <span style={{ fontSize: 36, fontWeight: 900, color: '#333336', lineHeight: 1 }}>Not today</span>

  const AVAILABLE_MONTHS = ['2026-03', '2026-04', '2026-05', '2026-06']
  const showMonths = (filter === '30d') ? ['2026-05', '2026-06']
    : (filter === '7d' || filter === '14d' || filter === 'today' || filter === 'yesterday')
      ? [todayStr.slice(0, 7)]
      : AVAILABLE_MONTHS

  function buildDayCell(ds2, d) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const isToday = ds2 === todayStr
    const initiated = dailyInitiated[ds2]||0
    const total = dailyFollowupTotal[ds2]||0
    const done = dailyFollowupDone[ds2]||0
    const fuT = dailyFUTotal[ds2]||0; const fuD = dailyFUDone[ds2]||0
    const pfuT = dailyPFUTotal[ds2]||0; const pfuD = dailyPFUDone[ds2]||0
    const t1 = initiated >= 20
    const t2 = total === 0 || (done >= total)
    const complete = t1 && (isWeekend || t2)
    const partial = (t1 || (!isWeekend && t2)) && !complete

    let bg, textC, numC
    if (isWeekend)        { bg='#1e1e20'; textC='#444446'; numC='#444446' }
    else if (isToday)     { bg=complete?'#34D399':partial?'#F59E0B':'#EF4444'; textC='#000000'; numC='#00000099' }
    else if (complete)    { bg='#34D39930'; textC='#34D399'; numC='#34D39988' }
    else if (partial)     { bg='#F59E0B28'; textC='#F59E0B'; numC='#F59E0B88' }
    else if (initiated===0){ bg='#161618'; textC='#333336'; numC='#2a2a2c' }
    else                  { bg='#EF444420'; textC='#EF4444'; numC='#EF444488' }

    return (
      <div style={{ height: 120, borderRadius: 6, background: bg, padding: '8px 10px', outline: isToday ? '2px solid #FFFFFF' : 'none', outlineOffset: -2 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: textC }}>{d.getDate()}</div>
        {!isWeekend && (
          <div style={{ fontSize: 15, fontWeight: 700, color: numC, lineHeight: 1.5, marginTop: 6 }}>
            <div>{initiated > 0 ? <>{initiated}<span style={{ fontSize: 12, fontWeight: 400 }}>/20</span></> : <span style={{ opacity: 0.25 }}>—</span>}</div>
            {fuT > 0 && <div>{fuD}/{fuT}<span style={{ fontSize: 12, fontWeight: 400 }}> fu</span></div>}
            {pfuT > 0 && <div>{pfuD}/{pfuT}<span style={{ fontSize: 12, fontWeight: 400 }}> pfu</span></div>}
          </div>
        )}
      </div>
    )
  }

  function MonthGrid({ ym }) {
    const [yr, mo] = ym.split('-').map(Number)
    const firstDay = new Date(yr, mo-1, 1)
    const lastDay = new Date(yr, mo, 0)
    let dow = firstDay.getDay()
    const padStart = dow === 0 ? 6 : dow - 1
    const cells = []
    for (let i = 0; i < padStart; i++) cells.push(null)
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate()+1)) cells.push(new Date(d))
    while (cells.length % 7 !== 0) cells.push(null)
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#F3F4F6', marginBottom: 10, letterSpacing: '-0.02em' }}>{MONTHS_LONG[mo-1]} {yr}</div>
        <div style={{ background: '#161618', borderRadius: 12, padding: 16, border: '1px solid #222224' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
            {WDAYS.map(d => <div key={d} style={{ fontSize: 10, color: '#555558', textAlign: 'center', fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} style={{ height: 120 }} />
              const ds2 = dateStr(d)
              return <div key={ds2}>{buildDayCell(ds2, d)}</div>
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 14, marginBottom: 20, alignItems: 'start' }}>
        {/* Calendar */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555558', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Streak Calendar</div>
          {showMonths.map(ym => <MonthGrid key={ym} ym={ym} />)}
        </div>

        {/* Sidebar widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Outreach */}
          <div style={{ background: '#161618', borderRadius: 12, padding: '16px 18px', border: '1px solid #222224' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555558', letterSpacing: '0.08em' }}>OUTREACH</div>
              <div style={{ color: task1Color }}>{isCheckWeekend ? '' : task1Done ? ICO_CHECK : ICO_X}</div>
            </div>
            {isCheckWeekend ? NOT_TODAY : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: task1Color, lineHeight: 1 }}>{outreachCount}</span>
                  <span style={{ fontSize: 13, color: '#555558' }}>/ 20</span>
                </div>
                <div style={{ height: 4, background: '#222224', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.min(outreachCount/20*100,100)}%`, background: task1Color, borderRadius: 2 }} />
                </div>
              </>
            )}
          </div>

          {/* Followups */}
          <div style={{ background: '#161618', borderRadius: 12, padding: '16px 18px', border: '1px solid #222224' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555558', letterSpacing: '0.08em' }}>FOLLOWUPS</div>
              <div style={{ color: task2Color }}>{isCheckWeekend ? '' : task2Done ? ICO_CHECK : (fuTotal === 0 ? '' : ICO_X)}</div>
            </div>
            {isCheckWeekend ? NOT_TODAY : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: task2Color, lineHeight: 1 }}>{fuDone}</span>
                <span style={{ fontSize: 13, color: '#555558' }}>/ {fuTotal || '—'}</span>
              </div>
            )}
          </div>

          {/* Positive Followups */}
          <div style={{ background: '#161618', borderRadius: 12, padding: '16px 18px', border: '1px solid #222224' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555558', letterSpacing: '0.08em' }}>POSITIVE FOLLOWUPS</div>
              <div style={{ color: pfuColor }}>{isCheckWeekend ? '' : pfuTask3Done ? (pfuTotal === 0 ? '' : ICO_CHECK) : ICO_X}</div>
            </div>
            {isCheckWeekend ? NOT_TODAY : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: pfuColor, lineHeight: 1 }}>{pfuDone}</span>
                <span style={{ fontSize: 13, color: '#555558' }}>/ {pfuTotal || '—'}</span>
              </div>
            )}
          </div>

          {/* Streak */}
          <div style={{ background: '#161618', borderRadius: 12, padding: '14px 18px', border: '1px solid #222224' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ color: '#FB923C' }}>{ICO_FIRE}</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#F3F4F6' }}>{streak}</span>
              <span style={{ fontSize: 12, color: '#555558' }}>day streak</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['#34D39930', 'Complete'], ['#F59E0B28', 'Partial'], ['#EF444420', 'Missed']].map(([bg, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555558' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: bg, flexShrink: 0 }} />{lbl}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36, textAlign: 'center', color: '#222224', fontSize: 10 }}>
        MEDIACTIVE · DAILY TASKS · {TODAY.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}
