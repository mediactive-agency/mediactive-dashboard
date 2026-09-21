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
function IconAccount({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg>
}
function IconOther({ s = 16, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
}
function IconPlus({ s = 14, c = 'currentColor', w = 2.4 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
}

// Account and Other boxes can wear any icon from the library. These are just
// the ones shown before you type a search. The library itself is ~190kB
// gzipped, so it loads as its own chunk when this tab mounts rather than
// riding along in the main bundle for every other tab.
const SUGGESTED_ICONS = [
  'User', 'Users', 'UserPlus', 'Contact', 'Building2', 'Briefcase',
  'Mail', 'Send', 'MessageCircle', 'Phone', 'PhoneCall', 'Megaphone',
  'Globe', 'Link', 'Share2', 'Rss', 'Podcast', 'Video',
  'Target', 'Crosshair', 'TrendingUp', 'BarChart3', 'Zap', 'Flame',
  'Star', 'Heart', 'ThumbsUp', 'Award', 'Trophy', 'Rocket',
  'Calendar', 'CalendarCheck', 'Clock', 'MapPin', 'Tag', 'Bookmark',
  'Search', 'Filter', 'Inbox', 'FileText', 'Handshake', 'Newspaper',
]
let LU = null
let LUCIDE_NAMES = []
let LU_PROMISE = null
function loadLucide() {
  if (!LU_PROMISE) {
    LU_PROMISE = import('lucide-react').then(m => {
      LU = m
      LUCIDE_NAMES = Object.keys(m).filter(k => /^[A-Z]/.test(k) && !['createLucideIcon', 'Icon', 'icons'].includes(k))
      return m
    })
  }
  return LU_PROMISE
}
function LucideIcon({ name, s = 16 }) {
  const C = name && LU?.[name]
  return C ? <C size={s} /> : null
}

// `accent` is the identity colour of the box. LinkedIn and Facebook are both
// blue but use their own brand blues so two boxes side by side are still
// tellable apart. `free` marks the ones whose name, colour and icon you own.
export const CHANNEL_PRESETS = [
  { key: 'linkedin',  label: 'LinkedIn',  accent: '#0A66C2', Icon: IconLinkedIn },
  { key: 'instagram', label: 'Instagram', accent: '#E1306C', Icon: IconInstagram },
  { key: 'facebook',  label: 'Facebook',  accent: '#1877F2', Icon: IconFacebook },
  { key: 'skool',     label: 'Skool',     accent: '#F5B301', Icon: IconSkool },
  { key: 'youtube',   label: 'YouTube',   accent: '#FF0000', Icon: IconYouTube, labels: { first: 'Views' } },
  { key: 'website',   label: 'Website',   accent: '#94A3B8', Icon: IconWebsite, labels: { first: 'Visits', rate: 'CR' } },
  { key: 'account',   label: 'Account',   accent: '#22D3EE', Icon: IconAccount, free: true },
  { key: 'other',     label: 'Other',     accent: '#9CA3AF', Icon: IconOther,   free: true },
]
const PRESET_BY_KEY = Object.fromEntries(CHANNEL_PRESETS.map(p => [p.key, p]))
const isFree = key => !!PRESET_BY_KEY[key]?.free
const customIcon = ch => (isFree(ch.preset) && ch.icon && LU?.[ch.icon]) ? ch.icon : null
const iconFor = ch => (PRESET_BY_KEY[ch.preset] || PRESET_BY_KEY.other).Icon
const labelsFor = ch => (PRESET_BY_KEY[ch.preset] || {}).labels || {}

const SWATCHES = ['#0A66C2', '#E1306C', '#1877F2', '#F5B301', '#FF0000', '#94A3B8', '#22D3EE', '#9CA3AF', '#34D399', '#A78BFA', '#FB923C', '#F472B6']

const NODE_W = 236
const NODE_H = 138
const BOOKED_W = 300
const BOOKED_H = 158

const PAD = 52
const COL_GAP = 56
const LAYER_GAP = 124
const EMPTY_TOP = 96
const SIDE_GUTTER = 42
const TOP_GUTTER = 44

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

function hexToRgba(hex, a) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(156,163,175,${a})`
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

function release(e) {
  try { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* nothing to release */ }
}

function normalizeRows(channels) {
  const used = Array.from(new Set(channels.map(c => c.row ?? 0))).sort((a, b) => a - b)
  const map = Object.fromEntries(used.map((r, i) => [r, i]))
  return channels.map(c => ({ ...c, row: map[c.row ?? 0] ?? 0 }))
}

export default function Channels({ data, filter, customFrom, customTo, user, config, isMobile, readOnly, clientId }) {
  const saved = config?.channels
  const [board, setBoard] = useState(() => ({
    channels: normalizeRows((saved?.channels || []).map(({ x, y, ...c }) => ({ row: 0, ...c }))),
    connections: saved?.connections || (saved?.channels || []).map(c => ({ id: makeId(), from: c.id, to: 'booked' })),
  }))
  const [mode, setMode] = useState('flow')
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [hoverConn, setHoverConn] = useState(null)
  const [linking, setLinking] = useState(null)
  const [nodeDrag, setNodeDrag] = useState(null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [iconOpen, setIconOpen] = useState(false)
  const [iconQuery, setIconQuery] = useState('')
  const [, setLuReady] = useState(!!LU)
  const [view, setView] = useState({ tx: 0, ty: 0, s: 1 })
  const initialized = useRef(false)
  const fittedRef = useRef(false)
  const vpRef = useRef(null)
  const panRef = useRef(null)
  const orderRef = useRef(null)

  useEffect(() => { if (!LU) loadLucide().then(() => setLuReady(true)) }, [])

  useEffect(() => {
    const onKey = e => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'
      if (z && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((z && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!initialized.current && saved?.channels) {
      setBoard({
        channels: normalizeRows(saved.channels.map(({ x, y, ...c }) => ({ row: 0, ...c }))),
        connections: saved.connections || saved.channels.map(c => ({ id: makeId(), from: c.id, to: 'booked' })),
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
  // Every structural change stacks the board as it was, so a misplaced card or
  // a line deleted by accident is one click away from coming back.
  function pushHistory(snapshot) {
    setHistory(h => [...h.slice(-29), snapshot])
  }
  function commit(updater) {
    const next = typeof updater === 'function' ? updater(board) : updater
    pushHistory(board)
    setFuture([])
    setBoard(next)
    persist(next)
  }
  function undo() {
    if (!history.length) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setFuture(f => [...f, board])
    setBoard(prev)
    persist(prev)
    setSelectedId(null)
  }
  function redo() {
    if (!future.length) return
    const next = future[future.length - 1]
    setFuture(f => f.slice(0, -1))
    pushHistory(board)
    setBoard(next)
    persist(next)
    setSelectedId(null)
  }

  const sourcesOf = id => board.connections.filter(c => c.to === id).map(c => c.from)
  const isRoot = id => sourcesOf(id).length === 0

  /* ---------------------------------------------------------------- data */

  const { channelStats, funnel, allVariables, assignedVars, activeVars } = useMemo(() => {
    const empty = { channelStats: {}, funnel: null, allVariables: [], assignedVars: new Set(), activeVars: new Set() }
    if (!data) return empty

    const monthKeys = Object.keys(data).filter(k => k !== 'sales' && k !== 'calendly')
    const allRaw = monthKeys.flatMap(k => parseOutreachMonth(data[k]).rawRows).filter(r => r.varName && r.date)
    const variables = Array.from(new Set(allRaw.map(r => r.varName))).sort()

    const lastSeen = {}
    allRaw.forEach(r => { if (!lastSeen[r.varName] || r.date > lastSeen[r.varName]) lastSeen[r.varName] = r.date })
    const active = new Set(variables.filter(v => daysBetween(lastSeen[v], todayStr) <= GAP_DAYS))

    const inWindow = allRaw.filter(r => inRange(r.date, filter, customFrom, customTo))

    const byId = Object.fromEntries(board.channels.map(c => [c.id, c]))
    const incoming = {}
    board.connections.forEach(cn => { if (byId[cn.to]) (incoming[cn.to] ||= []).push(cn.from) })

    // Own numbers, straight from the variables picked on that card
    const ownStats = {}
    const assigned = new Set()
    board.channels.forEach(ch => {
      const vars = new Set(ch.variables || [])
      vars.forEach(v => assigned.add(v))
      const rows = inWindow.filter(r => vars.has(r.varName))
      ownStats[ch.id] = {
        initiated: rows.length,
        booked: rows.filter(r => r.hasC).length,
        active: (ch.variables || []).some(v => active.has(v)),
      }
    })

    // A card that has something flowing into it rolls those up instead of
    // carrying variables of its own. Only a card at the top of a chain, with
    // nothing feeding it, reads its own variables.
    const memo = {}
    const visiting = new Set()
    function statOf(id) {
      if (memo[id]) return memo[id]
      if (visiting.has(id)) return { initiated: 0, booked: 0, active: false } // cycle guard
      visiting.add(id)
      const feeders = incoming[id] || []
      let out
      if (feeders.length) {
        out = feeders.reduce((acc, f) => {
          const s = statOf(f)
          return { initiated: acc.initiated + s.initiated, booked: acc.booked + s.booked, active: acc.active || s.active }
        }, { initiated: 0, booked: 0, active: false })
      } else {
        out = ownStats[id] || { initiated: 0, booked: 0, active: false }
      }
      visiting.delete(id)
      memo[id] = out
      return out
    }

    const stats = {}
    board.channels.forEach(ch => {
      const s = statOf(ch.id)
      stats[ch.id] = { ...s, abr: pct(s.booked, s.initiated), rollup: (incoming[ch.id] || []).length }
    })

    // The sales sheet has no channel column, so show up and close stay
    // sheet-wide rather than split per channel.
    const salesRows = (data.sales || []).slice(1).filter(r => r && r[0])
      .filter(r => inRange(toSalesDateStr(r[1]), filter, customFrom, customTo))
    const held = salesRows.length
    const closed = salesRows.filter(r => String(r[5] || '').toLowerCase() === 'yes').length

    const feeding = board.connections.filter(c => c.to === 'booked').map(c => c.from).filter(id => byId[id])
    const initiatedTotal = feeding.reduce((s, id) => s + statOf(id).initiated, 0)
    const bookedTotal = feeding.reduce((s, id) => s + statOf(id).booked, 0)

    return {
      channelStats: stats,
      funnel: {
        initiated: initiatedTotal, booked: bookedTotal, held, closed,
        showUp: pct(held, bookedTotal), closeRate: pct(closed, held),
        feeding,
      },
      allVariables: variables, assignedVars: assigned, activeVars: active,
    }
  }, [data, filter, customFrom, customTo, board.channels, board.connections])

  const unassigned = allVariables.filter(v => !assignedVars.has(v))

  /* ------------------------------------------------------------- layout */

  const layout = useMemo(() => {
    const rows = []
    board.channels.forEach(ch => {
      const r = ch.row ?? 0
      if (!rows[r]) rows[r] = []
      rows[r].push(ch)
    })
    const filled = rows.filter(Boolean)
    const rowWidths = filled.map(l => l.length * NODE_W + (l.length - 1) * COL_GAP)
    const width = Math.max(BOOKED_W + PAD * 2, 860, ...rowWidths.map(w => w + PAD * 2))
    const pos = {}
    filled.forEach((list, r) => {
      let x = (width - rowWidths[r]) / 2
      list.forEach(ch => { pos[ch.id] = { x, y: PAD + r * (NODE_H + LAYER_GAP), row: r }; x += NODE_W + COL_GAP })
    })
    const nRows = filled.length
    const booked = { x: (width - BOOKED_W) / 2, y: PAD + (nRows ? nRows * (NODE_H + LAYER_GAP) : EMPTY_TOP) }
    return { pos, booked, rows: filled, width, height: booked.y + BOOKED_H + PAD }
  }, [board.channels])

  const slotX = id => (nodeDrag && nodeDrag.id === id) ? nodeDrag.curX : (layout.pos[id]?.x ?? 0)
  const nodeBox = key => key === 'booked'
    ? { ...layout.booked, w: BOOKED_W, h: BOOKED_H }
    : layout.pos[key] ? { x: slotX(key), y: layout.pos[key].y, w: NODE_W, h: NODE_H } : null
  const outPort = k => { const b = nodeBox(k); return b && { x: b.x + b.w / 2, y: b.y + b.h } }
  const inPort = k => { const b = nodeBox(k); return b && { x: b.x + b.w / 2, y: b.y } }
  const curve = (s, t) => { const m = (s.y + t.y) / 2; return `M ${s.x} ${s.y} C ${s.x} ${m}, ${t.x} ${m}, ${t.x} ${t.y}` }

  /* ---------------------------------------------------------------- view */

  const toCanvas = (cx, cy) => {
    const r = vpRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: (cx - r.left - view.tx) / view.s, y: (cy - r.top - view.ty) / view.s }
  }

  function fitView() {
    const vp = vpRef.current
    if (!vp) return
    const r = vp.getBoundingClientRect()
    const s = Math.max(Math.min((r.width - 80) / layout.width, (r.height - 80) / layout.height, 1), 0.25)
    setView({ s, tx: (r.width - layout.width * s) / 2, ty: Math.max(20, (r.height - layout.height * s) / 2) })
  }

  useEffect(() => {
    if (!fittedRef.current && mode === 'flow') { fittedRef.current = true; fitView() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  function zoomAt(cx, cy, factor) {
    const r = vpRef.current?.getBoundingClientRect()
    if (!r) return
    const px = cx - r.left, py = cy - r.top
    setView(v => {
      const s = Math.min(Math.max(v.s * factor, 0.25), 2.2)
      const k = s / v.s
      return { s, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }
    })
  }

  useEffect(() => {
    const vp = vpRef.current
    if (!vp || mode !== 'flow') return
    const onWheel = e => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01))
      else setView(v => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }))
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.s, mode])

  /* --------------------------------------------------- reorder dragging */

  function startNodeDrag(e, id) {
    if (readOnly) return
    e.stopPropagation(); e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const ox = layout.pos[id].x
    setNodeDrag({ id, startClientX: e.clientX, startClientY: e.clientY, origX: ox, curX: ox, moved: false, boardAtStart: board })
    orderRef.current = null
  }

  function onNodeDragMove(e) {
    const nd = nodeDrag
    if (!nd) return
    const dx = e.clientX - nd.startClientX
    const moved = nd.moved || Math.hypot(dx, e.clientY - nd.startClientY) > 4
    const curX = nd.origX + dx / view.s
    setNodeDrag(prev => prev && { ...prev, curX, moved })
    if (!moved) return
    const row = layout.pos[nd.id]?.row ?? 0
    const sibs = board.channels.filter(c => (c.row ?? 0) === row)
    const withPos = sibs.map(c => ({ id: c.id, x: c.id === nd.id ? curX : layout.pos[c.id].x })).sort((a, b) => a.x - b.x)
    const newOrder = withPos.map(p => p.id)
    const key = row + ':' + newOrder.join(',')
    if (key !== orderRef.current) {
      orderRef.current = key
      setBoard(prev => {
        const byId = Object.fromEntries(prev.channels.map(c => [c.id, c]))
        let i = 0
        return { ...prev, channels: prev.channels.map(c => (c.row ?? 0) === row ? byId[newOrder[i++]] : c) }
      })
    }
  }

  function endNodeDrag(e, id) {
    release(e)
    const nd = nodeDrag
    setNodeDrag(null)
    orderRef.current = null
    if (!nd) return
    if (nd.moved) {
      pushHistory(nd.boardAtStart)
      setFuture([])
      setBoard(prev => { persist(prev); return prev })
    } else setSelectedId(prev => prev === id ? null : id)
  }

  /* ------------------------------------------------------------- linking */

  function startLink(e, fromKey) {
    if (readOnly) return
    e.stopPropagation(); e.preventDefault()
    setLinking({ from: fromKey, cur: toCanvas(e.clientX, e.clientY) })
  }
  function hitNode(pt) {
    for (const k of [...board.channels.map(c => c.id), 'booked']) {
      const b = nodeBox(k)
      if (b && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return k
    }
    return null
  }
  function onCanvasMove(e) {
    if (linking) { setLinking(l => l && { ...l, cur: toCanvas(e.clientX, e.clientY) }); return }
    const p = panRef.current
    if (p) setView(v => ({ ...v, tx: p.tx0 + (e.clientX - p.startX), ty: p.ty0 + (e.clientY - p.startY) }))
  }
  function onCanvasUp(e) {
    if (linking) {
      const target = hitNode(toCanvas(e.clientX, e.clientY))
      if (target && target !== linking.from && !board.connections.some(c => c.from === linking.from && c.to === target)) {
        commit(prev => ({ ...prev, connections: [...prev.connections, { id: makeId(), from: linking.from, to: target }] }))
      }
      setLinking(null)
      return
    }
    panRef.current = null
    release(e)
  }
  // Empty canvas covers both the viewport and the transform layer above it,
  // so either one starting a pan also clears the selection.
  function startPan(e) {
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    panRef.current = { startX: e.clientX, startY: e.clientY, tx0: view.tx, ty0: view.ty }
    vpRef.current?.setPointerCapture?.(e.pointerId)
    setSelectedId(null)
    setIconOpen(false)
  }

  /* ------------------------------------------------------------- actions */

  const newChannel = row => ({ id: makeId(), name: 'New channel', preset: 'other', color: PRESET_BY_KEY.other.accent, variables: [], row })

  function addBeside(ch, side) {
    const fresh = newChannel(ch.row ?? 0)
    commit(prev => {
      const idx = prev.channels.findIndex(c => c.id === ch.id)
      const list = [...prev.channels]
      list.splice(side === 'left' ? idx : idx + 1, 0, fresh)
      const targets = prev.connections.filter(c => c.from === ch.id).map(c => c.to)
      const links = (targets.length ? targets : ['booked']).map(t => ({ id: makeId(), from: fresh.id, to: t }))
      return { channels: normalizeRows(list), connections: [...prev.connections, ...links] }
    })
    setSelectedId(fresh.id)
  }

  // Feeds a card from above. Placement is worked out from the wiring rather
  // than from array position: the new card slots in after every card in the
  // upper row that already feeds something at or before this one, which keeps
  // separate branches from interleaving.
  function addAbove(ch) {
    const at = ch.row ?? 0
    const fresh = newChannel(Math.max(at - 1, 0))
    commit(prev => {
      const link = { id: makeId(), from: fresh.id, to: ch.id }
      if (at === 0) {
        const shifted = prev.channels.map(c => ({ ...c, row: (c.row ?? 0) + 1 }))
        return { channels: normalizeRows([fresh, ...shifted]), connections: [...prev.connections, link] }
      }
      const rowList = prev.channels.filter(c => (c.row ?? 0) === at)
      const childIdx = rowList.findIndex(c => c.id === ch.id)
      const upper = prev.channels.filter(c => (c.row ?? 0) === at - 1)
      const feedIdx = u => {
        const idxs = prev.connections.filter(c => c.from === u.id)
          .map(c => rowList.findIndex(r => r.id === c.to)).filter(i => i >= 0)
        return idxs.length ? Math.min(...idxs) : Infinity
      }
      const before = upper.filter(u => feedIdx(u) <= childIdx).length
      const list = [...prev.channels]
      const anchor = upper[before - 1]
      list.splice(anchor ? list.findIndex(c => c.id === anchor.id) + 1
        : upper.length ? list.findIndex(c => c.id === upper[0].id) : list.length, 0, fresh)
      return { channels: normalizeRows(list), connections: [...prev.connections, link] }
    })
    setSelectedId(fresh.id)
  }

  function addFirstChannel() {
    const fresh = newChannel(0)
    commit(prev => ({
      channels: normalizeRows([...prev.channels, fresh]),
      connections: [...prev.connections, { id: makeId(), from: fresh.id, to: 'booked' }],
    }))
    setSelectedId(fresh.id)
  }

  const updateChannel = (id, patch) => commit(prev => ({ ...prev, channels: prev.channels.map(c => c.id === id ? { ...c, ...patch } : c) }))

  function removeChannel(id) {
    commit(prev => ({
      channels: normalizeRows(prev.channels.filter(c => c.id !== id)),
      connections: prev.connections.filter(c => c.from !== id && c.to !== id),
    }))
    setSelectedId(null)
  }
  const removeConnection = id => commit(prev => ({ ...prev, connections: prev.connections.filter(c => c.id !== id) }))

  function applyPreset(ch, p) {
    if (p.free) {
      const wasLocked = !isFree(ch.preset)
      updateChannel(ch.id, { preset: p.key, ...(wasLocked ? { name: p.key === 'account' ? 'Account' : 'New channel', color: p.accent, icon: null } : {}) })
    } else {
      updateChannel(ch.id, { preset: p.key, color: p.accent, name: p.label })
    }
  }

  function toggleVariable(id, v) {
    const ch = board.channels.find(c => c.id === id)
    if (!ch) return
    const has = (ch.variables || []).includes(v)
    updateChannel(id, { variables: has ? ch.variables.filter(x => x !== v) : [...(ch.variables || []), v] })
  }

  if (!data) return null

  const selected = board.channels.find(c => c.id === selectedId) || null
  const locked = selected ? !isFree(selected.preset) : false
  const selFeeders = selected ? sourcesOf(selected.id).map(id => board.channels.find(c => c.id === id)).filter(Boolean) : []
  const iconResults = iconQuery.trim()
    ? LUCIDE_NAMES.filter(n => n.toLowerCase().includes(iconQuery.trim().toLowerCase())).slice(0, 96)
    : SUGGESTED_ICONS
  const hasChannels = board.channels.length > 0

  const addBtn = {
    borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border2)', color: 'var(--text2)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)', zIndex: 5,
  }

  function Port({ nodeKey, where }) {
    if (readOnly) return null
    const base = { position: 'absolute', width: 13, height: 13, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--text4)', left: '50%', transform: 'translateX(-50%)', zIndex: 3, touchAction: 'none' }
    return where === 'bottom'
      ? <div onPointerDown={e => startLink(e, nodeKey)} title="Drag onto another box to connect" style={{ ...base, bottom: -7, cursor: 'crosshair' }} />
      : <div style={{ ...base, top: -7, borderColor: 'var(--text5)' }} />
  }

  const tab = on => ({
    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 7, border: 'none',
    background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text3)',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
  })

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{`@keyframes chFlow { to { stroke-dashoffset: -28 } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--filter-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
          <button onClick={() => setMode('flow')} style={tab(mode === 'flow')}>Flow</button>
          <button onClick={() => setMode('sankey')} style={tab(mode === 'sankey')}>Sankey</button>
        </div>
        {!readOnly && [
          { key: 'undo', label: 'Undo', on: undo, can: history.length, d: 'M9 14L4 9l5-5 M4 9h11a5 5 0 010 10h-3' },
          { key: 'redo', label: 'Redo', on: redo, can: future.length, d: 'M15 14l5-5-5-5 M20 9H9a5 5 0 000 10h3' },
        ].map(b => (
          <button key={b.key} onClick={b.on} disabled={!b.can} title={`${b.label} (${b.key === 'undo' ? 'Ctrl+Z' : 'Ctrl+Shift+Z'})`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              color: b.can ? 'var(--text2)' : 'var(--text5)',
              cursor: b.can ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
              opacity: b.can ? 1 : 0.5,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={b.d}/></svg>
            {b.label}
          </button>
        ))}
        {hasChannels && unassigned.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
            {unassigned.length} variable{unassigned.length === 1 ? '' : 's'} not linked
          </div>
        )}
      </div>

      {mode === 'sankey' ? (
        <SankeyView board={board} stats={channelStats} funnel={funnel} isMobile={isMobile}
          selectedId={selectedId} onSelect={id => setSelectedId(prev => prev === id ? null : id)} />
      ) : (
        <div
          ref={vpRef}
          onPointerDown={startPan}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          onPointerCancel={onCanvasUp}
          style={{
            position: 'relative', height: isMobile ? '62vh' : '74vh',
            background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow)', overflow: 'hidden', touchAction: 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
            cursor: linking ? 'crosshair' : 'grab',
            backgroundImage: 'radial-gradient(var(--border2) 1px, transparent 1px)',
            backgroundSize: `${24 * view.s}px ${24 * view.s}px`,
            backgroundPosition: `${view.tx}px ${view.ty}px`,
          }}
        >
          <div
            onPointerDown={startPan}
            style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`, transformOrigin: '0 0' }}
          >
            <svg width={layout.width} height={layout.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
              {board.connections.map(cn => {
                const s = outPort(cn.from), t = inPort(cn.to)
                if (!s || !t) return null
                const ch = board.channels.find(c => c.id === cn.from)
                const hot = hoverConn === cn.id
                return (
                  <g key={cn.id}>
                    <path d={curve(s, t)} fill="none" stroke={hot ? '#EF4444' : hexToRgba(ch?.color || '#9CA3AF', 0.7)}
                      strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round"
                      style={{ animation: nodeDrag ? 'none' : 'chFlow 1.1s linear infinite' }} />
                    {!readOnly && (
                      <path d={curve(s, t)} fill="none" stroke="transparent" strokeWidth="16"
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        onMouseEnter={() => setHoverConn(cn.id)} onMouseLeave={() => setHoverConn(null)}
                        onPointerDown={e => { e.stopPropagation(); removeConnection(cn.id); setHoverConn(null) }}
                      ><title>Click to remove this connection</title></path>
                    )}
                  </g>
                )
              })}
              {linking && (() => { const s = outPort(linking.from); return s ? <path d={curve(s, linking.cur)} fill="none" stroke="var(--text3)" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" /> : null })()}
              {!hasChannels && <path d={`M ${layout.booked.x + BOOKED_W / 2} ${layout.booked.y - 44} L ${layout.booked.x + BOOKED_W / 2} ${layout.booked.y}`} stroke="var(--border2)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" fill="none" />}
            </svg>

            {board.channels.map(ch => {
              const st = channelStats[ch.id] || { initiated: 0, booked: 0, abr: 0, active: false, rollup: 0 }
              const Icon = iconFor(ch)
              const lab = labelsFor(ch)
              const isSel = selectedId === ch.id
              const isHov = hoveredId === ch.id
              const isDragging = nodeDrag?.id === ch.id && nodeDrag.moved
              const showHandles = !readOnly && isHov && !nodeDrag
              return (
                <div key={ch.id}
                  onMouseEnter={() => setHoveredId(ch.id)} onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: 'absolute', left: slotX(ch.id) - SIDE_GUTTER, top: layout.pos[ch.id].y - TOP_GUTTER,
                    width: NODE_W + SIDE_GUTTER * 2, height: NODE_H + TOP_GUTTER,
                    zIndex: isDragging ? 6 : isHov ? 2 : 1, transition: nodeDrag ? 'none' : 'left 0.16s ease',
                  }}>
                  {showHandles && (
                    <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); addAbove(ch) }}
                      title="Add a feeder above this one"
                      style={{ ...addBtn, position: 'absolute', top: 0, left: '50%', marginLeft: -14, width: 28, height: 28 }}><IconPlus s={14} /></button>
                  )}
                  {showHandles && ['left', 'right'].map(side => (
                    <button key={side} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); addBeside(ch, side) }}
                      title={`Add a channel to the ${side}`}
                      style={{ ...addBtn, position: 'absolute', top: TOP_GUTTER + NODE_H / 2 - 14, [side]: 2, width: 28, height: 28 }}><IconPlus s={14} /></button>
                  ))}

                  <div onPointerDown={e => startNodeDrag(e, ch.id)} onPointerMove={onNodeDragMove}
                    onPointerUp={e => endNodeDrag(e, ch.id)} onPointerCancel={e => endNodeDrag(e, ch.id)}
                    style={{
                      position: 'absolute', left: SIDE_GUTTER, top: TOP_GUTTER, width: NODE_W, height: NODE_H,
                      background: 'var(--card)',
                      border: `${isSel ? 2 : 1.5}px solid ${isSel ? ch.color : hexToRgba(ch.color, 0.55)}`,
                      boxShadow: isDragging ? '0 10px 26px rgba(0,0,0,0.26)' : 'var(--card-shadow)',
                      borderRadius: 14, overflow: 'hidden',
                      cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab', touchAction: 'none',
                    }}>
                    <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                      {st.active && <span title="Active in the last 7 days" style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0, boxShadow: '0 0 0 3px rgba(52,211,153,0.18)' }} />}
                      <span style={{ color: ch.color, display: 'flex', flexShrink: 0 }}>
                        {customIcon(ch) ? <LucideIcon name={ch.icon} s={15} /> : <Icon s={15} />}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--text4)', flexShrink: 0 }}>
                        {st.rollup ? `${st.rollup}\u2193` : `${(ch.variables || []).length}v`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', padding: '13px 8px 10px' }}>
                      {[
                        { lbl: lab.first || 'Initiated', val: st.initiated, color: '#60A5FA' },
                        { lbl: 'Booked', val: st.booked, color: '#A855F7' },
                        { lbl: lab.rate || 'ABR', val: `${st.abr}%`, color: '#34D399' },
                      ].map((m, k) => (
                        <div key={m.lbl} style={{ flex: 1, textAlign: 'center', borderLeft: k ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ fontSize: 19, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
                          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, fontWeight: 700 }}>{m.lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '0 13px', fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.rollup
                        ? `Rolled up from ${st.rollup} feeding ${st.rollup === 1 ? 'card' : 'cards'}`
                        : (ch.variables || []).length ? ch.variables.join(', ') : 'No variables linked yet'}
                    </div>
                    <Port nodeKey={ch.id} where="bottom" />
                  </div>
                </div>
              )
            })}

            {!readOnly && !hasChannels && (
              <div style={{ position: 'absolute', left: layout.booked.x + BOOKED_W / 2 - 60, top: layout.booked.y - 44 - 58, width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                <button onClick={addFirstChannel} title="Add your first channel" style={{ ...addBtn, width: 52, height: 52, borderStyle: 'dashed' }}><IconPlus s={22} w={2} /></button>
                <div style={{ color: 'var(--text3)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Add a channel</div>
              </div>
            )}

            <div style={{
              position: 'absolute', left: layout.booked.x, top: layout.booked.y, width: BOOKED_W, height: BOOKED_H,
              background: 'var(--card)', border: `1.5px solid ${hexToRgba('#A855F7', 0.55)}`, borderRadius: 16,
              boxShadow: 'var(--card-shadow)', overflow: 'hidden',
            }}>
              <div style={{ padding: '11px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Booked Calls</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#A855F7' }}>{funnel?.booked ?? 0}</span>
              </div>
              <div style={{ display: 'flex', padding: '15px 10px 12px' }}>
                {[
                  { lbl: 'Show Up Rate', val: `${funnel?.showUp ?? 0}%`, sub: `${funnel?.held ?? 0} held`, color: '#FBBF24' },
                  { lbl: 'Close Rate', val: `${funnel?.closeRate ?? 0}%`, sub: `${funnel?.closed ?? 0} closed`, color: '#34D399' },
                ].map((m, i) => (
                  <div key={m.lbl} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3, fontWeight: 700 }}>{m.lbl}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <Port nodeKey="booked" where="top" />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- inspector, floats over the canvas when open ----- */}
      {!readOnly && selected && (
        <div style={{
          position: 'absolute', zIndex: 30, top: isMobile ? 'auto' : 60, bottom: 14,
          right: isMobile ? 8 : 14, left: isMobile ? 8 : 'auto',
          width: isMobile ? 'auto' : 300, maxHeight: isMobile ? '52vh' : 'none',
          background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border2)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.32)', padding: 18, overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 13 }}>Channel</div>
            <button onClick={() => removeChannel(selected.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Delete</button>
            <button onClick={() => setSelectedId(null)} title="Close" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>

          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: locked ? 8 : (iconOpen ? 8 : 16) }}>
            {!locked && (
              <button onClick={() => { setIconOpen(o => !o); setIconQuery('') }} title="Choose an icon"
                style={{
                  width: 38, height: 38, flexShrink: 0, borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  background: iconOpen ? hexToRgba(selected.color, 0.16) : 'var(--bg2)',
                  border: `1px solid ${iconOpen ? selected.color : 'var(--border)'}`, color: selected.color,
                }}>
                {customIcon(selected) ? <LucideIcon name={selected.icon} s={18} /> : (() => { const D = iconFor(selected); return <D s={18} /> })()}
              </button>
            )}
            <input value={selected.name} disabled={locked}
              onChange={e => updateChannel(selected.id, { name: e.target.value })} placeholder="Channel name"
              style={{
                flex: 1, minWidth: 0, padding: '9px 11px',
                background: locked ? 'var(--hover-bg)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                color: locked ? 'var(--text3)' : 'var(--text)', fontSize: 13, fontWeight: 600,
                outline: 'none', boxSizing: 'border-box', cursor: locked ? 'not-allowed' : 'text',
              }} />
          </div>

          {!locked && iconOpen && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 16 }}>
              <input value={iconQuery} onChange={e => setIconQuery(e.target.value)} placeholder="Search all icons" autoFocus
                style={{ width: '100%', padding: '7px 9px', marginBottom: 8, boxSizing: 'border-box', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12, outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxHeight: 190, overflowY: 'auto' }}>
                <button onClick={() => { updateChannel(selected.id, { icon: null }); setIconOpen(false) }} title="Default"
                  style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 6, cursor: 'pointer', background: !selected.icon ? hexToRgba(selected.color, 0.16) : 'var(--card)', border: !selected.icon ? `1.5px solid ${selected.color}` : '1px solid var(--border)', color: !selected.icon ? selected.color : 'var(--text3)' }}>
                  {(() => { const D = iconFor(selected); return <D s={15} /> })()}
                </button>
                {iconResults.map(name => {
                  const on = selected.icon === name
                  return (
                    <button key={name} onClick={() => { updateChannel(selected.id, { icon: name }); setIconOpen(false) }} title={name}
                      style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 6, cursor: 'pointer', background: on ? hexToRgba(selected.color, 0.16) : 'var(--card)', border: on ? `1.5px solid ${selected.color}` : '1px solid var(--border)', color: on ? selected.color : 'var(--text3)' }}>
                      <LucideIcon name={name} s={15} />
                    </button>
                  )
                })}
              </div>
              {iconQuery.trim() && iconResults.length === 0 && <div style={{ fontSize: 11, color: 'var(--text4)', padding: '8px 2px 2px' }}>No icon matches that.</div>}
            </div>
          )}

          {locked && <div style={{ fontSize: 10.5, color: 'var(--text4)', marginBottom: 16, lineHeight: 1.5 }}>Name, colour and icon are fixed for a real platform. Switch to Account or Other to set your own.</div>}

          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8, marginBottom: 16 }}>
            {CHANNEL_PRESETS.map(p => {
              const on = selected.preset === p.key
              return (
                <button key={p.key} onClick={() => applyPreset(selected, p)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px 4px', borderRadius: 11, cursor: 'pointer', background: on ? hexToRgba(p.accent, 0.14) : 'var(--hover-bg)', border: on ? `1.5px solid ${p.accent}` : '1px solid var(--border)' }}>
                  <span style={{ color: p.accent, display: 'flex' }}><p.Icon s={26} /></span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text2)' }}>{p.label}</span>
                </button>
              )
            })}
          </div>

          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 16, alignItems: 'center', opacity: locked ? 0.4 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
            {SWATCHES.map(c => (
              <button key={c} onClick={() => updateChannel(selected.id, { color: c })}
                style={{ width: 24, height: 24, borderRadius: 7, background: c, cursor: 'pointer', border: selected.color === c ? '2px solid var(--text)' : '1px solid var(--border2)' }} />
            ))}
            <label title="Custom colour" style={{ width: 24, height: 24, borderRadius: 7, cursor: 'pointer', display: 'block', background: 'conic-gradient(from 0deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)', border: '1px solid var(--border2)', overflow: 'hidden' }}>
              <input type="color" value={selected.color} onChange={e => updateChannel(selected.id, { color: e.target.value })} style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
            </label>
          </div>

          {selFeeders.length > 0 ? (
            <>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fed by</label>
              <div style={{ fontSize: 11, color: 'var(--text4)', margin: '7px 0 9px', lineHeight: 1.5 }}>
                Numbers roll up from what flows in, so this card has no variables of its own.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selFeeders.map(f => (
                  <button key={f.id} onClick={() => setSelectedId(f.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', fontSize: 13, padding: '9px 11px', borderRadius: 9, cursor: 'pointer', fontWeight: 600, background: 'var(--hover-bg)', color: 'var(--text2)', border: `1px solid ${hexToRgba(f.color, 0.5)}` }}>
                    <span style={{ color: f.color, display: 'flex' }}>{customIcon(f) ? <LucideIcon name={f.icon} s={14} /> : (() => { const D = iconFor(f); return <D s={14} /> })()}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text4)' }}>{channelStats[f.id]?.initiated ?? 0}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Variables ({(selected.variables || []).length}/{allVariables.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {allVariables.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No variables found in the outreach data.</div>}
                {allVariables.map(v => {
                  const on = (selected.variables || []).includes(v)
                  const takenBy = board.channels.find(c => c.id !== selected.id && (c.variables || []).includes(v))
                  return (
                    <button key={v} onClick={() => toggleVariable(selected.id, v)} title={takenBy ? `Also linked to ${takenBy.name}` : ''}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        fontSize: 14, padding: '9px 11px', borderRadius: 9, cursor: 'pointer', fontWeight: 600,
                        background: on ? hexToRgba(selected.color, 0.14) : 'var(--hover-bg)',
                        color: on ? 'var(--text)' : takenBy ? 'var(--text4)' : 'var(--text2)',
                        border: on ? `1px solid ${hexToRgba(selected.color, 0.7)}` : '1px solid var(--border)',
                      }}>
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

/* ========================================================== sankey view */

const DROP = '#EF4444'
const KEEP = '#34D399'
const BAR_W = 13
const V_GAP = 18
const MAX_GAP = 96
const LABEL_PAD = 11

// Minimal layered sankey. One scale across every column so ribbon thickness is
// comparable left to right, which is the whole point of reading it this way.
function layoutSankey(nodes, links, W, H) {
  const byCol = {}
  nodes.forEach(n => { (byCol[n.col] ||= []).push(n) })
  const cols = Object.keys(byCol).map(Number).sort((a, b) => a - b)
  const usable = H - 20
  const maxTotal = Math.max(1, ...cols.map(c => byCol[c].reduce((s, n) => s + n.value, 0)))
  const maxGaps = Math.max(0, ...cols.map(c => (byCol[c].length - 1) * V_GAP))
  const scale = Math.max((usable - maxGaps) / maxTotal, 0.0001)
  const step = cols.length > 1 ? (W - BAR_W) / (cols.length - 1) : 0

  cols.forEach((c, ci) => {
    const list = byCol[c]
    const barsH = list.reduce((s, n) => s + Math.max(3, n.value * scale), 0)
    // A late column holding a handful of small stages has most of the height
    // going spare, so its gap grows to use it instead of stacking everything in
    // a cramped band. Dense columns keep the tight gap.
    const free = Math.max(0, usable - barsH)
    const gap = list.length > 1
      ? Math.min(MAX_GAP, Math.max(V_GAP, free / (list.length + 1)))
      : 0
    let y = 10 + (usable - (barsH + gap * (list.length - 1))) / 2
    list.forEach(n => {
      n.h = Math.max(3, n.value * scale)
      n.y = y
      n.x = ci * step
      y += n.h + gap
    })
  })

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const live = links.filter(l => byId[l.from] && byId[l.to] && l.value > 0)
  const thick = l => Math.max(1.5, l.value * scale)
  const key = l => l.from + '>' + l.to

  // Ribbons attach in the vertical order of the node at the other end. Without
  // this they stack in whatever order the connections happen to sit in, which
  // is what made them cross over each other for no reason.
  const out = {}, inc = {}
  live.forEach(l => { (out[l.from] ||= []).push(l); (inc[l.to] ||= []).push(l) })
  const sy = {}, ty = {}
  Object.entries(out).forEach(([id, list]) => {
    list.sort((a, b) => byId[a.to].y - byId[b.to].y)
    let off = 0
    list.forEach(l => { sy[key(l)] = byId[id].y + off; off += thick(l) })
  })
  Object.entries(inc).forEach(([id, list]) => {
    list.sort((a, b) => byId[a.from].y - byId[b.from].y)
    let off = 0
    list.forEach(l => { ty[key(l)] = byId[id].y + off; off += thick(l) })
  })

  const ribbons = live.map(l => {
    const a = byId[l.from], b = byId[l.to]
    const h = thick(l)
    const s0 = sy[key(l)], t0 = ty[key(l)]
    const mx = (a.x + BAR_W + b.x) / 2
    return {
      key: key(l), from: l.from, to: l.to, color: l.color,
      d: `M ${a.x + BAR_W} ${s0} C ${mx} ${s0}, ${mx} ${t0}, ${b.x} ${t0}`
        + ` L ${b.x} ${t0 + h} C ${mx} ${t0 + h}, ${mx} ${s0 + h}, ${a.x + BAR_W} ${s0 + h} Z`,
    }
  })

  return { nodes, ribbons }
}

function SankeyView({ board, stats, funnel, isMobile, selectedId, onSelect }) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 900, h: 520 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setSize({ w: Math.max(380, r.width), h: Math.max(320, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Labels sit to the right of every bar, so the chart area stops short of the
  // container and leaves the last column room to write into.
  const LABEL_W = isMobile ? 104 : 150
  const chartW = Math.max(120, size.w - LABEL_W - 16)
  const chartH = size.h - 16

  const model = useMemo(() => {
    const rows = []
    board.channels.forEach(ch => {
      const r = ch.row ?? 0
      if (!rows[r]) rows[r] = []
      rows[r].push(ch)
    })
    const filled = rows.filter(Boolean)
    const nRows = filled.length
    if (!nRows) return { nodes: [], ribbons: [] }

    const lastRow = filled[nRows - 1]
    const booked = lastRow.reduce((s, ch) => s + (stats[ch.id]?.booked || 0), 0)
    const initiated = lastRow.reduce((s, ch) => s + (stats[ch.id]?.initiated || 0), 0)
    // The sales sheet is not per channel, so held can outrun what the board
    // says was booked. Clamp so the ribbons stay honest.
    const held = Math.min(funnel?.held || 0, booked)
    const closed = Math.min(funnel?.closed || 0, held)

    const nodes = []
    filled.forEach((list, r) => {
      list.forEach(ch => nodes.push({
        id: ch.id, label: ch.name, value: stats[ch.id]?.initiated || 0,
        col: r, color: ch.color, channel: ch, active: stats[ch.id]?.active,
      }))
    })
    nodes.push(
      { id: '__booked', label: 'Booked', value: booked, col: nRows, color: '#A855F7' },
      { id: '__nobook', label: 'No booking', value: Math.max(0, initiated - booked), col: nRows, color: DROP },
      { id: '__held', label: 'Held', value: held, col: nRows + 1, color: '#FBBF24' },
      { id: '__noshow', label: 'No show', value: Math.max(0, booked - held), col: nRows + 1, color: DROP },
      { id: '__closed', label: 'Closed', value: closed, col: nRows + 2, color: KEEP },
      { id: '__lost', label: 'Lost', value: Math.max(0, held - closed), col: nRows + 2, color: DROP },
    )

    const links = []
    // channel to channel, following the wiring on the board
    board.connections.forEach(cn => {
      const src = board.channels.find(c => c.id === cn.from)
      const dst = board.channels.find(c => c.id === cn.to)
      if (!src || !dst) return
      links.push({ from: src.id, to: dst.id, value: stats[src.id]?.initiated || 0, color: hexToRgba(src.color, 0.3) })
    })
    // last channel row splits into booked and the miss, per channel, so you can
    // see which one actually carried the bookings
    lastRow.forEach(ch => {
      const st = stats[ch.id] || { initiated: 0, booked: 0 }
      links.push({ from: ch.id, to: '__booked', value: st.booked, color: hexToRgba(ch.color, 0.34) })
      links.push({ from: ch.id, to: '__nobook', value: Math.max(0, st.initiated - st.booked), color: hexToRgba(DROP, 0.16) })
    })
    links.push(
      { from: '__booked', to: '__held', value: held, color: hexToRgba('#FBBF24', 0.3) },
      { from: '__booked', to: '__noshow', value: Math.max(0, booked - held), color: hexToRgba(DROP, 0.16) },
      { from: '__held', to: '__closed', value: closed, color: hexToRgba(KEEP, 0.32) },
      { from: '__held', to: '__lost', value: Math.max(0, held - closed), color: hexToRgba(DROP, 0.16) },
    )

    return layoutSankey(nodes.filter(n => n.value > 0), links, chartW, chartH)
  }, [board.channels, board.connections, stats, funnel, chartW, chartH])

  // Only channel nodes are editable, so only they light up on hover. The funnel
  // stages stay inert rather than inviting a click that does nothing.
  const editable = id => model.nodes.some(n => n.id === id && n.channel)
  const dim = id => hover && hover !== id
  const touching = r => !hover || r.from === hover || r.to === hover

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)', padding: isMobile ? 12 : 18,
      height: isMobile ? '62vh' : '74vh', boxSizing: 'border-box',
    }}>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        {!model.nodes.length ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12.5 }}>
            Nothing to chart yet. Add channels on the Flow view and link variables to them.
          </div>
        ) : (
          <>
            <svg width={chartW + LABEL_W} height={chartH} style={{ position: 'absolute', left: 0, top: 8, overflow: 'visible' }}>
              {model.ribbons.map(r => {
                const clickable = editable(r.from)
                return (
                  <path key={r.key} d={r.d} fill={r.color}
                    style={{
                      opacity: touching(r) ? 1 : 0.2,
                      transition: 'opacity 0.14s',
                      cursor: clickable ? 'pointer' : 'default',
                    }}
                    onMouseEnter={() => clickable && setHover(r.from)}
                    onMouseLeave={() => clickable && setHover(null)}
                    onClick={() => clickable && onSelect(r.from)} />
                )
              })}
              {model.nodes.map(n => (
                <rect key={n.id} x={n.x} y={n.y} width={BAR_W} height={n.h} rx="3" fill={n.color}
                  style={{
                    opacity: dim(n.id) ? 0.32 : 1,
                    cursor: n.channel ? 'pointer' : 'default',
                    transition: 'opacity 0.14s',
                  }}
                  onMouseEnter={() => n.channel && setHover(n.id)}
                  onMouseLeave={() => n.channel && setHover(null)}
                  onClick={() => n.channel && onSelect(n.id)} />
              ))}
            </svg>

            {/* Labels live in HTML so they carry the same type and icons as the
                board. Each sits on its own solid chip rather than a text glow,
                which keeps them readable over any ribbon without the smear. */}
            {model.nodes.map(n => {
              const Icon = n.channel ? iconFor(n.channel) : null
              const sel = selectedId === n.id
              return (
                <div key={n.id}
                  onMouseEnter={() => n.channel && setHover(n.id)}
                  onMouseLeave={() => n.channel && setHover(null)}
                  onClick={() => n.channel && onSelect(n.id)}
                  style={{
                    position: 'absolute',
                    left: n.x + BAR_W + LABEL_PAD,
                    top: 8 + n.y + n.h / 2,
                    transform: 'translateY(-50%)',
                    maxWidth: LABEL_W - LABEL_PAD,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 9px', borderRadius: 8,
                    background: 'var(--card)',
                    border: `1px solid ${sel ? n.color : 'var(--border)'}`,
                    boxShadow: sel ? `0 0 0 2px ${hexToRgba(n.color, 0.22)}` : '0 1px 6px rgba(0,0,0,0.3)',
                    cursor: n.channel ? 'pointer' : 'default',
                    opacity: dim(n.id) ? 0.45 : 1,
                    transition: 'opacity 0.14s, border-color 0.14s',
                  }}>
                  {n.active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: KEEP, flexShrink: 0 }} />}
                  {Icon && (
                    <span style={{ color: n.color, display: 'flex', flexShrink: 0 }}>
                      {customIcon(n.channel) ? <LucideIcon name={n.channel.icon} s={13} /> : <Icon s={13} />}
                    </span>
                  )}
                  {!Icon && <span style={{ width: 7, height: 7, borderRadius: 2, background: n.color, flexShrink: 0 }} />}
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{n.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                    {n.value.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
