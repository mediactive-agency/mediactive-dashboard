import { FILTERS } from '../utils/data'

export default function FilterBar({ active, onFilter, customFrom, customTo, onCustomFrom, onCustomTo, onCustomApply }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, background: '#161618', border: '1px solid #222224', borderRadius: 9, padding: 3 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: "Inter, sans-serif",
              background: active === f.key ? '#FFFFFF' : 'transparent',
              color: active === f.key ? '#000' : '#666669',
              fontWeight: active === f.key ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >{f.label}</button>
        ))}
      </div>

      {active === 'custom' && (
        <div style={{ display: 'flex', background: '#161618', border: '1px solid #222224', borderRadius: 10, padding: '14px 16px', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[['From', customFrom, onCustomFrom], ['To', customTo, onCustomTo]].map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10, color: '#666669', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
              <input
                type="date"
                value={val}
                onChange={e => setter(e.target.value)}
                style={{ background: '#0C0C0E', border: '1px solid #2a2a2c', borderRadius: 7, color: '#F3F4F6', fontFamily: "Inter, sans-serif", fontSize: 13, padding: '7px 12px', outline: 'none', width: 140 }}
              />
            </div>
          ))}
          <button
            onClick={onCustomApply}
            style={{ padding: '8px 18px', background: '#FFFFFF', color: '#000', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: "Inter, sans-serif" }}
          >Apply</button>
        </div>
      )}
    </div>
  )
}
