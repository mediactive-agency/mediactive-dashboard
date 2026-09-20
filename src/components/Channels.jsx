import { useMemo, useState, useEffect, useRef } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { inRange, toSalesDateStr, pct } from '../utils/data'
import { saveUserConfig, saveClientConfig } from '../hooks/useData'

// Premade platform options. `accent` is the identity colour of the box,
// `ink` is the text colour that stays readable on top of that accent.
// LinkedIn and Facebook are both "blue" but use their own brand blues so
// two boxes next to each other are still tellable apart.
export const CHANNEL_PRESETS = [
  { key: 'linkedin',  label: 'LinkedIn',  accent: '#0A66C2', ink: '#FFFFFF' },
  { key: 'instagram', label: 'Instagram', accent: '#E1306C', ink: '#FFFFFF' },
  { key: 'facebook',  label: 'Facebook',  accent: '#1877F2', ink: '#FFFFFF' },
  { key: 'skool',     label: 'Skool',     accent: '#F5B301', ink: '#1A1A1A' },
  { key: 'youtube',   label: 'YouTube',   accent: '#FF0000', ink: '#FFFFFF' },
  { key: 'website',   label: 'Website',   accent: '#FFFFFF', ink: '#1A1A1A' },
  { key: 'other',     label: 'Other',     accent: '#9CA3AF', ink: '#1A1A1A' },
]

const PRESET_BY_KEY = Object.fromEntries(CHANNEL_PRESETS.map(p => [p.key, p]))

// Free colour swatches for when none of the presets fit
const SWATCHES = ['#0A66C2', '#E1306C', '#1877F2', '#F5B301', '#FF0000', '#FFFFFF', '#9CA3AF', '#34D399', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6']

const NODE_W = 236
const NODE_H = 138
const BOOKED_W = 300
const BOOKED_H = 158
const CLOSED_W = 200
const CLOSED_H = 92

const MIN_ZOOM = 0.45
const MAX_ZOOM = 1.6

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Text colour that stays legible on an arbitrary accent, used for the header strip
function inkFor(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '#FFFFFF'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#1A1A1A' : '#FFFFFF'
}

function hexToRgba(hex, a) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(156,163,175,${a})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// Default board: channels spread across the top, Booked centred underneath,
// laid out to match the shape people sketch it in.
function defaultChannels() {
  return [
    { id: makeId(), name: 'LinkedIn', preset: 'linkedin', color: '#0A66C2', variables: [], x: 40,  y: 40 },
    { id: makeId(), name: 'Instagram', preset: 'instagram', color: '#E1306C', variables: [], x: 330, y: 40 },
    { id: makeId(), name: 'Website',  preset: 'website',  color: '#FFFFFF', variables: [], x: 620, y: 40 },
  ]
}

const DEFAULT_BOOKED = { x: 342, y: 330 }
const DEFAULT_CLOSED = { x: 392, y: 560 }

export default function Channels({ data, filter, customFrom, customTo, user, config, isMobile, readOnly, clientId }) {
  const [board, setBoard] = useState(() => ({
    channels: config?.channels?.channels?.length ? config.channels.channels : defaultChannels(),
    booked: config?.channels?.booked || DEFAULT_BOOKED,
    closed: config?.channels?.closed || DEFAULT_CLOSED,
  }))
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const initialized = useRef(false)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)

  // Hydrate once the saved board arrives from Firestore
  useEffect(() => {
    if (!initialized.current && config?.channels?.channels?.length) {
      setBoard({
        channels: config.channels.channels,
        booked: config.channels.booked || DEFAULT_BOOKED,
        closed: config.channels.closed || DEFAULT_CLOSED,
      })
      initialized.current = true
    }
  }, [config?.channels])

  function persist(next) {
    if (readOnly) return
    if (clientId) { saveClientConfig(clientId, { channels: next }).catch(() => {}); return }
    if (!user) return
    saveUserConfig(user.uid, { channels: next }).catch(() => {})
  }

  function commit(updater) {
    setBoard(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      persist(next)
      return next
    })
  }

  // Positions move constantly while dragging, so they update local state on every
  // frame but only get written to Firestore once the pointer is released.
  function moveLocal(updater) {
    setBoard(prev => (typeof updater === 'function' ? updater(prev) : updater))
  }

  /* ---------------------------------------------------------------- data */

  const { channelStats, bookedStats, allVariables, assignedVars } = useMemo(() => {
    if (!data) return { channelStats: {}, bookedStats: null, allVariables: [], assignedVars: new Set() }

    const monthKeys = Object.keys(data).filter(k => k !== 'sales' && k !== 'calendly')
    const allRaw = monthKeys
      .flatMap(k => parseOutreachMonth(data[k]).rawRows)
      .filter(r => r.varName && r.date)

    const variables = Array.from(new Set(allRaw.map(r => r.varName))).sort()
    const inWindow = allRaw.filter(r => inRange(r.date, filter, customFrom, customTo))

    const stats = {}
    const assigned = new Set()
    board.channels.forEach(ch => {
      const vars = new Set(ch.variables || [])
      vars.forEach(v => assigned.add(v))
      const rows = inWindow.filter(r => vars.has(r.varName))
      const initiated = rows.length
      const booked = rows.filter(r => r.hasC).length
      stats[ch.id] = { initiated, booked, abr: pct(booked, initiated) }
    })

    // Sales sheet has no channel column, so show up / close is measured across
    // every held call in the window rather than split per channel.
    const salesRows = (data.sales || []).slice(1)
      .filter(r => r && r[0])
      .filter(r => inRange(toSalesDateStr(r[1]), filter, customFrom, customTo))
    const held = salesRows.length
    const closed = salesRows.filter(r => String(r[5] || '').toLowerCase() === 'yes').length
    const bookedTotal = Object.values(stats).reduce((s, v) => s + v.booked, 0)

    return {
      channelStats: stats,
      bookedStats: {
        booked: bookedTotal,
        held,
        closed,
        showUp: pct(held, bookedTotal),
        closeRate: pct(closed, held),
      },
      allVariables: variables,
      assignedVars: assigned,
    }
  }, [data, filter, customFrom, customTo, board.channels])

  const unassigned = allVariables.filter(v => !assignedVars.has(v))

  /* ------------------------------------------------------------ dragging */

  function startDrag(e, kind, id) {
    if (readOnly) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const node = kind === 'channel'
      ? board.channels.find(c => c.id === id)
      : kind === 'booked' ? board.booked : board.closed
    dragRef.current = {
      kind, id,
      startX: e.clientX, startY: e.clientY,
      originX: node.x, originY: node.y,
      moved: false,
    }
  }

  function onDragMove(e) {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.startX) / zoom
    const dy = (e.clientY - d.startY) / zoom
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true
    const nx = Math.round(d.originX + dx)
    const ny = Math.round(d.originY + dy)
    moveLocal(prev => {
      if (d.kind === 'channel') {
        return { ...prev, channels: prev.channels.map(c => c.id === d.id ? { ...c, x: nx, y: ny } : c) }
      }
      if (d.kind === 'booked') return { ...prev, booked: { x: nx, y: ny } }
      return { ...prev, closed: { x: nx, y: ny } }
    })
  }

  function endDrag(e, kind, id) {
    const d = dragRef.current
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (!d) return
    if (d.moved) {
      // position changed, write the whole board back
      setBoard(prev => { persist(prev); return prev })
    } else if (kind === 'channel') {
      setSelectedId(prev => prev === id ? null : id)
    }
  }

  // Panning the empty canvas
  const panRef = useRef(null)
  function startPan(e) {
    if (e.target !== e.currentTarget) return
    panRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setSelectedId(null)
  }
  function onPan(e) {
    const p = panRef.current
    if (!p) return
    setPan({ x: p.originX + (e.clientX - p.startX), y: p.originY + (e.clientY - p.startY) })
  }
  function endPan(e) {
    panRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  /* ------------------------------------------------------------- actions */

  function addChannel() {
    const preset = PRESET_BY_KEY.other
    const idx = board.channels.length
    const ch = {
      id: makeId(),
      name: 'New channel',
      preset: preset.key,
      color: preset.accent,
      variables: [],
      x: 40 + (idx % 3) * 290,
      y: 40 + Math.floor(idx / 3) * 180,
    }
    commit(prev => ({ ...prev, channels: [...prev.channels, ch] }))
    setSelectedId(ch.id)
  }

  function updateChannel(id, patch) {
    commit(prev => ({ ...prev, channels: prev.channels.map(c => c.id === id ? { ...c, ...patch } : c) }))
  }

  function removeChannel(id) {
    commit(prev => ({ ...prev, channels: prev.channels.filter(c => c.id !== id) }))
    setSelectedId(null)
  }

  function toggleVariable(id, v) {
    const ch = board.channels.find(c => c.id === id)
    if (!ch) return
    const has = (ch.variables || []).includes(v)
    updateChannel(id, { variables: has ? ch.variables.filter(x => x !== v) : [...(ch.variables || []), v] })
  }

  function resetLayout() {
    commit(prev => ({
      channels: prev.channels.map((c, i) => ({ ...c, x: 40 + (i % 3) * 290, y: 40 + Math.floor(i / 3) * 180 })),
      booked: DEFAULT_BOOKED,
      closed: DEFAULT_CLOSED,
    }))
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }

  if (!data) return null

  const selected = board.channels.find(c => c.id === selectedId) || null

  /* -------------------------------------------------------------- canvas */

  // Keep the scroll area tall enough that the lowest node is always reachable
  const contentH = Math.max(
    board.closed.y + CLOSED_H,
    board.booked.y + BOOKED_H,
    ...board.channels.map(c => c.y + NODE_H),
  ) + 80
  const contentW = Math.max(
    board.booked.x + BOOKED_W,
    ...board.channels.map(c => c.x + NODE_W),
  ) + 80

  function curve(sx, sy, tx, ty) {
    const mid = (sy + ty) / 2
    return `M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`
  }

  const bookedTopX = board.booked.x + BOOKED_W / 2
  const bookedTopY = board.booked.y
  const bookedBottomY = board.booked.y + BOOKED_H

  const btn = {
    padding: '7px 13px', background: 'var(--card)', color: 'var(--text2)',
    border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* ------------------------------------------------------ the board */}
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {!readOnly && (
            <button onClick={addChannel} style={{ ...btn, background: 'var(--text)', color: 'var(--bg)', border: 'none', fontWeight: 700 }}>
              + Add channel
            </button>
          )}
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.15).toFixed(2)))} style={btn}>-</button>
          <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 42, textAlign: 'center', fontWeight: 600 }}>{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.15).toFixed(2)))} style={btn}>+</button>
          {!readOnly && <button onClick={resetLayout} style={btn}>Reset layout</button>}
          {unassigned.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
              {unassigned.length} variable{unassigned.length === 1 ? '' : 's'} not linked to a channel
            </div>
          )}
        </div>

        <div
          ref={wrapRef}
          onPointerDown={startPan}
          onPointerMove={onPan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          style={{
            position: 'relative',
            height: isMobile ? '62vh' : '72vh',
            background: 'var(--card)',
            borderRadius: 18,
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)',
            overflow: 'hidden',
            touchAction: 'none',
            cursor: 'grab',
            backgroundImage: 'radial-gradient(var(--border2) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: contentW, height: contentH,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}>
            {/* connectors sit behind the boxes */}
            <svg width={contentW} height={contentH} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}>
              {board.channels.map(ch => (
                <path
                  key={ch.id}
                  d={curve(ch.x + NODE_W / 2, ch.y + NODE_H, bookedTopX, bookedTopY)}
                  fill="none"
                  stroke={ch.color === '#FFFFFF' ? 'var(--text3)' : ch.color}
                  strokeWidth="2"
                  strokeDasharray="7 7"
                  strokeLinecap="round"
                  opacity={selectedId && selectedId !== ch.id ? 0.25 : 0.85}
                />
              ))}
              <path
                d={curve(bookedTopX, bookedBottomY, board.closed.x + CLOSED_W / 2, board.closed.y)}
                fill="none" stroke="var(--text4)" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round"
              />
            </svg>

            {/* channel boxes */}
            {board.channels.map(ch => {
              const st = channelStats[ch.id] || { initiated: 0, booked: 0, abr: 0 }
              const ink = inkFor(ch.color)
              const isSel = selectedId === ch.id
              return (
                <div
                  key={ch.id}
                  onPointerDown={e => startDrag(e, 'channel', ch.id)}
                  onPointerMove={onDragMove}
                  onPointerUp={e => endDrag(e, 'channel', ch.id)}
                  onPointerCancel={e => endDrag(e, 'channel', ch.id)}
                  style={{
                    position: 'absolute', left: ch.x, top: ch.y,
                    width: NODE_W, height: NODE_H,
                    background: 'var(--card)',
                    border: `1px solid ${isSel ? ch.color : 'var(--border)'}`,
                    boxShadow: isSel ? `0 0 0 2px ${hexToRgba(ch.color, 0.35)}` : 'var(--card-shadow)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: readOnly ? 'default' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    background: ch.color, color: ink,
                    padding: '9px 13px', fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    borderBottom: ch.color === '#FFFFFF' ? '1px solid var(--border2)' : 'none',
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, flexShrink: 0 }}>
                      {(ch.variables || []).length || 0}v
                    </span>
                  </div>

                  <div style={{ display: 'flex', padding: '14px 8px 12px' }}>
                    {[
                      { lbl: 'Initiated', val: st.initiated, color: '#60A5FA' },
                      { lbl: 'Booked', val: st.booked, color: '#A855F7' },
                      { lbl: 'ABR', val: `${st.abr}%`, color: '#34D399' },
                    ].map((m, i) => (
                      <div key={m.lbl} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ fontSize: 19, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
                        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 700 }}>{m.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '0 13px 10px', fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(ch.variables || []).length ? ch.variables.join(', ') : 'No variables linked yet'}
                  </div>
                </div>
              )
            })}

            {/* booked box */}
            <div
              onPointerDown={e => startDrag(e, 'booked')}
              onPointerMove={onDragMove}
              onPointerUp={e => endDrag(e, 'booked')}
              onPointerCancel={e => endDrag(e, 'booked')}
              style={{
                position: 'absolute', left: board.booked.x, top: board.booked.y,
                width: BOOKED_W, height: BOOKED_H,
                background: 'var(--card)', border: '1px solid var(--border2)',
                borderRadius: 16, boxShadow: 'var(--card-shadow)', overflow: 'hidden',
                cursor: readOnly ? 'default' : 'grab', touchAction: 'none', userSelect: 'none',
              }}
            >
              <div style={{
                background: '#A855F7', color: '#FFFFFF', padding: '10px 15px',
                fontSize: 13, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>Booked</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{bookedStats?.booked ?? 0}</span>
              </div>
              <div style={{ display: 'flex', padding: '16px 10px 12px' }}>
                {[
                  { lbl: 'Show Up Rate', val: `${bookedStats?.showUp ?? 0}%`, sub: `${bookedStats?.held ?? 0} held`, color: '#FBBF24' },
                  { lbl: 'Close Rate', val: `${bookedStats?.closeRate ?? 0}%`, sub: `${bookedStats?.closed ?? 0} closed`, color: '#34D399' },
                ].map((m, i) => (
                  <div key={m.lbl} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3, fontWeight: 700 }}>{m.lbl}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* closed box */}
            <div
              onPointerDown={e => startDrag(e, 'closed')}
              onPointerMove={onDragMove}
              onPointerUp={e => endDrag(e, 'closed')}
              onPointerCancel={e => endDrag(e, 'closed')}
              style={{
                position: 'absolute', left: board.closed.x, top: board.closed.y,
                width: CLOSED_W, height: CLOSED_H,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: 'var(--card-shadow)', overflow: 'hidden',
                cursor: readOnly ? 'default' : 'grab', touchAction: 'none', userSelect: 'none',
              }}
            >
              <div style={{ background: '#34D399', color: '#1A1A1A', padding: '8px 14px', fontSize: 12, fontWeight: 800 }}>Closed</div>
              <div style={{ textAlign: 'center', padding: '13px 0' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#34D399', letterSpacing: '-0.02em' }}>{bookedStats?.closed ?? 0}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 700 }}>Deals won</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- inspector */}
      {!readOnly && (
        <div style={{
          width: isMobile ? '100%' : 300, flexShrink: 0,
          background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)', padding: 18,
          maxHeight: isMobile ? 'none' : '72vh', overflowY: 'auto',
        }}>
          {!selected ? (
            <div style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 13, marginBottom: 8 }}>Nothing selected</div>
              Click a channel box to rename it, change its colour, and pick which variables feed it.
              Drag any box to move it around, drag the empty canvas to pan.
              {unassigned.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Not linked yet</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {unassigned.map(v => (
                      <span key={v} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--hover-bg)', color: 'var(--text3)' }}>{v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 13 }}>Channel</div>
                <button onClick={() => removeChannel(selected.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Delete</button>
              </div>

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
              <input
                value={selected.name}
                onChange={e => updateChannel(selected.id, { name: e.target.value })}
                style={{
                  width: '100%', marginTop: 6, marginBottom: 16, padding: '9px 11px',
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preset</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 16 }}>
                {CHANNEL_PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => updateChannel(selected.id, { preset: p.key, color: p.accent, name: p.key === 'other' ? selected.name : p.label })}
                    style={{
                      padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: p.accent, color: p.ink,
                      border: selected.preset === p.key ? '2px solid var(--text)' : '1px solid var(--border2)',
                    }}
                  >{p.label}</button>
                ))}
              </div>

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 16, alignItems: 'center' }}>
                {SWATCHES.map(c => (
                  <button
                    key={c}
                    onClick={() => updateChannel(selected.id, { color: c, preset: 'custom' })}
                    style={{
                      width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer',
                      border: selected.color === c ? '2px solid var(--text)' : '1px solid var(--border2)',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={selected.color}
                  onChange={e => updateChannel(selected.id, { color: e.target.value, preset: 'custom' })}
                  style={{ width: 28, height: 22, padding: 0, border: '1px solid var(--border2)', borderRadius: 6, background: 'none', cursor: 'pointer' }}
                />
              </div>

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Variables ({(selected.variables || []).length}/{allVariables.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                {allVariables.length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>No variables found in the outreach data.</div>}
                {allVariables.map(v => {
                  const on = (selected.variables || []).includes(v)
                  const takenBy = board.channels.find(c => c.id !== selected.id && (c.variables || []).includes(v))
                  return (
                    <button
                      key={v}
                      onClick={() => toggleVariable(selected.id, v)}
                      title={takenBy ? `Also linked to ${takenBy.name}` : ''}
                      style={{
                        fontSize: 11, padding: '4px 9px', borderRadius: 20, cursor: 'pointer', fontWeight: 600,
                        background: on ? selected.color : 'var(--hover-bg)',
                        color: on ? inkFor(selected.color) : takenBy ? 'var(--text4)' : 'var(--text2)',
                        border: on ? 'none' : '1px solid var(--border)',
                      }}
                    >{v}</button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
