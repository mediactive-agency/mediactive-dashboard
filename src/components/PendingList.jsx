import { useState } from 'react'

export default function PendingList({ items, children }) {
  const [open, setOpen] = useState(false)
  if (!items || items.length === 0) return children

  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,0.22)', padding: '10px 12px', minWidth: 220, maxWidth: 300 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{items.length} pending</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {items.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name || 'Unnamed'}</span>
                {p.variable && <span style={{ color: 'var(--text3)', fontSize: 10, background: 'var(--border)', padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>{p.variable}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
