import { useState } from 'react'
import { LOGO_SVG } from '../utils/data'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { key: 'outreach',  label: 'Outreach',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { key: 'sales',     label: 'Sales Calls', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
  { key: 'tasks',     label: 'Daily Tasks', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
]

export default function Sidebar({ active, onNav, loadedAt, loading, error, theme, onThemeToggle, isManualTheme, mobileOpen, onMobileClose }) {
  const isDark = theme === 'dark'

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'none' }} className="mobile-overlay" />
      )}

      <aside style={{
        width: 240, minHeight: '100vh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        transition: 'transform 0.25s ease, background 0.3s ease',
      }} className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>

        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          {/* Mobile close button */}
          <button onClick={onMobileClose} className="mobile-close-btn" style={{ background: 'none', border: 'none', color: 'var(--text3)', padding: 4, display: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 6px', fontWeight: 600 }}>Analytics</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { onNav(item.key); onMobileClose?.() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 8, border: 'none', width: '100%', textAlign: 'left',
                fontSize: 14, fontWeight: active === item.key ? 600 : 400,
                color: active === item.key ? 'var(--text)' : 'var(--text3)',
                background: active === item.key ? 'var(--sidebar-active)' : 'transparent',
                cursor: 'pointer', marginBottom: 3, transition: 'all 0.15s',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: active === item.key ? 'var(--nav-dot-active)' : 'var(--nav-dot)', marginLeft: 'auto', flexShrink: 0 }} />
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Live + toggle on same row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontSize: 11, color: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981', fontWeight: 600, flexShrink: 0 }}>
                {loading ? 'Loading...' : error ? 'Error' : 'Live'}
              </span>
              {loadedAt && !loading && !error && (
                <span style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  · {loadedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Toggle pill */}
            <button
              onClick={onThemeToggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                flexShrink: 0, position: 'relative',
                width: 36, height: 20, borderRadius: 10,
                background: isDark ? '#2a2a2c' : '#D1D5DB',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: isDark ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: isDark ? '#F59E0B' : '#FFFFFF',
                transition: 'left 0.2s, background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {isDark
                  ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </div>
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); }
          .mobile-overlay { display: block !important; }
          .mobile-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  )
}
