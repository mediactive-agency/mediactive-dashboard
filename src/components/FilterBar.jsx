import { FILTERS } from '../utils/data'

export default function FilterBar({ active, onFilter, customFrom, customTo, onCustomFrom, onCustomTo, onCustomApply, isMobile }) {
  // On mobile show fewer filters
  const filters = isMobile
    ? FILTERS.filter(f => ['all','30d','7d','today','custom'].includes(f.key))
    : FILTERS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, background: 'var(--filter-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className="hoverable-fade"
            style={{
              padding: isMobile ? '6px 10px' : '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: isMobile ? 12 : 11,
              background: active === f.key ? 'var(--filter-active-bg)' : 'transparent',
              color: active === f.key ? 'var(--filter-active-text)' : 'var(--text3)',
              fontWeight: active === f.key ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >{f.label}</button>
        ))}
      </div>
      {active === 'custom' && (
        <div style={{ display: 'flex', background: 'var(--filter-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[['From', customFrom, onCustomFrom], ['To', customTo, onCustomTo]].map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
              <input type="date" value={val} onChange={e => setter(e.target.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 7, color: 'var(--text)', fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 12px', outline: 'none', width: 140 }} />
            </div>
          ))}
          <button onClick={onCustomApply} className="hoverable-fade" style={{ padding: '8px 18px', background: 'var(--filter-active-bg)', color: 'var(--filter-active-text)', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Apply</button>
        </div>
      )}
    </div>
  )
}
