import { useMemo, useState, useEffect, useRef } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { dateStr } from '../utils/data'
import { saveUserConfig, saveClientConfig } from '../hooks/useData'

const PALETTE = ['#60A5FA', '#F472B6', '#FB923C', '#34D399', '#A78BFA', '#FBBF24', '#22D3EE', '#F87171', '#818CF8', '#4ADE80', '#E879F9', '#FACC15']

// Mezera mezi dvěma použitími delší než tolik dní přetrhne pruh na samostatné segmenty
const GAP_DAYS = 7

// Definice typů kroků v pipeline:
// initiation, první zpráva, kterou nasazuju (vždy první krok, vlastní text, bublina vpravo)
// message   , další moje zpráva poslaná HNED po předchozí (bez čáry mezi nimi, bublina vpravo)
// followup  , moje zpráva poslaná až po čase (čára mezi nimi, bublina vpravo)
// reply     , událost "prospect odpověděl pozitivně" (jen pevná značka, žádný text, bublina vlevo)
// boundary: true znamená "tento krok je oddělená událost v čase", pokud je krok NEBO jeho
// předchůdce boundary, mezi nimi se vykreslí svislá čára. Díky tomu, že se to počítá z OBOU
// sousedů (ne jen z aktuálního kroku), čára se správně objeví i po přetažení pořadí ,
// např. když přesunu "Prospect positive reply" nad "Initiation", čára mezi nimi zůstane.
const STEP_TYPES = {
  initiation: { hasText: true,  boundary: false, side: 'right' },
  message:    { hasText: true,  boundary: false, side: 'right' },
  followup:   { hasText: true,  boundary: true,  side: 'right' },
  reply:      { hasText: false, boundary: true,  side: 'left', fixedLabel: 'PROSPECT POSITIVE REPLY' },
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

// Vezme unikátní seřazená data nasazení a rozdělí je na souvislé úseky ,
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
// zkusí ho postavit ze starého (initiation/reply text fields), ať se stará testovací data neztratí.
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

// Při tažení spočítá náhledové pořadí, aniž by se sahalo na uložená data, commitne se až na drop
// Při tažení spočítá náhledové pořadí, aniž by se sahalo na uložená data, commitne se až na drop.
// `over` je { id, before }, before/after rozlišuje, na kterou stranu cílového kroku se má prvek vložit.
// Bez tohoto rozlišení by se prvek pri "splice insert" vždy octl AŽ ZA cílem, což dělalo posun nahoru nefunkční.
function previewReorder(pipeline, dragId, over) {
  if (!dragId || !over) return pipeline
  const arr = pipeline.slice()
  const from = arr.findIndex(s => s.id === dragId)
  if (from < 0) return pipeline
  const [item] = arr.splice(from, 1)
  let to = arr.findIndex(s => s.id === over.id)
  if (to < 0) return pipeline
  if (!over.before) to += 1
  arr.splice(to, 0, item)
  return arr
}

function isLegacyStep(step) {
  return typeof step.id === 'string' && step.id.startsWith('legacy-')
}

// Vrátí text iniciační zprávy KONKRÉTNÍ kampaně (nebo null, pokud žádnou nemá)
function getCampaignInitiationText(messages, name) {
  const pipeline = getPipeline(messages, name).filter(s => !isLegacyStep(s))
  const step = pipeline.find(s => s.type === 'initiation')
  const t = step && (step.text || '').trim()
  return t || null
}

// Vrátí spojený text odpovědi na pozitivní reakci pro KONKRÉTNÍ kampaň (nebo null).
// Pravidlo: od prvního "Prospect positive reply" se vezmou jen po sobě jdoucí "message" kroky
// (bez čárky, posílané hned za sebou) a spojí se do jednoho textu, i když je to v praxi
// rozsekané do 2-3 bublin, je to obsahově jedna odpověď. Jakmile přijde "followup" (časový
// odstup) nebo cokoliv jiného, zbytek pipeline se ignoruje úplně.
function getCampaignReplyText(messages, name) {
  const pipeline = getPipeline(messages, name).filter(s => !isLegacyStep(s))
  const replyIdx = pipeline.findIndex(s => s.type === 'reply')
  if (replyIdx < 0) return null
  const parts = []
  for (let i = replyIdx + 1; i < pipeline.length; i++) {
    const step = pipeline[i]
    if (step.type !== 'message') break
    const t = (step.text || '').trim()
    if (t) parts.push(t)
  }
  return parts.length ? parts.join(' ') : null
}

// Vrací každou unikátní zprávu spolu s tím, ze které kampaně poprvé pochází
function getInitiationEntries(messages, campaignNames) {
  const seen = new Map()
  campaignNames.forEach(name => {
    const t = getCampaignInitiationText(messages, name)
    if (t && !seen.has(t)) seen.set(t, name)
  })
  return Array.from(seen, ([text, campaign]) => ({ text, campaign }))
}

function getPositiveReplyEntries(messages, campaignNames) {
  const seen = new Map()
  campaignNames.forEach(name => {
    const t = getCampaignReplyText(messages, name)
    if (t && !seen.has(t)) seen.set(t, name)
  })
  return Array.from(seen, ([text, campaign]) => ({ text, campaign }))
}

// Skupiny "zpráva -> ve kterých kampaních se používá" + agregované stats (sečtené ze všech
// kampaní, co tu zprávu používají, a procenta dopočítaná ze sečtených čísel).
function groupMessagesByText(messages, campaigns, getTextFn) {
  const map = new Map() // text -> [campaign objects]
  campaigns.forEach(c => {
    const t = getTextFn(messages, c.name)
    if (!t) return
    if (!map.has(t)) map.set(t, [])
    map.get(t).push(c)
  })
  return Array.from(map, ([text, usedIn]) => {
    const total = usedIn.reduce((s, c) => s + c.total, 0)
    const msr = usedIn.reduce((s, c) => s + c.msr, 0)
    const prr = usedIn.reduce((s, c) => s + c.prr, 0)
    const abr = usedIn.reduce((s, c) => s + c.abr, 0)
    return {
      text,
      usedIn,
      stats: {
        total,
        msrPct: total > 0 ? +((msr / total) * 100).toFixed(1) : 0,
        prrPct: total > 0 ? +((prr / total) * 100).toFixed(1) : 0,
        abrPct: total > 0 ? +((abr / total) * 100).toFixed(1) : 0,
      },
    }
  }).sort((a, b) => b.stats.total - a.stats.total)
}

const ICON = {
  edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  trash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>,
  grip: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  reply: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
}

function IconBtn({ onClick, title, children, draggable, onDragStart, onDragEnd, hoverColor }) {
  return (
    <button
      onClick={onClick}
      title={title}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={e => { e.currentTarget.style.color = hoverColor || 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)' }}
      style={{
        background: 'none', border: 'none', cursor: draggable ? 'grab' : 'pointer',
        color: 'var(--text3)', padding: 4, display: 'flex', transition: 'color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function AddStepMenu({ onPick }) {
  const options = [
    { type: 'followup', label: 'Follow-up' },
    { type: 'message', label: 'Another message (mine)' },
    { type: 'reply', label: 'Prospect positive reply' },
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 2, height: 24, background: 'var(--border2)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <button
          onClick={onClick}
          className="hoverable"
          style={{
            width: 30, height: 30, borderRadius: '50%', border: '1px dashed var(--border2)',
            background: 'var(--card)', color: 'var(--text3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >{ICON.plus}</button>
        {children}
      </div>
    </div>
  )
}

function fmtDelay(step) {
  if (step.delayValue === undefined || step.delayValue === null || step.delayValue === '') return null
  const unitLabel = { mins: 'min', hrs: 'hr', days: 'day' }[step.delayUnit || 'days']
  const n = step.delayValue
  return `${n} ${unitLabel}${Number(n) === 1 ? '' : 's'}`
}

function PipelineStep({ step, showLine, isFirst, hasEdit, editing, isDragging, onEdit, onChangeText, onConfirm, onDelete, onChangeDelayValue, onChangeDelayUnit, onSaveDelay, onDragStart, onDragOver, onDrop, onDragEnd, readOnly }) {
  const def = STEP_TYPES[step.type]
  const isRight = def.side === 'right'
  const rowJustify = isRight ? 'flex-end' : 'flex-start'
  const delayLabel = step.type === 'followup' ? fmtDelay(step) : null
  const [hovered, setHovered] = useState(false)

  const bubble = def.hasText ? (
    <div style={{
      maxWidth: '74%',
      background: isRight ? 'var(--border)' : '#FB923C1A',
      border: isRight ? '1px solid var(--border2)' : '1px solid #FB923C40',
      borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--text)',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {step.text || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Empty</span>}
    </div>
  ) : (
    <div style={{
      maxWidth: '74%', display: 'flex', alignItems: 'center', gap: 8,
      background: '#FB923C1A', border: '1px solid #FB923C40',
      borderRadius: 12, padding: '10px 14px', color: '#FB923C',
    }}>
      {ICON.reply}
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>{def.fixedLabel}</span>
    </div>
  )

  const icons = readOnly ? null : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {hasEdit && <IconBtn onClick={onEdit} title="Edit">{ICON.edit}</IconBtn>}
      <IconBtn onClick={onDelete} title="Remove" hoverColor="#EF4444">{ICON.trash}</IconBtn>
      <IconBtn draggable title="Drag to reorder" onDragStart={onDragStart} onDragEnd={onDragEnd}>{ICON.grip}</IconBtn>
    </div>
  )

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {showLine && (
        <div style={{ position: 'relative', height: 40 }}>
          {/* Čára je vždy přesně na střed přes absolutní pozicování, obsah vpravo od ní (label/ikona) ji nikdy neposune */}
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', background: 'var(--border2)', transform: 'translateX(-50%)' }} />
          {step.type === 'followup' && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(14px, -50%)', display: 'flex', alignItems: 'center' }}>
              {hovered && !readOnly ? (
                <button
                  onClick={onEdit}
                  className="hoverable"
                  title={delayLabel ? 'Edit time' : 'Add time'}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 6 }}
                >
                  {delayLabel ? ICON.edit : ICON.plus}
                </button>
              ) : (
                delayLabel && <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{delayLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {editing && def.hasText ? (
        <div style={{ marginTop: isFirst ? 0 : 6 }}>
          {step.type === 'followup' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Optional</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                type="text"
                value={step.delayValue ?? ''}
                onChange={e => onChangeDelayValue(e.target.value)}
                onBlur={onSaveDelay}
                placeholder="Time"
                title="Time after which you send this follow-up"
                style={{
                  width: 90, height: 40, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14,
                  background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '0 12px', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'stretch', height: 40, background: 'var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ key: 'mins', label: 'Mins' }, { key: 'hrs', label: 'Hrs' }, { key: 'days', label: 'Days' }].map(opt => {
                  const isSel = (step.delayUnit || 'days') === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => { onChangeDelayUnit(opt.key); onSaveDelay() }}
                      className={isSel ? 'hoverable-fade' : 'hoverable'}
                      style={{
                        border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: isSel ? 'var(--card)' : 'transparent',
                        color: isSel ? 'var(--text)' : 'var(--text3)',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              autoFocus
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
              className="hoverable-fade"
              title="Confirm"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border2)',
                background: 'var(--filter-active-bg)', color: 'var(--filter-active-text)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {ICON.check}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: rowJustify, gap: 8, marginTop: isFirst ? 0 : 6 }}>
          {isRight ? <>{hovered && icons}{bubble}</> : <>{bubble}{hovered && icons}</>}
        </div>
      )}
    </div>
  )
}

function CampaignPanel({ campaign, messages, onAddStep, onChangeText, onChangeDelayValue, onChangeDelayUnit, onSaveText, onDeleteStep, onReorderStep, onSetPipeline, onClose, isMobile, readOnly }) {
  const realPipeline = getPipeline(messages, campaign.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [overTarget, setOverTarget] = useState(null) // { id, before }

  // Při tažení se pipeline živě překresluje podle toho, kam zrovna draguju, commit teprve na drop
  const pipeline = dragId ? previewReorder(realPipeline, dragId, overTarget) : realPipeline

  function handlePick(type) {
    const id = makeId()
    onAddStep(campaign.name, type, id)
    if (STEP_TYPES[type].hasText) setEditingId(id)
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

  function handleDrop() {
    if (dragId && overTarget && overTarget.id !== dragId) onReorderStep(campaign.name, dragId, overTarget)
    setDragId(null)
    setOverTarget(null)
  }

  // Fix proti glitchování a proti tomu, že to fungovalo jen jedním směrem:
  // cílová pozice se určuje podle toho, jestli je kurzor v HORNÍ nebo DOLNÍ polovině
  // aktuálně přejížděného kroku ("before"/"after"), ne podle pevného indexu vůči startu tažení.
  // Díky tomu lze prvek vložit na libovolnou stranu libovolného kroku v obou směrech.
  function handleDragOverStep(e, stepId) {
    e.preventDefault()
    if (!dragId || dragId === stepId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const before = e.clientY < midpoint
    if (!overTarget || overTarget.id !== stepId || overTarget.before !== before) {
      setOverTarget({ id: stepId, before })
    }
  }

  const [copyFlash, setCopyFlash] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const [pasteError, setPasteError] = useState(false)

  async function handleCopy() {
    const exportable = realPipeline.map(({ id, ...rest }) => rest)
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportable))
      setCopyFlash(true)
      setTimeout(() => setCopyFlash(false), 1500)
    } catch {
      setPasteError(true)
      setTimeout(() => setPasteError(false), 2000)
    }
  }

  function handleSaveAll() {
    onSaveText(campaign.name)
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1500)
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('not an array')
      const valid = parsed.every(s => s && STEP_TYPES[s.type])
      if (!valid) throw new Error('invalid steps')
      const withIds = parsed.map(s => ({ ...s, id: makeId() }))
      onSetPipeline(campaign.name, withIds)
    } catch {
      setPasteError(true)
      setTimeout(() => setPasteError(false), 2000)
    }
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
          <button onClick={onClose} className="hoverable" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6, flexShrink: 0, borderRadius: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>{fmtDate(campaign.from)} – {fmtDate(campaign.to)}</div>

        {pipeline.length === 0 ? (
          readOnly ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No pipeline set for this campaign yet.</div>
          ) : (
          <div>
            <button
              onClick={handleAddFirst}
              className="hoverable"
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: '1px dashed var(--border2)',
                background: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              }}
            >
              + Add Initiation Message
            </button>
            <button
              onClick={handlePaste}
              className="hoverable"
              style={{
                width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: 'none',
                background: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              {pasteError ? 'Could not paste. Copy a pipeline first' : 'or paste a copied pipeline'}
            </button>
          </div>
          )
        ) : (
          <>
            {pipeline.map((step, i) => {
              const prevStep = i > 0 ? pipeline[i - 1] : null
              const showLine = i > 0 && (STEP_TYPES[step.type].boundary || STEP_TYPES[prevStep.type].boundary)
              return (
                <PipelineStep
                  key={step.id}
                  step={step}
                  showLine={showLine}
                  isFirst={i === 0}
                  hasEdit={STEP_TYPES[step.type].hasText}
                  editing={editingId === step.id}
                  isDragging={dragId === step.id}
                  readOnly={readOnly}
                  onEdit={() => setEditingId(step.id)}
                  onChangeText={(v) => onChangeText(campaign.name, step.id, v)}
                  onChangeDelayValue={(v) => onChangeDelayValue(campaign.name, step.id, v)}
                  onChangeDelayUnit={(v) => onChangeDelayUnit(campaign.name, step.id, v)}
                  onSaveDelay={() => onSaveText(campaign.name)}
                  onConfirm={handleConfirm}
                  onDelete={() => onDeleteStep(campaign.name, step.id)}
                  onDragStart={() => setDragId(step.id)}
                  onDragEnd={() => { setDragId(null); setOverTarget(null) }}
                  onDragOver={(e) => handleDragOverStep(e, step.id)}
                  onDrop={(e) => { e.preventDefault(); handleDrop() }}
                />
              )
            })}
            {!readOnly && (
            <PlusButton onClick={() => setMenuOpen(o => !o)}>
              {menuOpen && <AddStepMenu onPick={handlePick} />}
            </PlusButton>
            )}
          </>
        )}

        {pipeline.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={handleCopy}
              className="hoverable"
              style={{
                flex: 1, height: 40, borderRadius: 10, border: '1px solid var(--border2)',
                background: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {copyFlash ? 'Copied!' : 'Copy Pipeline'}
            </button>
            {!readOnly && (
            <button
              onClick={handleSaveAll}
              className="hoverable-fade"
              style={{
                flex: 1, height: 40, borderRadius: 10, border: 'none',
                background: 'var(--filter-active-bg)', color: 'var(--filter-active-text)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {saveFlash ? 'Saved!' : 'Save'}
            </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 30, marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {[
            { lbl: 'Initiated', val: campaign.total, color: '#60A5FA' },
            { lbl: 'Positive Replies', val: campaign.prr, color: '#FB923C' },
            { lbl: 'Booked', val: campaign.abr, color: '#34D399' },
          ].map(r => (
            <div key={r.lbl}>
              <div style={{ fontSize: 22, fontWeight: 800, color: r.color, marginBottom: 4 }}>{r.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.lbl}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 30, marginTop: 24 }}>
          {[
            { lbl: 'MSR', val: campaign.msrPct, color: '#F472B6' },
            { lbl: 'PRR', val: campaign.prrPct, color: '#FB923C' },
            { lbl: 'ABR', val: campaign.abrPct, color: '#34D399' },
          ].map(r => (
            <div key={r.lbl}>
              <div style={{ fontSize: 22, fontWeight: 800, color: r.color, marginBottom: 4 }}>{r.val}%</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Campaigns({ data, user, config, isMobile, readOnly, clientId }) {
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
    if (clientId) {
      saveClientConfig(clientId, { campaignMessages: updated }).catch(() => {})
      return
    }
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

  function handleChangeDelayValue(name, stepId, delayValue) {
    setMessages(prev => {
      const pipeline = getPipeline(prev, name).map(s => s.id === stepId ? { ...s, delayValue } : s)
      return { ...prev, [name]: { pipeline } }
    })
  }

  function handleChangeDelayUnit(name, stepId, delayUnit) {
    setMessages(prev => {
      const pipeline = getPipeline(prev, name).map(s => s.id === stepId ? { ...s, delayUnit } : s)
      const updated = { ...prev, [name]: { pipeline } }
      persist(updated)
      return updated
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

  function handleReorderStep(name, draggedId, overTarget) {
    setMessages(prev => {
      const pipeline = previewReorder(getPipeline(prev, name), draggedId, overTarget)
      const updated = { ...prev, [name]: { pipeline } }
      persist(updated)
      return updated
    })
  }

  function handleSetPipeline(name, pipeline) {
    setMessages(prev => {
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
  const initiationEntries = getInitiationEntries(messages, campaignNames)
  const replyEntries = getPositiveReplyEntries(messages, campaignNames)
  const initiationGroups = groupMessagesByText(messages, campaigns, getCampaignInitiationText)
  const replyGroups = groupMessagesByText(messages, campaigns, getCampaignReplyText)

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

  const rowHeight = isMobile ? 50 : 48
  const labelWidth = isMobile ? 110 : 190
  const selectedCampaign = selected ? campaigns.find(c => c.name === selected) : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 16 }}>
        {[
          { label: 'Campaigns Tracked', value: campaigns.length, color: '#60A5FA' },
          { label: 'Active Span', value: `${totalSpan}d`, color: '#FBBF24' },
          { label: 'Initiation Message Types', value: initiationEntries.length, color: '#60A5FA' },
          { label: 'Positive Reply Types', value: replyEntries.length, color: '#FB923C' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 18, padding: isMobile ? '20px 14px' : '24px 26px', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtDate(globalFrom)} – {fmtDate(globalTo)}</div>
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
                className="hoverable"
                style={{
                  height: rowHeight, display: 'flex', alignItems: 'center', gap: 8,
                  paddingRight: 12, cursor: 'pointer', borderRadius: 8,
                  opacity: hovered && hovered !== s.name ? 0.4 : 1,
                  transition: 'opacity 0.15s, background-color 0.15s',
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
                            height: isHovered ? 36 : 32,
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

      {[
        { title: 'Initiation Messages', groups: initiationGroups },
        { title: 'Positive Reply Messages', groups: replyGroups },
      ].map(section => (
        <div key={section.title} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 14, textAlign: 'left' }}>{section.title}</div>
          {section.groups.length === 0 ? (
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)', fontSize: 12, color: 'var(--text3)' }}>
              Nothing set yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.groups.map((g, i) => (
                <div key={i} style={{ background: 'var(--card)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--card-shadow)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12 }}>{g.text}</div>

                  <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Used in</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {g.usedIn.map(c => (
                      <span
                        key={c.name}
                        onClick={() => setSelected(c.name)}
                        className="hoverable"
                        style={{
                          fontSize: 11, fontWeight: 600, color: 'var(--text2)', background: 'var(--border)',
                          borderRadius: 20, padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 22, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {[
                      { lbl: 'Sent', val: g.stats.total, color: '#60A5FA' },
                      { lbl: 'MSR', val: `${g.stats.msrPct}%`, color: '#F472B6' },
                      { lbl: 'PRR', val: `${g.stats.prrPct}%`, color: '#FB923C' },
                      { lbl: 'ABR', val: `${g.stats.abrPct}%`, color: '#34D399' },
                    ].map(stat => (
                      <div key={stat.lbl}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: stat.color }}>{stat.val}</div>
                        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{stat.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {selectedCampaign && (
        <CampaignPanel
          campaign={selectedCampaign}
          messages={messages}
          onAddStep={handleAddStep}
          onChangeText={handleChangeText}
          onChangeDelayValue={handleChangeDelayValue}
          onChangeDelayUnit={handleChangeDelayUnit}
          onSaveText={handleSaveText}
          onDeleteStep={handleDeleteStep}
          onReorderStep={handleReorderStep}
          onSetPipeline={handleSetPipeline}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}
