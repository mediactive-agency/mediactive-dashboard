import { useMemo } from 'react'
import { TODAY, toDateStr, dateStr } from '../utils/data'

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function nextBizDay(d) {
  const n = new Date(d); n.setDate(n.getDate()+1)
  if (n.getDay() === 6) n.setDate(n.getDate()+2)
  if (n.getDay() === 0) n.setDate(n.getDate()+1)
  return n
}

const ICO_CHECK = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const ICO_X     = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const ICO_FIRE  = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>

export default function Tasks({ stats, filter, isMobile, dailyGoal = 20 }) {
  if (!stats) return null

  const { dailyInitiated, dailyFUTotal, dailyFUDone, dailyPFUTotal, dailyPFUDone, dailyFollowupTotal, dailyFollowupDone, outreachCount, fuTotal, fuDone, pfuTotal, pfuDone, streak, todayStr, today } = stats

  const checkDay = new Date(todayStr+'T12:00:00').getDay()
  const isCheckWeekend = checkDay === 0 || checkDay === 6
  const task1Done = outreachCount >= dailyGoal
  const task2Done = fuTotal === 0 || fuDone >= fuTotal
  const pfuTask3Done = pfuTotal === 0 || pfuDone >= pfuTotal
  const task1Color = task1Done ? '#34D399' : '#EF4444'
  const task2Color = task2Done ? '#34D399' : fuTotal === 0 ? 'var(--text4)' : '#EF4444'
  const pfuColor = pfuTask3Done ? (pfuTotal === 0 ? 'var(--text4)' : '#34D399') : '#EF4444'
  const NOT_TODAY = <span style={{ fontSize: 24, fontWeight: 500, color: 'var(--text4)', lineHeight: 1 }}>Not today</span>

  const AVAILABLE_MONTHS = ['2026-03', '2026-04', '2026-05', '2026-06']
  const showMonths = (filter === '30d') ? ['2026-05', '2026-06']
    : (filter === '7d' || filter === '14d' || filter === 'today' || filter === 'yesterday') ? [todayStr.slice(0, 7)]
    : AVAILABLE_MONTHS

  const cellH = isMobile ? 64 : 90

  function buildDayCell(ds2, d) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const isToday = ds2 === todayStr
    const initiated = dailyInitiated[ds2]||0
    const total = dailyFollowupTotal[ds2]||0, done = dailyFollowupDone[ds2]||0
    const fuT = dailyFUTotal[ds2]||0, fuD = dailyFUDone[ds2]||0
    const pfuT = dailyPFUTotal[ds2]||0, pfuD = dailyPFUDone[ds2]||0
    const t1 = initiated >= dailyGoal, t2 = total === 0 || done >= total
    const complete = t1 && (isWeekend || t2), partial = (t1 || (!isWeekend && t2)) && !complete
    let bg, textC, numC
    if (isWeekend)         { bg='var(--cal-weekend)'; textC='var(--cal-weekend-text)'; numC='var(--cal-weekend-text)' }
    else if (complete)     { bg='#34D39918'; textC='#34D399'; numC='#34D399' }
    else if (partial)      { bg='#F59E0B16'; textC='#F59E0B'; numC='#F59E0B' }
    else if (initiated===0){ bg='var(--card)'; textC='var(--text5)'; numC='var(--border2)' }
    else                   { bg='#EF444414'; textC='#EF4444'; numC='#EF4444' }
    return (
      <div style={{ height: cellH, borderRadius: 6, background: bg, padding: isMobile ? '5px 5px' : '7px 8px', outline: isToday ? '2px solid var(--text)' : 'none', outlineOffset: -2, overflow: 'hidden' }}>
        <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: textC, lineHeight: 1 }}>{d.getDate()}</div>
        {!isWeekend && (
          <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, color: numC, lineHeight: 1.5, marginTop: 4 }}>
            <div>{initiated > 0 ? <>{initiated}<span style={{ fontWeight: 400, opacity: 0.7 }}>/{dailyGoal}</span></> : <span style={{ opacity: 0.2 }}>—</span>}</div>
            {fuT > 0 && <div>{fuD}/{fuT}<span style={{ fontWeight: 400, opacity: 0.7 }}> fu</span></div>}
            {pfuT > 0 && <div>{pfuD}/{pfuT}<span style={{ fontWeight: 400, opacity: 0.7 }}> pfu</span></div>}
          </div>
        )}
      </div>
    )
  }

  function MonthGrid({ ym }) {
    const [yr, mo] = ym.split('-').map(Number)
    const firstDay = new Date(yr, mo-1, 1), lastDay = new Date(yr, mo, 0)
    const padStart = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const cells = []
    for (let i = 0; i < padStart; i++) cells.push(null)
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate()+1)) cells.push(new Date(d))
    while (cells.length % 7 !== 0) cells.push(null)
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' }}>{MONTHS_LONG[mo-1]} {yr}</div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: isMobile ? 10 : 14, border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 2 : 4, marginBottom: 4 }}>
            {WDAYS.map(d => <div key={d} style={{ fontSize: isMobile ? 8 : 10, color: 'var(--text4)', textAlign: 'center', fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 2 : 4 }}>
            {cells.map((d, i) => { if (!d) return <div key={`e${i}`} style={{ height: cellH }} />; const ds2 = dateStr(d); return <div key={ds2}>{buildDayCell(ds2, d)}</div> })}
          </div>
        </div>
      </div>
    )
  }

  const TaskCard = ({ label, color, checkIcon, value, total, showBar }) => (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ color }}>{checkIcon}</div>
      </div>
      {isCheckWeekend ? NOT_TODAY : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: showBar ? 10 : 0 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 16, color: 'var(--text3)' }}>/ {total || '—'}</span>
          </div>
          {showBar && <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}><div style={{ height: '100%', width: `${Math.min((value/(total||1))*100,100)}%`, background: color, borderRadius: 3 }} /></div>}
        </>
      )}
    </div>
  )

  const StreakCard = () => (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Streak</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: '#FB923C' }}>{ICO_FIRE}</span>
        <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{streak}</span>
        <span style={{ fontSize: 14, color: 'var(--text3)' }}>days</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[['#34D39930','#34D399','Done'],['#F59E0B28','#F59E0B','Partial'],['#EF444420','#EF4444','Missed']].map(([bg,c,lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text4)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: bg, border: `1px solid ${c}40`, flexShrink: 0 }} />{lbl}
          </div>
        ))}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <StreakCard />
          <TaskCard label="Outreach" color={task1Color} checkIcon={isCheckWeekend ? null : task1Done ? ICO_CHECK : ICO_X} value={outreachCount} total={dailyGoal} showBar={true} />
          <TaskCard label="Followups" color={task2Color} checkIcon={isCheckWeekend ? null : task2Done ? ICO_CHECK : (fuTotal === 0 ? null : ICO_X)} value={fuDone} total={fuTotal} showBar={false} />
          <TaskCard label="Pos. Followups" color={pfuColor} checkIcon={isCheckWeekend ? null : pfuTask3Done ? (pfuTotal === 0 ? null : ICO_CHECK) : ICO_X} value={pfuDone} total={pfuTotal} showBar={false} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Streak Calendar</div>
        {showMonths.map(ym => <MonthGrid key={ym} ym={ym} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Streak Calendar</div>
        {showMonths.map(ym => <MonthGrid key={ym} ym={ym} />)}
      </div>
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
        <StreakCard />
        <TaskCard label="Outreach" color={task1Color} checkIcon={isCheckWeekend ? null : task1Done ? ICO_CHECK : ICO_X} value={outreachCount} total={dailyGoal} showBar={true} />
        <TaskCard label="Followups" color={task2Color} checkIcon={isCheckWeekend ? null : task2Done ? ICO_CHECK : (fuTotal === 0 ? null : ICO_X)} value={fuDone} total={fuTotal} showBar={false} />
        <TaskCard label="Pos. Followups" color={pfuColor} checkIcon={isCheckWeekend ? null : pfuTask3Done ? (pfuTotal === 0 ? null : ICO_CHECK) : ICO_X} value={pfuDone} total={pfuTotal} showBar={false} />
      </div>
    </div>
  )
}
