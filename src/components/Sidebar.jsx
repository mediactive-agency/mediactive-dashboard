import { LOGO_SVG, LOGO_MINI_SVG } from '../utils/data'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { key: 'outreach',  label: 'Outreach',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { key: 'sales',     label: 'Sales Calls', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
  { key: 'tasks',     label: 'Daily Tasks', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
]

export default function Sidebar({ active, onNav, loadedAt, loading, error }) {
  const subText = loading
    ? 'Loading...'
    : error
    ? 'Error'
    : loadedAt
    ? `Updated ${loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'Live'

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: '#111113',
      borderRight: '1px solid #222224', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
    }}>
      <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #222224', display: 'flex', alignItems: 'center' }}>
        <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
      </div>

      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, color: '#555558', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 6px', fontWeight: 600 }}>Analytics</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, border: 'none', width: '100%', textAlign: 'left',
              fontSize: 14, fontWeight: active === item.key ? 600 : 500,
              color: active === item.key ? '#F3F4F6' : '#88888B',
              background: active === item.key ? '#0d1825' : 'none',
              cursor: 'pointer', marginBottom: 3, transition: 'all 0.15s',
              fontFamily: "Inter, sans-serif",
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: active === item.key ? '#FFFFFF' : '#2a2a2c',
              marginLeft: 'auto', flexShrink: 0,
            }} />
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #222224' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981',
            animation: 'pulse-dot 2s infinite',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981', fontWeight: 600 }}>
              {loading ? 'Loading...' : error ? 'Error' : 'Live'}
            </span>
            {loadedAt && !loading && !error && (
              <span style={{ fontSize: 10, color: '#555558' }}>
                {loadedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </aside>
  )
}
