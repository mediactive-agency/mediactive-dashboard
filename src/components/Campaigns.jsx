import { useMemo, useState, useEffect, useRef } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { dateStr } from '../utils/data'
import { saveUserConfig } from '../hooks/useData'

const PALETTE = ['#60A5FA', '#F472B6', '#FB923C', '#34D399', '#A78BFA', '#FBBF24', '#22D3EE', '#F87171', '#818CF8', '#4ADE80', '#E879F9', '#FACC15']

// Mezera mezi dvěma použitími delší než tolik dní přetrhne pruh na samostatné segmenty
const GAP_DAYS = 7

// Definice typů kroků v pipeline:
// initiation — první zpráva, kterou nasazuju (vždy první krok, vlastní text)
// message    — další moje zpráva poslaná HNED po předchozí (bez čáry mezi nimi)
// followup   — moje zpráva poslaná až po čase (čára mezi nimi)
// reply      — událost "prospect odpověděl pozitivně" (jen značka, žádný text)
const STEP_TYPES = {
  initiation: { label: 'Initiation Message', color: '#60A5FA', hasText: true, lineBefore: false },
  message:    { label: 'Message',            color: 'var(--text)', hasText: true, lineBefore: false },
  followup:   { label: 'Follow-up Message',  color: 'var(--text)', hasText: true, lineBefore: true },
  reply:      { label: 'Prospect Positive Reply', color: '#FB923C', hasText: false, lineBefore: true },
}

function fmtDate(ds) {
  if (!ds) return ''
  const [y, m, d] = ds.split('-')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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

// Vrátí pipeline kroků pro danou kampaň. Pokud ještě neexistuje nový formát,
// zkusí ho postavit ze starého (initiation/reply text fields) — ať se stará testovací data neztratí.
function getPipeline(messages, name) {
  const m = messages[name]
  if (m?.pipeline) return m.pipeline
  const legacy = []
  if (m?.initiation) legacy.push({ id: 'legacy-init', type: 'initiation', text: m.initiation })
  if (m?.reply) {
    legacy.push({ id: 'legacy-reply-event', type: 'reply', text: '' })
    legacy.push({ id: 'legacy-reply-text', type: 'message', text: m.reply })
  }
  return legacy
}

// Počítá počet UNIKÁTNÍCH znění zprávy mezi kampaněmi (stejný text ve více kampaních = jeden typ)
function countDistinctTypes(messages, campaignNames, typeFilter) {
  const set = new Set()
  campaignNames.forEach(name => {
    getPipeline(messages, name).forEach(step => {
      if (!typeFilter.includes(step.type)) return
      const t = (step.text || '').trim()
      if (t) set.add(t)
    })
  })
  return set.size
}

function AddStepMenu({ onPick, onCancel }) {
  const options = [
    { type: 'reply', label: 'Prospect positive reply' },
    { type: 'message', label: 'Another message (mine)' },
    { type: 'followup', label: 'My follow-up' },
  ]
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)', padding: 6, zIndex: 10, minWidth: 200,
    }}>
      {options.map(o => (
        <button
          key={o.type}
          onClick={() => onPick(o.type)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
            color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '8px 10px', borderRadius: 7,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-active)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PlusButton({ onClick, open, children }) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
      <button
        onClick={onClick}
        style={{
          width: 30, height: 30, borderRadius: '50%', border: '1px dashed var(--border2)',
          background: 'var(--card)', color: 'var(--text3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
        }}
      >+</button>
      {children}
    </div>
  )
}

function PipelineStep({ step, onChangeText, onSaveText, onDelete, saved }) {
  const def = STEP_TYPES[step.type]
  return (
    <div style={{ position: 'relative' }}>
      {def.lineBefore && <div style={{ width: 2, height: 30, background: 'var(--border2)', margin: '0 auto' }} />}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={e => { const x = e.currentTarget.querySelector('.del-btn'); if (x) x.style.opacity = 1 }}
        onMouseLeave={e => { const x = e.currentTarget.querySelector('.del-btn'); if (x) x.style.opacity = 0 }}
      >
        <button
          className="del-btn"
          onClick={() => onDelete(step.id)}
          style={{
            position: 'absolute', top: 0, right: 0, opacity: 0, transition: 'opacity 0.15s',
            background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4,
          }}
          title="Remove step"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {def.hasText ? (
          <div style={{ paddingTop: def.lineBefore ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: def.color }}>{def.label}</div>
              {saved && <div style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>Saved</div>}
            </div>
            <textarea
              value={step.text || ''}
              onChange={e => onChangeText(step.id, e.target.value)}
              onBlur={onSaveText}
              placeholder="Paste the message text here..."
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13,
                background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', outline: 'none',
              }}
            />
          </div>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            borderRadius: 20, background: `${def.color}1A`, border: `1px solid ${def.color}55`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: def.color }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: def.color }}>{def.label}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignPanel({ campaign, messages, onAddStep, onChangeText, onSaveText, onDeleteStep, onClose, isMobile }) {
  const pipeline = getPipeline(messages, campaign.name)
  const [savedFlash, setSavedFlash] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  function handleSave(stepId) {
    onSaveText(campaign.name)
    setSavedFlash(stepId)
    setTimeout(() => setSavedFlash(null), 1500)
  }

  function handlePick(type) {
    onAddStep(campaign.name, type)
    setMenuOpen(false)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100dvh', width: isMobile ? '100%' : 440,
        background: 'var(--card)', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        overflowY: 'auto', padding: isMobile ? '18px 16px' : '24px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: campaign.color, flexShrink: 0 }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>{campaign.total} initiated · {fmtDate(campaign.from)} – {fmtDate(campaign.to)}</div>

        {pipeline.length === 0 ? (
          <button
            onClick={() => onAddStep(campaign.name, 'initiation')}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: '1px dashed var(--border2)',
              background: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            + Add Initiation Message
          </button>
        ) : (
          <>
            {pipeline.map(step => (
              <PipelineStep
                key={step.id}
                step={step}
                onChangeText={(id, v) => onChangeText(campaign.name, id, v)}
                onSaveText={() => handleSave(step.id)}
                onDelete={(id) => onDeleteStep(campaign.name, id)}
                saved={savedFlash === step.id}
              />
            ))}
            <PlusButton onClick={() => setMenuOpen(o => !o)} open={menuOpen}>
              {menuOpen && <AddStepMenu onPick={handlePick} onCancel={() => setMenuOpen(false)} />}
            </PlusButton>
          </>
        )}

        <div style={{ display: 'flex', gap: 16, marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          {[
            { lbl: 'MSR', val: campaign.msrPct, color: '#F472B6' },
            { lbl: 'PRR', val: campaign.prrPct, color: '#FB923C' },
            { lbl: 'ABR', val: campaign.abrPct, color: '#34D399' },
          ].map(r => (
            <div key={r.lbl}>
              <div style={{ fontSize: 16, fontWeight: 800, color: r.color }}>{r.val}%</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Campaigns({ data, user, config, isMobile }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState(config?.campaignMessages || {})
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && config?.campaignMessages) {
      setMessages(config.campaignMessages)
      initialized.current = true
    }
  }, [config?.campaignMessages])

  function persist(updated) {
    if (!user) return
    saveUserConfig(user.uid, { campaignMessages: updated }).catch(() => {})
  }

  function handleAddStep(name, type) {
    setMessages(prev => {
      const pipeline = [...getPipeline(prev, name), { id: makeId(), type, text: '' }]
      const updated = { ...prev, [name]: { pipeline } }
      persist(updated)
      return updated
    })
  }

  function handleChangeText(name, stepId, text) {
    setMessages(prev => {
      const pipeline = getPipeline(prev, name).map(s => s.id === stepId ? { ...s, text } : s)
      return { ...prev, [name]: { pipeline } }
    })
  }

  function handleSaveText(name) {
    setMessages(prev => { persist(prev); return prev })
  }

  function handleDeleteStep(name, stepId) {
    setMessages(prev => {
      const pipeline = getPipeline(prev, name).filter(s => s.id !== stepId)
      const updated = { ...prev, [name]: { pipeline } }
      persist(updated)
      return updated
    })
  }

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

  const campaignNames = campaigns.map(c => c.name)
  const initiationTypes = countDistinctTypes(messages, campaignNames, ['initiation'])
  const replyTypes = countDistinctTypes(messages, campaignNames, ['message', 'followup'])

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

  const rowHeight = isMobile ? 62 : 60
  const labelWidth = isMobile ? 110 : 190
  const selectedCampaign = selected ? campaigns.find(c => c.name === selected) : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 16 }}>
        {[
          { label: 'Campaigns Tracked', value: campaigns.length, color: '#60A5FA' },
          { label: 'Active Span', value: `${totalSpan}d`, color: '#FBBF24' },
          { label: 'Initiation Message Types', value: initiationTypes, color: '#60A5FA' },
          { label: 'Positive Reply Types', value: replyTypes, color: '#FB923C' },
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
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>{fmtDate(globalFrom)} — {fmtDate(globalTo)} · click a campaign for details</div>
        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ width: labelWidth, flexShrink: 0 }}>
            <div style={{ height: 24, marginBottom: 8 }} />
            {campaigns.map(s => (
              <div
                key={s.name}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(s.name)}
                style={{
                  height: rowHeight, display: 'flex', alignItems: 'center', gap: 8,
                  paddingRight: 12, cursor: 'pointer',
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
                    onClick={() => setSelected(s.name)}
                    style={{ height: rowHeight, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
                  >
                    {s.segments.map((seg, segIdx) => {
                      const left = (daysBetween(globalFrom, seg.from) / totalSpan) * 100
                      const widthPct = Math.max(1.2, (daysBetween(seg.from, seg.to) / totalSpan) * 100)
                      return (
                        <div
                          key={segIdx}
                          title={`${s.name}: ${fmtDate(seg.from)} – ${fmtDate(seg.to)}`}
                          style={{
                            position: 'absolute', left: `${left}%`, width: `${widthPct}%`, minWidth: 14,
                            height: isHovered ? 32 : 28,
                            borderRadius: 10,
                            background: s.color,
                            opacity: hovered && !isHovered ? 0.35 : 0.92,
                            boxShadow: isHovered ? `0 0 0 3px ${s.color}33` : 'none',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          {!isMobile && widthPct > 12 && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0C0C0E', paddingLeft: 12, whiteSpace: 'nowrap', overflow: 'hidden' }}>
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
          <div key={s.name} onClick={() => setSelected(s.name)} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)', cursor: 'pointer' }}>
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

      {selectedCampaign && (
        <CampaignPanel
          campaign={selectedCampaign}
          messages={messages}
          onAddStep={handleAddStep}
          onChangeText={handleChangeText}
          onSaveText={handleSaveText}
          onDeleteStep={handleDeleteStep}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
