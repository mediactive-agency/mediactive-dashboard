import { useMemo, useState, useEffect, useRef } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { dateStr } from '../utils/data'
import { saveUserConfig } from '../hooks/useData'

const PALETTE = ['#60A5FA', '#F472B6', '#FB923C', '#34D399', '#A78BFA', '#FBBF24', '#22D3EE', '#F87171', '#818CF8', '#4ADE80', '#E879F9', '#FACC15']

// Mezera mezi dvěma použitími delší než tolik dní přetrhne pruh na samostatné segmenty
const GAP_DAYS = 7

// Definice typů kroků v pipeline:
// initiation — první zpráva, kterou nasazuju (vždy první krok, vlastní text, bublina vpravo)
// message    — další moje zpráva poslaná HNED po předchozí (bez čáry mezi nimi, bublina vpravo)
// followup   — moje zpráva poslaná až po čase (čára mezi nimi, bublina vpravo)
// reply      — událost "prospect odpověděl pozitivně" (jen značka, žádný text, bublina vlevo)
const STEP_TYPES = {
  initiation: { label: 'Initiation',        color: '#60A5FA', hasText: true,  lineBefore: false, side: 'right' },
  message:    { label: 'Message',           color: '#9CA3AF', hasText: true,  lineBefore: false, side: 'right' },
  followup:   { label: 'Follow-up',         color: '#9CA3AF', hasText: true,  lineBefore: true,  side: 'right' },
  reply:      { label: 'Prospect Positive Reply', color: '#FB923C', hasText: false, lineBefore: true, side: 'left' },
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

function IconBtn({ onClick, title, disabled, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--text5)' : 'var(--text3)', padding: 4, display: 'flex',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}

const ICON = {
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>,
  up: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  down: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
}

function AddStepMenu({ onPick }) {
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

function PlusButton({ onClick, children }) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
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

function PipelineStep({ step, index, total, editing, onEdit, onChangeText, onConfirm, onDelete, onMoveUp, onMoveDown, justAdded }) {
  const def = STEP_TYPES[step.type]
  const isRight = def.side === 'right'
  const align = isRight ? 'flex-end' : 'flex-start'

  return (
    <div>
      {def.lineBefore && index > 0 && <div style={{ width: 2, height: 28, background: 'var(--border2)', margin: '0 auto' }} />}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, marginTop: index === 0 ? 0 : 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: def.color, marginBottom: 4, padding: '0 2px' }}>
          {def.label}
        </div>

        {editing ? (
          <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              autoFocus={justAdded}
              value={step.text || ''}
              onChange={e => onChangeText(e.target.value)}
              placeholder="Paste the message text here..."
              rows={3}
              style={{
                flex: 1, resize: 'vertical', fontFamily: 'inherit', fontSize: 13,
                background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 10px', outline: 'none',
              }}
            />
            <button
              onClick={onConfirm}
              title="Confirm"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#34D399',
                color: '#0C0C0E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {ICON.check}
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: align }}>
            <div style={{
              background: isRight ? 'var(--border)' : '#FB923C1A',
              border: isRight ? '1px solid var(--border2)' : '1px solid #FB923C40',
              borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--text)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {def.hasText ? (step.text || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Empty</span>) : def.label}
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
              {def.hasText && <IconBtn onClick={onEdit} title="Edit">{ICON.edit}</IconBtn>}
              <IconBtn onClick={onMoveUp} disabled={index === 0} title="Move up">{ICON.up}</IconBtn>
              <IconBtn onClick={onMoveDown} disabled={index === total - 1} title="Move down">{ICON.down}</IconBtn>
              <IconBtn onClick={onDelete} title="Remove">{ICON.trash}</IconBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignPanel({ campaign, messages, onAddStep, onChangeText, onSaveText, onDeleteStep, onMoveStep, onClose, isMobile }) {
  const pipeline = getPipeline(messages, campaign.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function handlePick(type) {
    const id = makeId()
    onAddStep(campaign.name, type, id)
    setEditingId(id)
    setMenuOpen(false)
  }

  function handleAddFirst() {
    const id = makeId()
    onAddStep(campaign.name, 'initiation', id)
    setEditingId(id)
  }

  function handleConfirm() {
    onSaveText(campaign.name)
    setEditingId(null)
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
            onClick={handleAddFirst}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: '1px dashed var(--border2)',
              background: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            + Add Initiation Message
          </button>
        ) : (
          <>
            {pipeline.map((step, i) => (
              <PipelineStep
                key={step.id}
                step={step}
                index={i}
                total={pipeline.length}
                editing={editingId === step.id}
                justAdded={editingId === step.id}
                onEdit={() => setEditingId(step.id)}
                onChangeText={(v) => onChangeText(campaign.name, step.id, v)}
                onConfirm={handleConfirm}
                onDelete={() => onDeleteStep(campaign.name, step.id)}
                onMoveUp={() => onMoveStep(campaign.name, step.id, -1)}
                onMoveDown={() => onMoveStep(campaign.name, step.id, 1)}
              />
            ))}
            <PlusButton onClick={() => setMenuOpen(o => !o)}>
              {menuOpen && <AddStepMenu onPick={handlePick} />}
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

  function handleAddStep(name, type, id) {
    setMessages(prev => {
      const pipeline = [...getPipeline(prev, name), { id, type, text: '' }]
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

  function handleMoveStep(name, stepId, dir) {
    setMessages(prev => {
      const pipeline = getPipeline(prev, name).slice()
      const i = pipeline.findIndex(s => s.id === stepId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= pipeline.length) return prev
      ;[pipeline[i], pipeline[j]] = [pipeline[j], pipeline[i]]
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
          onMoveStep={handleMoveStep}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
