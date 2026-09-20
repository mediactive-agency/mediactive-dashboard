import { useMemo, useState, useEffect, useRef } from 'react'
import { parseOutreachMonth } from './Dashboard'
import { inRange, toSalesDateStr, pct, todayStr } from '../utils/data'
import { saveUserConfig, saveClientConfig } from '../hooks/useData'

// Same window Campaigns uses to decide a campaign is still running rather than
// paused, so "active" means the same thing on both tabs.
const GAP_DAYS = 7

/* ------------------------------------------------------------------ icons */

function IconLinkedIn({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M4.98 3.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/><path d="M3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.5c0-1.31-.02-3-1.9-3-1.9 0-2.2 1.43-2.2 2.9V21H9z"/></svg>
}
function IconInstagram({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill={c} stroke="none"/></svg>
}
function IconFacebook({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M14 9V7.2c0-.9.2-1.2 1.2-1.2H17V3h-2.8C11.4 3 10.3 4.5 10.3 7v2H8v3h2.3v9H14v-9h2.6l.4-3z"/></svg>
}
function IconSkool({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"><path d="M12 4L2 9l10 5 10-5-10-5z"/><path d="M6 11.5V16c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4.5"/></svg>
}
function IconYouTube({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="4" stroke={c} strokeWidth="2"/><path d="M10 9.2l5 2.8-5 2.8z" fill={c}/></svg>
}
function IconWebsite({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>
}
function IconOther({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
}
function IconPlus({ s = 14, c = 'currentColor', w = 2.4 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
}

// `accent` is the identity colour of the box border. LinkedIn and Facebook are
// both blue but use their own brand blues so two boxes side by side are still
// tellable apart.
export const CHANNEL_PRESETS = [
  { key: 'linkedin',  label: 'LinkedIn',  accent: '#0A66C2', Icon: IconLinkedIn },
  { key: 'instagram', label: 'Instagram', accent: '#E1306C', Icon: IconInstagram },
  { key: 'facebook',  label: 'Facebook',  accent: '#1877F2', Icon: IconFacebook },
  { key: 'skool',     label: 'Skool',     accent: '#F5B301', Icon: IconSkool },
  { key: 'youtube',   label: 'YouTube',   accent: '#FF0000', Icon: IconYouTube },
  { key: 'website',   label: 'Website',   accent: '#E5E7EB', Icon: IconWebsite },
  { key: 'other',     label: 'Other',     accent: '#9CA3AF', Icon: IconOther },
]
const PRESET_BY_KEY = Object.fromEntries(CHANNEL_PRESETS.map(p => [p.key, p]))

const SWATCHES = ['#0A66C2', '#E1306C', '#1877F2', '#F5B301', '#FF0000', '#E5E7EB', '#9CA3AF', '#34D399', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6']

const NODE_W = 236
const NODE_H = 138
const BOOKED_W = 300
const BOOKED_H = 158
const CLOSED_W = 200
const CLOSED_H = 92
const PAD = 22 // hover gutter each side of a channel, holds the + handles

const MIN_ZOOM = 0.45
const MAX_ZOOM = 1.6

const DEFAULT_BOOKED = { x: 342, y: 340 }
const DEFAULT_CLOSED = { x: 392, y: 570 }

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function hexToRgba(hex, a) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(156,163,175,${a})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export default function Channels({ data, filter, customFrom, customTo, user, config, isMobile, readOnly, clientId }) {
  const saved = config?.channels
  const [board, setBoard] = useState(() => ({
    channels: saved?.channels || [],
    // Older saved boards predate manual wiring, so keep the lines they already
    // had instead of silently emptying the canvas on them.
    connections: saved?.connections || (saved?.channels?.length
      ? [...saved.channels.map(c => ({ id: makeId(), from: c.id, to: 'booked' })), { id: makeId(), from: 'booked', to: 'closed' }]
      : []),
    booked: saved?.booked || DEFAULT_BOOKED,
    closed: saved?.closed || DEFAULT_CLOSED,
  }))
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [hoverConn, setHoverConn] = useState(null)
  const [linking, setLinking] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const initialized = useRef(false)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const panRef = useRef(null)

  useEffect(() => {
    if (!initialized.current && saved?.channels) {
      setBoard({
        channels: saved.channels,
        connections: saved.connections || (saved.channels.length
          ? [...saved.channels.map(c => ({ id: makeId(), from: c.id, to: 'booked' })), { id: makeId(), from: 'booked', to: 'closed' }]
          : []),
        booked: saved.booked || DEFAULT_BOOKED,
        closed: saved.closed || DEFAULT_CLOSED,
      })
      initialized.current = true
    }
  }, [saved])

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

  /* ---------------------------------------------------------------- data */

  const { channelStats, bookedStats, allVariables, assignedVars, activeVars } = useMemo(() => {
    if (!data) return { channelStats: {}, bookedStats: null, allVariables: [], assignedVars: new Set(), activeVars: new Set() }

    const monthKeys = Object.keys(data).filter(k => k !== 'sales' && k !== 'calendly')
    const allRaw = monthKeys
      .flatMap(k => parseOutreachMonth(data[k]).rawRows)
      .filter(r => r.varName && r.date)

    const variables = Array.from(new Set(allRaw.map(r => r.varName))).sort()

    // A variable counts as active when its most recent send is inside the same
    // gap window Campaigns uses to keep a segment open. Deliberately ignores the
    // date filter, "ongoing" is about now, not about the window being viewed.
    const lastSeen = {}
    allRaw.forEach(r => {
      if (!lastSeen[r.varName] || r.date > lastSeen[r.varName]) lastSeen[r.varName] = r.date
    })
    const active = new Set(variables.filter(v => daysBetween(lastSeen[v], todayStr) <= GAP_DAYS))

    const inWindow = allRaw.filter(r => inRange(r.date, filter, customFrom, customTo))

    const stats = {}
    const assigned = new Set()
    board.channels.forEach(ch => {
      const vars = new Set(ch.variables || [])
      vars.forEach(v => assigned.add(v))
      const rows = inWindow.filter(r => vars.has(r.varName))
      const initiated = rows.length
      const booked = rows.filter(r => r.hasC).length
      stats[ch.id] = {
        initiated,
        booked,
        abr: pct(booked, initiated),
        active: (ch.variables || []).some(v => active.has(v)),
      }
    })

    // The sales sheet has no channel column, so show up / close is measured
    // across every held call in the window rather than split per channel.
    const salesRows = (data.sales || []).slice(1)
      .filter(r => r && r[0])
      .filter(r => inRange(toSalesDateStr(r[1]), filter, customFrom, customTo))
    const held = salesRows.length
    const closed = salesRows.filter(r => String(r[5] || '').toLowerCase() === 'yes').length

    // Only count channels that actually feed Booked on the board
    const feeding = new Set(board.connections.filter(c => c.to === 'booked').map(c => c.from))
    const bookedTotal = board.channels
      .filter(c => feeding.has(c.id))
      .reduce((s, c) => s + (stats[c.id]?.booked || 0), 0)

    return {
      channelStats: stats,
      bookedStats: { booked: bookedTotal, held, closed, showUp: pct(held, bookedTotal), closeRate: pct(closed, held) },
      allVariables: variables,
      assignedVars: assigned,
      activeVars: active,
    }
  }, [data, filter, customFrom, customTo, board.channels, board.connections])

  const unassigned = allVariables.filter(v => !assignedVars.has(v))

  /* ----------------------------------------------------------- geometry */

  function nodeBox(key) {
    if (key === 'booked') return { ...board.booked, w: BOOKED_W, h: BOOKED_H }
    if (key === 'closed') return { ...board.closed, w: CLOSED_W, h: CLOSED_H }
    const ch = board.channels.find(c => c.id === key)
    return ch ? { x: ch.x, y: ch.y, w: NODE_W, h: NODE_H } : null
  }
  const outPort = k => { const b = nodeBox(k); return b && { x: b.x + b.w / 2, y: b.y + b.h } }
  const inPort = k => { const b = nodeBox(k); return b && { x: b.x + b.w / 2, y: b.y } }

  function curve(s, t) {
    const mid = (s.y + t.y) / 2
    return `M ${s.x} ${s.y} C ${s.x} ${mid}, ${t.x} ${mid}, ${t.x} ${t.y}`
  }

  function toCanvas(clientX, clientY) {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom }
  }

  function hitNode(pt) {
    const keys = [...board.channels.map(c => c.id), 'booked', 'closed']
    for (const k of keys) {
      const b = nodeBox(k)
      if (b && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return k
    }
    return null
  }

  /* ------------------------------------------------------------ dragging */

  function startDrag(e, kind, id) {
    if (readOnly) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const b = nodeBox(kind === 'channel' ? id : kind)
    dragRef.current = { kind, id, startX: e.clientX, startY: e.clientY, originX: b.x, originY: b.y, moved: false }
  }

  function onDragMove(e) {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.startX) / zoom
    const dy = (e.clientY - d.startY) / zoom
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true
    const nx = Math.round(d.originX + dx)
    const ny = Math.round(d.originY + dy)
    setBoard(prev => {
      if (d.kind === 'channel') return { ...prev, channels: prev.channels.map(c => c.id === d.id ? { ...c, x: nx, y: ny } : c) }
      if (d.kind === 'booked') return { ...prev, booked: { x: nx, y: ny } }
      return { ...prev, closed: { x: nx, y: ny } }
    })
  }

  function endDrag(e, kind, id) {
    const d = dragRef.current
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (!d) return
    if (d.moved) setBoard(prev => { persist(prev); return prev })
    else if (kind === 'channel') setSelectedId(prev => prev === id ? null : id)
  }

  /* ------------------------------------------------------------- linking */

  function startLink(e, fromKey) {
    if (readOnly) return
    e.stopPropagation()
    const pt = toCanvas(e.clientX, e.clientY)
    setLinking({ from: fromKey, cur: pt })
  }

  function onCanvasMove(e) {
    if (linking) { setLinking(l => l && { ...l, cur: toCanvas(e.clientX, e.clientY) }); return }
    const p = panRef.current
    if (p) setPan({ x: p.originX + (e.clientX - p.startX), y: p.originY + (e.clientY - p.startY) })
  }

  function onCanvasUp(e) {
    if (linking) {
      const target = hitNode(toCanvas(e.clientX, e.clientY))
      if (target && target !== linking.from) {
        const dup = board.connections.some(c => c.from === linking.from && c.to === target)
        if (!dup) commit(prev => ({ ...prev, connections: [...prev.connections, { id: makeId(), from: linking.from, to: target }] }))
      }
      setLinking(null)
      return
    }
    panRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  function startPan(e) {
    if (e.target !== e.currentTarget) return
    panRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setSelectedId(null)
  }

  function removeConnection(id) {
    commit(prev => ({ ...prev, connections: prev.connections.filter(c => c.id !== id) }))
  }

  /* ------------------------------------------------------------- actions */

  // Drops a channel at a target spot, nudging down if something already sits there
  function freeSpot(x, y, channels) {
    let ny = y
    let guard = 0
    while (guard++ < 40 && channels.some(c => Math.abs(c.x - x) < NODE_W && Math.abs(c.y - ny) < NODE_H)) ny += NODE_H + 30
    return { x, y: ny }
  }

  function addChannel(atX, atY) {
    const p = PRESET_BY_KEY.other
    commit(prev => {
      const base = prev.channels.length === 0
        ? { x: 60, y: 50 }
        : freeSpot(atX ?? 60, atY ?? 50, prev.channels)
      const ch = { id: makeId(), name: 'New channel', preset: p.key, color: p.accent, variables: [], ...base }
      const next = { ...prev, channels: [...prev.channels, ch] }
      setTimeout(() => setSelectedId(ch.id), 0)
      return next
    })
  }

  function addBeside(ch, side) {
    addChannel(ch.x + (side === 'right' ? NODE_W + 54 : -(NODE_W + 54)), ch.y)
  }

  function updateChannel(id, patch) {
    commit(prev => ({ ...prev, channels: prev.channels.map(c => c.id === id ? { ...c, ...patch } : c) }))
  }

  function removeChannel(id) {
    commit(prev => ({
      ...prev,
      channels: prev.channels.filter(c => c.id !== id),
      connections: prev.connections.filter(c => c.from !== id && c.to !== id),
    }))
    setSelectedId(null)
  }

  // Picking a preset sets the colour and icon. It only fills in the name while
  // the channel is still called the default, so a name you typed is never
  // overwritten by clicking a platform afterwards.
  function applyPreset(ch, p) {
    const untouched = !ch.name || ch.name.trim() === '' || ch.name === 'New channel'
    updateChannel(ch.id, { preset: p.key, color: p.accent, ...(untouched ? { name: p.label } : {}) })
  }

  function toggleVariable(id, v) {
    const ch = board.channels.find(c => c.id === id)
    if (!ch) return
    const has = (ch.variables || []).includes(v)
    updateChannel(id, { variables: has ? ch.variables.filter(x => x !== v) : [...(ch.variables || []), v] })
  }

  function resetLayout() {
    commit(prev => ({
      ...prev,
      channels: prev.channels.map((c, i) => ({ ...c, x: 60 + (i % 3) * 290, y: 50 + Math.floor(i / 3) * 190 })),
      booked: DEFAULT_BOOKED,
      closed: DEFAULT_CLOSED,
    }))
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }

  if (!data) return null

  const selected = board.channels.find(c => c.id === selectedId) || null
  const hasChannels = board.channels.length > 0

  const contentH = Math.max(600, board.closed.y + CLOSED_H, board.booked.y + BOOKED_H, ...board.channels.map(c => c.y + NODE_H)) + 90
  const contentW = Math.max(900, board.booked.x + BOOKED_W, ...board.channels.map(c => c.x + NODE_W)) + 90

  const btn = { padding: '7px 13px', background: 'var(--card)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }
  const portStyle = { position: 'absolute', width: 13, height: 13, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--text4)', cursor: 'crosshair', touchAction: 'none', zIndex: 3 }

  function Port({ nodeKey, where }) {
    if (readOnly) return null
    const style = where === 'bottom'
      ? { ...portStyle, left: '50%', bottom: -7, transform: 'translateX(-50%)' }
      : { ...portStyle, left: '50%', top: -7, transform: 'translateX(-50%)', cursor: 'default', borderColor: 'var(--text5)' }
    return <div
      onPointerDown={where === 'bottom' ? e => startLink(e, nodeKey) : undefined}
      title={where === 'bottom' ? 'Drag to another box to connect' : ''}
      style={style}
    />
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {!readOnly && hasChannels && (
            <button onClick={() => addChannel()} style={{ ...btn, background: 'var(--text)', color: 'var(--bg)', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPlus s={13} /> Add channel
            </button>
          )}
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.15).toFixed(2)))} style={btn}>-</button>
          <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 42, textAlign: 'center', fontWeight: 600 }}>{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.15).toFixed(2)))} style={btn}>+</button>
          {!readOnly && hasChannels && <button onClick={resetLayout} style={btn}>Reset layout</button>}
          {hasChannels && unassigned.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
              {unassigned.length} variable{unassigned.length === 1 ? '' : 's'} not linked to a channel
            </div>
          )}
        </div>

        <div
          ref={wrapRef}
          onPointerDown={startPan}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          onPointerCancel={onCanvasUp}
          style={{
            position: 'relative',
            height: isMobile ? '62vh' : '72vh',
            background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)', overflow: 'hidden', touchAction: 'none',
            cursor: linking ? 'crosshair' : 'grab',
            backgroundImage: 'radial-gradient(var(--border2) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* empty state */}
          {!hasChannels && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none' }}>
              <button
                onClick={() => addChannel()}
                style={{
                  pointerEvents: 'auto', width: 64, height: 64, borderRadius: 18,
                  background: 'var(--card)', border: '2px dashed var(--border2)', color: 'var(--text2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><IconPlus s={26} w={2} /></button>
              <div style={{ color: 'var(--text3)', fontSize: 12.5, fontWeight: 600 }}>Add your first acquisition channel</div>
            </div>
          )}

          <div style={{ position: 'absolute', left: 0, top: 0, width: contentW, height: contentH, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {/* connectors */}
            <svg width={contentW} height={contentH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {board.connections.map(cn => {
                const s = outPort(cn.from), t = inPort(cn.to)
                if (!s || !t) return null
                const ch = board.channels.find(c => c.id === cn.from)
                const col = cn.from === 'booked' ? 'var(--text4)' : (ch?.color || 'var(--text4)')
                const hot = hoverConn === cn.id
                return (
                  <g key={cn.id}>
                    <path d={curve(s, t)} fill="none" stroke={hot ? '#EF4444' : col} strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" opacity={hot ? 1 : 0.85} />
                    {!readOnly && (
                      <path
                        d={curve(s, t)} fill="none" stroke="transparent" strokeWidth="16"
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        onMouseEnter={() => setHoverConn(cn.id)}
                        onMouseLeave={() => setHoverConn(null)}
                        onPointerDown={e => { e.stopPropagation(); removeConnection(cn.id); setHoverConn(null) }}
                      ><title>Click to remove this connection</title></path>
                    )}
                  </g>
                )
              })}
              {linking && (() => {
                const s = outPort(linking.from)
                return s ? <path d={curve(s, linking.cur)} fill="none" stroke="var(--text3)" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" /> : null
              })()}
            </svg>

            {/* channel boxes */}
            {board.channels.map(ch => {
              const st = channelStats[ch.id] || { initiated: 0, booked: 0, abr: 0, active: false }
              const P = PRESET_BY_KEY[ch.preset]
              const Icon = P?.Icon || IconOther
              const isSel = selectedId === ch.id
              const isHov = hoveredId === ch.id
              return (
                <div
                  key={ch.id}
                  onMouseEnter={() => setHoveredId(ch.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ position: 'absolute', left: ch.x - PAD, top: ch.y, width: NODE_W + PAD * 2, height: NODE_H }}
                >
                  {/* side + handles */}
                  {!readOnly && isHov && ['left', 'right'].map(side => (
                    <button
                      key={side}
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); addBeside(ch, side) }}
                      title={`Add a channel to the ${side}`}
                      style={{
                        position: 'absolute', top: NODE_H / 2 - 13, [side]: 0,
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--card)', border: '1px solid var(--border2)', color: 'var(--text2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)', zIndex: 4, padding: 0,
                      }}
                    ><IconPlus s={13} /></button>
                  ))}

                  <div
                    onPointerDown={e => startDrag(e, 'channel', ch.id)}
                    onPointerMove={onDragMove}
                    onPointerUp={e => endDrag(e, 'channel', ch.id)}
                    onPointerCancel={e => endDrag(e, 'channel', ch.id)}
                    style={{
                      position: 'absolute', left: PAD, top: 0, width: NODE_W, height: NODE_H,
                      background: 'var(--card)',
                      border: `2px solid ${ch.color}`,
                      boxShadow: isSel ? `0 0 0 3px ${hexToRgba(ch.color, 0.28)}` : 'var(--card-shadow)',
                      borderRadius: 14, overflow: 'hidden',
                      cursor: readOnly ? 'default' : 'grab', touchAction: 'none', userSelect: 'none',
                    }}
                  >
                    <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                      {st.active && <span title="Active in the last 7 days" style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0, boxShadow: '0 0 0 3px rgba(52,211,153,0.18)' }} />}
                      <span style={{ color: ch.color === '#E5E7EB' ? 'var(--text2)' : ch.color, display: 'flex', flexShrink: 0 }}><Icon s={15} /></span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--text4)', flexShrink: 0 }}>{(ch.variables || []).length}v</span>
                    </div>

                    <div style={{ display: 'flex', padding: '13px 8px 10px' }}>
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

                    <div style={{ padding: '0 13px', fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(ch.variables || []).length ? ch.variables.join(', ') : 'No variables linked yet'}
                    </div>
                    <Port nodeKey={ch.id} where="bottom" />
                  </div>
                </div>
              )
            })}

            {/* booked + closed only exist once there is something to feed them */}
            {hasChannels && (
              <>
                <div
                  onPointerDown={e => startDrag(e, 'booked')}
                  onPointerMove={onDragMove}
                  onPointerUp={e => endDrag(e, 'booked')}
                  onPointerCancel={e => endDrag(e, 'booked')}
                  style={{
                    position: 'absolute', left: board.booked.x, top: board.booked.y, width: BOOKED_W, height: BOOKED_H,
                    background: 'var(--card)', border: '2px solid #A855F7', borderRadius: 16,
                    boxShadow: 'var(--card-shadow)', overflow: 'hidden',
                    cursor: readOnly ? 'default' : 'grab', touchAction: 'none', userSelect: 'none',
                  }}
                >
                  <div style={{ padding: '11px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Booked</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#A855F7' }}>{bookedStats?.booked ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', padding: '15px 10px 12px' }}>
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
                  <Port nodeKey="booked" where="top" />
                  <Port nodeKey="booked" where="bottom" />
                </div>

                <div
                  onPointerDown={e => startDrag(e, 'closed')}
                  onPointerMove={onDragMove}
                  onPointerUp={e => endDrag(e, 'closed')}
                  onPointerCancel={e => endDrag(e, 'closed')}
                  style={{
                    position: 'absolute', left: board.closed.x, top: board.closed.y, width: CLOSED_W, height: CLOSED_H,
                    background: 'var(--card)', border: '2px solid #34D399', borderRadius: 14,
                    boxShadow: 'var(--card-shadow)', overflow: 'hidden',
                    cursor: readOnly ? 'default' : 'grab', touchAction: 'none', userSelect: 'none',
                  }}
                >
                  <div style={{ padding: '9px 14px', fontSize: 12, fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>Closed</div>
                  <div style={{ textAlign: 'center', padding: '11px 0' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#34D399', letterSpacing: '-0.02em' }}>{bookedStats?.closed ?? 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 700 }}>Deals won</div>
                  </div>
                  <Port nodeKey="closed" where="top" />
                </div>
              </>
            )}
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
              {hasChannels
                ? <>Click a box to rename it, change its colour, and pick the variables that feed it. Drag a box to move it, drag the dot under a box onto another box to connect them, and click a line to remove it.</>
                : <>Hit the plus on the canvas to add your first channel. Hover a box afterwards for a plus on either side.</>}
              {hasChannels && unassigned.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Not linked yet</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {unassigned.map(v => (
                      <span key={v} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'var(--hover-bg)', color: 'var(--text3)' }}>{v}</span>
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
                placeholder="Channel name"
                style={{
                  width: '100%', marginTop: 6, marginBottom: 16, padding: '9px 11px',
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8, marginBottom: 16 }}>
                {CHANNEL_PRESETS.map(p => {
                  const on = selected.preset === p.key
                  return (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(selected, p)}
                      title={p.label}
                      aria-label={p.label}
                      style={{
                        width: 36, height: 36, borderRadius: 9, cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? hexToRgba(p.accent, 0.16) : 'var(--hover-bg)',
                        color: p.accent === '#E5E7EB' ? 'var(--text2)' : p.accent,
                        border: on ? `2px solid ${p.accent}` : '1px solid var(--border)',
                      }}
                    ><p.Icon s={18} /></button>
                  )
                })}
              </div>

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 16, alignItems: 'center' }}>
                {SWATCHES.map(c => (
                  <button key={c} onClick={() => updateChannel(selected.id, { color: c })}
                    style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer', border: selected.color === c ? '2px solid var(--text)' : '1px solid var(--border2)' }} />
                ))}
                {/* custom picker, rainbow so it reads as "any colour" */}
                <label
                  title="Custom colour"
                  style={{
                    width: 22, height: 22, borderRadius: 6, cursor: 'pointer', display: 'block',
                    background: 'conic-gradient(from 0deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
                    border: '1px solid var(--border2)', position: 'relative', overflow: 'hidden',
                  }}
                >
                  <input
                    type="color"
                    value={selected.color}
                    onChange={e => updateChannel(selected.id, { color: e.target.value })}
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Variables ({(selected.variables || []).length}/{allVariables.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {allVariables.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No variables found in the outreach data.</div>}
                {allVariables.map(v => {
                  const on = (selected.variables || []).includes(v)
                  const takenBy = board.channels.find(c => c.id !== selected.id && (c.variables || []).includes(v))
                  return (
                    <button
                      key={v}
                      onClick={() => toggleVariable(selected.id, v)}
                      title={takenBy ? `Also linked to ${takenBy.name}` : ''}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        fontSize: 14, padding: '9px 11px', borderRadius: 9, cursor: 'pointer', fontWeight: 600,
                        background: on ? hexToRgba(selected.color, 0.16) : 'var(--hover-bg)',
                        color: on ? 'var(--text)' : takenBy ? 'var(--text4)' : 'var(--text2)',
                        border: on ? `1px solid ${selected.color}` : '1px solid var(--border)',
                      }}
                    >
                      {activeVars.has(v) && <span title="Active" style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                      {takenBy && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text4)', flexShrink: 0 }}>{takenBy.name}</span>}
                    </button>
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
