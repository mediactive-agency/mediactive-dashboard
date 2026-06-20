import { useMemo, useState } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { dateStr } from '../utils/data'

const PALETTE = ['#60A5FA', '#F472B6', '#FB923C', '#34D399', '#A78BFA', '#FBBF24', '#22D3EE', '#F87171', '#818CF8', '#4ADE80', '#E879F9', '#FACC15']

// Mezera mezi dvěma použitími delší než tolik dní přetrhne pruh na samostatné segmenty
const GAP_DAYS = 7

function fmtDate(ds) {
  if (!ds) return ''
  const [y, m, d] = ds.split('-')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

// Vezme unikátní seřazená data nasazení a rozdělí je na souvislé úseky —
// pauza delší než GAP_DAYS dní = nový segment (= kampaň byla na chvíli odložena a znovu spuštěna)
function buildSegments(sortedUniqueDates) {
  if (sortedUniqueDates.length === 0) return []
  const segments = []
  let segFrom = sortedUniqueDates[0]
  let segTo = sortedUniqueDates[0]
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const d = sortedUniqueDates[i]
    if (daysBetween(segTo, d) > GAP_DAYS) {
      segments.push({ from: segFrom, to: segTo })
      segFrom = d
      segTo = d
    } else {
      segTo = d
    }
  }
  segments.push({ from: segFrom, to: segTo })
  return segments
}

export default function Campaigns({ data, isMobile }) {
  const [hovered, setHovered] = useState(null)

  const campaigns = useMemo(() => {
    if (!data) return []
    const monthKeys = Object.keys(data).filter(k => k !== 'sales' && k !== 'calendly')
    const allRaw = monthKeys
      .flatMap(k => parseOutreachMonth(data[k]).rawRows)
      .filter(r => r.varName && r.date)

    const byVar = {}
    allRaw.forEach(r => {
      if (!byVar[r.varName]) byVar[r.varName] = { name: r.varName, dates: [], total: 0, msr: 0, prr: 0, abr: 0 }
      const v = byVar[r.varName]
      v.dates.push(r.date)
      v.total++
      if (r.hasMS) v.msr++
      if (r.hasB) v.prr++
      if (r.hasC) v.abr++
    })

    const list = Object.values(byVar).map(v => {
      const sortedUnique = Array.from(new Set(v.dates)).sort()
      const segments = buildSegments(sortedUnique)
      return {
        ...v,
        from: sortedUnique[0],
        to: sortedUnique[sortedUnique.length - 1],
        segments,
        msrPct: v.total > 0 ? +((v.msr / v.total) * 100).toFixed(1) : 0,
        prrPct: v.total > 0 ? +((v.prr / v.total) * 100).toFixed(1) : 0,
        abrPct: v.total > 0 ? +((v.abr / v.total) * 100).toFixed(1) : 0,
      }
    }).sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0)
      .map((v, i) => ({ ...v, color: PALETTE[i % PALETTE.length] }))

    return list
  }, [data])

  if (!data) return null

  if (campaigns.length === 0) {
    return (
      <div style={{ background: 'var(--card)', borderRadius: 18, padding: '60px 26px', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>No tagged campaigns found in the outreach data yet.</div>
      </div>
    )
  }

  const globalFrom = campaigns.reduce((min, s) => !min || s.from < min ? s.from : min, null)
  const globalTo = campaigns.reduce((max, s) => !max || s.to > max ? s.to : max, null)
  const totalSpan = Math.max(1, daysBetween(globalFrom, globalTo))

  const ticks = []
  if (globalFrom && globalTo) {
    const cursor = new Date(globalFrom)
    cursor.setDate(1)
    const end = new Date(globalTo)
    while (cursor <= end) {
      const ds = dateStr(cursor)
      if (ds >= globalFrom) {
        const pct = Math.min(100, Math.max(0, (daysBetween(globalFrom, ds) / totalSpan) * 100))
        ticks.push({ label: cursor.toLocaleDateString('en-US', { month: 'short' }), pct })
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  const rowHeight = isMobile ? 54 : 50
  const labelWidth = isMobile ? 110 : 190

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 16 }}>
        {[
          { label: 'Campaigns Tracked', value: campaigns.length, color: '#60A5FA' },
          { label: 'Active Span', value: `${totalSpan}d`, color: '#FBBF24' },
          { label: 'Best MSR', value: `${Math.max(...campaigns.map(s => s.msrPct))}%`, color: '#F472B6' },
          { label: 'Best ABR', value: `${Math.max(...campaigns.map(s => s.abrPct))}%`, color: '#34D399' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 18, padding: isMobile ? '20px 14px' : '24px 26px', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: isMobile ? 11 : 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Campaign Timeline</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>{fmtDate(globalFrom)} — {fmtDate(globalTo)}</div>
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: labelWidth, flexShrink: 0 }}>
            <div style={{ height: 24, marginBottom: 8 }} />
            {campaigns.map(s => (
              <div
                key={s.name}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  height: rowHeight, display: 'flex', alignItems: 'center', gap: 8,
                  paddingRight: 12, cursor: 'default',
                  opacity: hovered && hovered !== s.name ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.total} sent{s.segments.length > 1 ? ` · ${s.segments.length} runs` : ''}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={{ position: 'relative', height: 24, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
              {ticks.map((t, i) => (
                <div key={i} style={{ position: 'absolute', left: `${t.pct}%`, top: 0, fontSize: 11, color: 'var(--text3)', fontWeight: 600, transform: 'translateX(0)' }}>
                  {t.label}
                  <div style={{ position: 'absolute', top: 16, left: 0, width: 1, height: 6, background: 'var(--border2)' }} />
                </div>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              {ticks.map((t, i) => (
                <div key={i} style={{ position: 'absolute', left: `${t.pct}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)', opacity: 0.6 }} />
              ))}
              {campaigns.map(s => {
                const isHovered = hovered === s.name
                return (
                  <div
                    key={s.name}
                    onMouseEnter={() => setHovered(s.name)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ height: rowHeight, display: 'flex', alignItems: 'center', position: 'relative' }}
                  >
                    {s.segments.map((seg, segIdx) => {
                      const left = (daysBetween(globalFrom, seg.from) / totalSpan) * 100
                      const widthPct = Math.max(1.2, (daysBetween(seg.from, seg.to) / totalSpan) * 100)
                      return (
                        <div
                          key={segIdx}
                          title={`${s.name}: ${fmtDate(seg.from)} – ${fmtDate(seg.to)}`}
                          style={{
                            position: 'absolute', left: `${left}%`, width: `${widthPct}%`, minWidth: 10,
                            height: isHovered ? 18 : 14,
                            borderRadius: 9,
                            background: s.color,
                            opacity: hovered && !isHovered ? 0.35 : 0.92,
                            boxShadow: isHovered ? `0 0 0 3px ${s.color}33` : 'none',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          {!isMobile && widthPct > 14 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#0C0C0E', paddingLeft: 10, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                              {fmtDate(seg.from)} – {fmtDate(seg.to)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        {campaigns.map(s => (
          <div key={s.name} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { lbl: 'MSR', val: s.msrPct, color: '#F472B6' },
                { lbl: 'PRR', val: s.prrPct, color: '#FB923C' },
                { lbl: 'ABR', val: s.abrPct, color: '#34D399' },
              ].map(r => (
                <div key={r.lbl}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: r.color }}>{r.val}%</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
