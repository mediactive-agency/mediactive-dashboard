import { useMemo, useState } from 'react'
import { TODAY, toDateStr, inRange, normName, ago, todayStr } from '../utils/data'

const VAR_COLORS = {
  'Main acc — Normal':   '#60A5FA', '2nd acc — Normal':    '#A78BFA',
  'Main acc — Preview':  '#34D399', '2nd acc — Preview':   '#10B981',
  'InMails':             '#F59E0B', 'InMails — New Niche': '#FB923C',
  'Main acc — New Niche':'#F472B6', 'Main acc — Old Niche':'#FBBF24',
}
const getColor = n => VAR_COLORS[n] || '#88888B'

function parseRawVars(rows, filterFn) {
  let ds = -1
  for (let i = 0; i < rows.length; i++) { if (rows[i] && rows[i][1] === 'Name' && rows[i][3] === 'Date') { ds = i+1; break } }
  if (ds < 0) return {}
  const agg = {}
  for (let i = ds; i < rows.length; i++) {
    const r = rows[i]; if (!r || !r[3] || !r[4]) continue
    const date = toDateStr(r[3]); if (!date) continue
    if (!filterFn(date)) continue
    const varN = normName(String(r[4]||'').trim()); if (!varN) continue
    if (!agg[varN]) agg[varN] = { name: varN, A: 0, MS: 0, B: 0, C: 0, D: 0, fuTotal: 0, fuCount: 0, daysTotal: 0, daysCount: 0 }
    agg[varN].A++
    if (r[10] === 'YES') agg[varN].MS++
    if (r[14] && toDateStr(r[14])) agg[varN].B++
    if (r[27] && toDateStr(r[27])) {
      agg[varN].C++
      const cd = toDateStr(r[27]); let fu = 0
      for (let fi = 16; fi <= 22; fi++) { if (r[fi]) { const fd = toDateStr(r[fi]); if (fd && fd <= cd) fu++ } }
      agg[varN].fuTotal += fu; agg[varN].fuCount++
      const d1 = new Date(toDateStr(r[3])); const d2 = new Date(cd)
      const diff = Math.round((d2-d1)/(1000*60*60*24))
      if (diff >= 0) { agg[varN].daysTotal += diff; agg[varN].daysCount++ }
    }
    if (r[40] && toDateStr(r[40])) agg[varN].D++
  }
  return agg
}

function getLastUsed(allSheets, varN) {
  const allRows = allSheets.flat()
  let last = null
  for (const r of allRows) {
    if (!r || !r[4]) continue
    if (normName(String(r[4]||'').trim()) !== varN) continue
    const d = toDateStr(r[3]); if (d && (!last || d > last)) last = d
  }
  return last
}

const ARROW = (dimmed) => (
  <svg width="44" height="14" viewBox="0 0 50 14" fill="none">
    <line x1="0" y1="7" x2="42" y2="7" stroke={dimmed ? '#222224' : '#666669'} strokeWidth="1.5" strokeLinecap="round"/>
    <polyline points="35 2 42 7 35 12" stroke={dimmed ? '#222224' : '#666669'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function VarCard({ v, dimmed, selected, onToggle, isMobile }) {  // mobile-aware
  const steps = [
    { val: v.A, label: 'Initiated',  color: '#60A5FA' },
    { val: v.MS, label: 'Media Seen', color: '#F472B6' },
    { val: v.B, label: 'Replies',    color: '#FB923C' },
    { val: v.C, label: 'Booked',     color: '#A78BFA' },
  ]
  const rates = [
    { label: 'MSR', val: v.msr, color: '#F472B6', suffix: '%' },
    { label: 'PRR', val: v.prr, color: '#FB923C', suffix: '%' },
    { label: 'ABR', val: v.abr, color: '#A78BFA', suffix: '%' },
  ]
  const secRates = v.C > 0 ? [
    v.avgFu !== null ? { label: 'Avg FU', val: v.avgFu, suffix: 'x' } : null,
    v.avgDays !== null ? { label: 'Avg Days', val: v.avgDays, suffix: 'd' } : null,
  ].filter(Boolean) : []

  return (
    <div
      onClick={onToggle}
      style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, cursor: 'pointer', boxShadow: 'var(--card-shadow)', outline: selected ? '2px solid var(--text)' : 'none', outlineOffset: 2, transition: 'outline 0.15s' }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: dimmed ? 'var(--text4)' : 'var(--text)', marginBottom: 16 }}>
        {v.name}
        {dimmed && v.lastUsed && <span style={{ fontSize: 10, color: 'var(--text5)', fontWeight: 400, marginLeft: 10 }}>Last: {v.lastUsed}</span>}
      </div>
      {isMobile ? (
        <div>
          {steps.map((step, i) => {
            const pct = i < steps.length - 1 && step.val > 0
              ? +((steps[i+1].val / step.val)*100).toFixed(1)+'%' : null
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: dimmed ? 'var(--text4)' : 'var(--text3)', marginBottom: 3 }}>{step.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: dimmed ? 'var(--text5)' : step.color, lineHeight: 1 }}>{step.val.toLocaleString()}</div>
                  </div>
                  {pct && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: dimmed ? 'var(--text4)' : 'var(--text)' }}>{pct}</span>
                      <svg width="14" height="18" viewBox="0 0 14 22" fill="none" stroke={dimmed ? 'var(--text4)' : 'var(--text3)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="1" x2="7" y2="18"/><polyline points="2 13 7 19 12 13"/>
                      </svg>
                    </div>
                  )}
                </div>
                {i < steps.length - 1 && <div style={{ height: 1, background: 'var(--border)' }} />}
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[...rates, ...secRates].map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: dimmed ? 'var(--text5)' : r.color }}>{r.val}{r.suffix}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {steps.map((step, i) => (
            <>
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: dimmed ? 'var(--text5)' : step.color, lineHeight: 1 }}>{step.val.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: dimmed ? 'var(--text5)' : 'var(--text3)', whiteSpace: 'nowrap' }}>{step.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div key={`a${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, margin: '0 48px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: dimmed ? 'var(--text4)' : 'var(--text)', lineHeight: 1 }}>
                    {step.val > 0 ? +((steps[i+1].val / step.val) * 100).toFixed(1) + '%' : '—'}
                  </div>
                  {ARROW(dimmed)}
                </div>
              )}
            </>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 1, background: 'var(--border)', height: 44, margin: '0 28px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {rates.map((r, i) => (
            <>
              {i > 0 && <div key={`d${i}`} style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 20px', flexShrink: 0 }} />}
              <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: dimmed ? 'var(--text5)' : r.color, lineHeight: 1 }}>{r.val}{r.suffix}</div>
                <div style={{ fontSize: 10, color: dimmed ? 'var(--text5)' : 'var(--text4)', letterSpacing: '0.05em' }}>{r.label}</div>
              </div>
            </>
          ))}
          {secRates.length > 0 && (
            <>
              <div style={{ width: 1, height: 32, background: 'var(--bar-divider)', margin: '0 20px', flexShrink: 0 }} />
              {secRates.map((r, i) => (
                <>
                  {i > 0 && <div key={`sd${i}`} style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 16px', flexShrink: 0 }} />}
                  <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: dimmed ? 'var(--text5)' : 'var(--text3)', lineHeight: 1 }}>{r.val}{r.suffix}</div>
                    <div style={{ fontSize: 10, color: dimmed ? 'var(--text5)' : 'var(--text4)', letterSpacing: '0.05em' }}>{r.label}</div>
                  </div>
                </>
              ))}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default function Outreach({ data, filter, customFrom, customTo, isMobile }) {
  const [selected, setSelected] = useState(new Set())

  const { activeVars, inactiveVars, tot } = useMemo(() => {
    if (!data) return { activeVars: [], inactiveVars: [], tot: { A:0,MS:0,B:0,C:0 } }

    const allSheets = [data.mar, data.apr, data.may, data.jun||[]]
    const cutoff14 = ago(14)

    let aggMap = {}
    const useRaw = ['14d','7d','yesterday','today','custom'].includes(filter)
    const monthRanges = { Mar: ['2026-03-01','2026-03-31'], Apr: ['2026-04-01','2026-04-30'], May: ['2026-05-01','2026-05-31'], Jun: ['2026-06-01','2026-06-30'] }

    if (useRaw) {
      let filterFn
      switch(filter) {
        case 'today':     filterFn = d => d === todayStr; break
        case 'yesterday': filterFn = d => d === ago(1); break
        case '7d':        filterFn = d => d >= ago(7); break
        case '14d':       filterFn = d => d >= ago(14); break
        case 'custom':    filterFn = d => (!customFrom || d >= customFrom) && (!customTo || d <= customTo); break
        default:          filterFn = () => true
      }
      for (const sheet of allSheets) {
        const vars = parseRawVars(sheet, filterFn)
        for (const [name, v] of Object.entries(vars)) {
          if (!aggMap[name]) aggMap[name] = { name, A:0, MS:0, B:0, C:0, D:0, fuTotal:0, fuCount:0, daysTotal:0, daysCount:0 }
          for (const k of ['A','MS','B','C','D','fuTotal','fuCount','daysTotal','daysCount']) aggMap[name][k] += v[k]
        }
      }
    } else {
      const from = filter === 'all' ? null : filter === '90d' ? ago(90) : ago(30)
      const filterFn = from ? (d => d >= from) : () => true
      const months = ['Mar','Apr','May','Jun']
      const sheetMap = { Mar: data.mar, Apr: data.apr, May: data.may, Jun: data.jun||[] }
      for (const m of months) {
        const [start, end] = monthRanges[m]
        if (from && end < from) continue
        const vars = parseRawVars(sheetMap[m], filterFn)
        for (const [name, v] of Object.entries(vars)) {
          if (!aggMap[name]) aggMap[name] = { name, A:0, MS:0, B:0, C:0, D:0, fuTotal:0, fuCount:0, daysTotal:0, daysCount:0 }
          for (const k of ['A','MS','B','C','D','fuTotal','fuCount','daysTotal','daysCount']) aggMap[name][k] += v[k]
        }
      }
    }

    const vars = Object.values(aggMap).filter(v => v.A > 0).sort((a,b) => b.A - a.A).map(v => {
      const lastUsed = getLastUsed(allSheets, v.name)
      const isAlwaysActive = v.name === 'InMails'
      const isActive = filter === 'all' || isAlwaysActive || !lastUsed || lastUsed >= cutoff14
      return { ...v, lastUsed, isActive,
        msr: v.A > 0 ? +((v.MS/v.A)*100).toFixed(1) : 0,
        prr: v.A > 0 ? +((v.B/v.A)*100).toFixed(1) : 0,
        abr: v.A > 0 ? +((v.C/v.A)*100).toFixed(1) : 0,
        avgFu: v.fuCount > 0 ? +(v.fuTotal/v.fuCount).toFixed(1) : null,
        avgDays: v.daysCount > 0 ? Math.round(v.daysTotal/v.daysCount) : null,
      }
    })

    const tot = vars.reduce((acc, v) => ({ A: acc.A+v.A, MS: acc.MS+v.MS, B: acc.B+v.B, C: acc.C+v.C }), { A:0,MS:0,B:0,C:0 })
    const totFuTotal = vars.reduce((s,v) => s+(v.fuTotal||0), 0)
    const totFuCount = vars.reduce((s,v) => s+(v.fuCount||0), 0)
    const totDaysTotal = vars.reduce((s,v) => s+(v.daysTotal||0), 0)
    const totDaysCount = vars.reduce((s,v) => s+(v.daysCount||0), 0)
    tot.avgFu = totFuCount > 0 ? +(totFuTotal/totFuCount).toFixed(1) : null
    tot.avgDays = totDaysCount > 0 ? Math.round(totDaysTotal/totDaysCount) : null
    tot.msr = tot.A > 0 ? +((tot.MS/tot.A)*100).toFixed(1) : 0
    tot.prr = tot.A > 0 ? +((tot.B/tot.A)*100).toFixed(1) : 0
    tot.abr = tot.A > 0 ? +((tot.C/tot.A)*100).toFixed(1) : 0

    return { activeVars: vars.filter(v => v.isActive), inactiveVars: vars.filter(v => !v.isActive), tot }
  }, [data, filter, customFrom, customTo])

  function toggle(name) {
    setSelected(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next })
  }

  // Combined selected
  const selVars = [...activeVars, ...inactiveVars].filter(v => selected.has(v.name))
  const agg = selVars.reduce((acc, v) => ({ A: acc.A+v.A, MS: acc.MS+v.MS, B: acc.B+v.B, C: acc.C+v.C }), { A:0,MS:0,B:0,C:0 })

  const ICONS_OUT = {
    initiated: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    seen:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    reply:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    booked:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  }
  const mainSteps = [
    { val: tot.A,  label: 'Initiated',    color: '#60A5FA', icon: ICONS_OUT.initiated },
    { val: tot.MS, label: 'Media Seen',   color: '#F472B6', icon: ICONS_OUT.seen },
    { val: tot.B,  label: 'Pos. Replies', color: '#FB923C', icon: ICONS_OUT.reply },
    { val: tot.C,  label: 'Appt. Booked', color: '#A78BFA', icon: ICONS_OUT.booked },
  ]
  const mainRates = [
    { label: 'MSR', val: tot.msr, color: '#F472B6', suffix: '%' },
    { label: 'PRR', val: tot.prr, color: '#FB923C', suffix: '%' },
    { label: 'ABR', val: tot.abr, color: '#A78BFA', suffix: '%' },
  ]

  const Divider = ({ label, dim }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim ? '#2a2a2c' : '#666669' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div>
      <Divider label="Total Active Funnel" />
      <div style={{ borderRadius: 12, marginBottom: 20, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
        {tot.A === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text5)', fontSize: 12 }}>No data for selected period</div>
          : isMobile ? (
            <div style={{ width: '100%', background: 'var(--card)' }}>
              {mainSteps.map((step, i) => {
                const pct = i < mainSteps.length - 1 && step.val > 0
                  ? +((mainSteps[i+1].val / step.val)*100).toFixed(1)+'%' : null
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 16 }}>
                      <div style={{ color: step.color, opacity: 0.8, flexShrink: 0 }}>{step.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{step.label}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.val.toLocaleString()}</div>
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
                    {i < mainSteps.length - 1 && <div style={{ height: 1, background: 'var(--border)', marginLeft: 0 }} />}
                  </div>
                )
              })}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 0, padding: '14px 20px', display: 'flex', gap: 20 }}>
                {mainRates.map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.06em' }}>{r.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{r.val}{r.suffix}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', padding: '0 24px' }}>
            {/* Funnel steps */}
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {mainSteps.map((step, i) => (
                <>
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '22px 16px', background: 'var(--card)' }}>
                    <div style={{ marginBottom: 8, opacity: 0.5, color: step.color }}>{step.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.val.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, textAlign: 'center', lineHeight: 1.3 }}>{step.label}</div>
                  </div>
                  {i < mainSteps.length - 1 && (
                    <div key={`a${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', gap: 4, flexShrink: 0, width: 80 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                        {step.val > 0 ? +((mainSteps[i+1].val/step.val)*100).toFixed(1)+'%' : '—'}
                      </div>
                      {ARROW(false)}
                    </div>
                  )}
                </>
              ))}
            </div>
            {/* Space between - pushes stats to right */}
            <div style={{ flex: 1 }} />
            {/* Separator */}
            <div style={{ width: 1, background: 'var(--border)', height: 44, margin: '0 28px', flexShrink: 0 }} />
            {/* Stats - MSR PRR ABR */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {mainRates.map((r, i) => (
                <>
                  {i > 0 && <div key={`d${i}`} style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 20px', flexShrink: 0 }} />}
                  <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: r.color, lineHeight: 1 }}>{r.val}{r.suffix}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.05em' }}>{r.label}</div>
                  </div>
                </>
              ))}
              {(tot.avgFu !== null || tot.avgDays !== null) && (
                <>
                  <div style={{ width: 1, height: 32, background: 'var(--bar-divider)', margin: '0 20px', flexShrink: 0 }} />
                  {[tot.avgFu !== null ? { label: 'Avg FU', val: tot.avgFu, suffix: 'x' } : null, tot.avgDays !== null ? { label: 'Avg Days', val: tot.avgDays, suffix: 'd' } : null].filter(Boolean).map((r, i) => (
                    <>
                      {i > 0 && <div key={`sd${i}`} style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 16px', flexShrink: 0 }} />}
                      <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text3)', lineHeight: 1 }}>{r.val}{r.suffix}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.05em' }}>{r.label}</div>
                      </div>
                    </>
                  ))}
                </>
              )}
            </div>
          </div>
          )}
      </div>

      <Divider label="By Variable — click to compare" />

      {selected.size > 0 && (
        <div style={{ background: 'var(--upcoming-card-bg)', borderRadius: 12, padding: '16px 22px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--selected-text)', marginBottom: 12, letterSpacing: '0.08em', fontWeight: 600 }}>SELECTED VARIABLES — COMBINED</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {[{ val:agg.A,label:'Initiated',color:'#60A5FA'},{val:agg.MS,label:'Media Seen',color:'#F472B6'},{val:agg.B,label:'Replies',color:'#FB923C'},{val:agg.C,label:'Booked',color:'#A78BFA'}].map((step,i,arr) => (
                <>
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: step.color, lineHeight: 1 }}>{step.val.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', whiteSpace: 'nowrap' }}>{step.label}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div key={`sa${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, margin: isMobile ? '0 12px' : '0 48px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--selected-text)', lineHeight: 1 }}>{step.val > 0 ? +((arr[i+1].val/step.val)*100).toFixed(1)+'%' : '—'}</div>
                      <svg width="44" height="14" viewBox="0 0 50 14" fill="none"><line x1="0" y1="7" x2="42" y2="7" stroke="#AAAAAA" strokeWidth="1.5" strokeLinecap="round"/><polyline points="35 2 42 7 35 12" stroke="#AAAAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </>
              ))}
            </div>
            <div style={{ width: 1, background: '#DDDDDD', height: 44, margin: '0 28px' }} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {[
                { label:'MSR', val: agg.A>0 ? +((agg.MS/agg.A)*100).toFixed(1):0, color:'#F472B6' },
                { label:'PRR', val: agg.A>0 ? +((agg.B/agg.A)*100).toFixed(1):0, color:'#FB923C' },
                { label:'ABR', val: agg.A>0 ? +((agg.C/agg.A)*100).toFixed(1):0, color:'#A78BFA' },
              ].map((r,i) => (
                <>
                  {i > 0 && <div key={`rd${i}`} style={{ width: 1, height: 36, background: 'var(--border2)', margin: '0 20px' }} />}
                  <div key={r.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: r.color, lineHeight: 1 }}>{r.val}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{r.label}</div>
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeVars.length > 0 ? activeVars.map(v => <VarCard key={v.name} v={v} dimmed={false} selected={selected.has(v.name)} onToggle={() => toggle(v.name)} isMobile={isMobile} />) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text5)', fontSize: 12 }}>No data for selected period</div>}

      {inactiveVars.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text5)' }}>Inactive — not used in last 14d</div>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          {inactiveVars.map(v => <VarCard key={v.name} v={v} dimmed={true} selected={selected.has(v.name)} onToggle={() => toggle(v.name)} isMobile={isMobile} />)}
        </>
      )}
    </div>
  )
}
