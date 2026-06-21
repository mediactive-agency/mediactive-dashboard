import { useState } from 'react'
import { LOGO_SVG } from '../utils/data'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { key: 'outreach',  label: 'Outreach',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { key: 'sales',     label: 'Sales Calls', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
  { key: 'tasks',     label: 'Daily Tasks', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'clients',   label: 'Clients',     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'campaigns', label: 'Campaigns', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><circle cx="8" cy="6" r="2.2" fill="currentColor" stroke="none"/><line x1="3" y1="14" x2="21" y2="14"/><circle cx="15" cy="14" r="2.2" fill="currentColor" stroke="none"/><line x1="3" y1="20" x2="21" y2="20"/><circle cx="11" cy="20" r="2.2" fill="currentColor" stroke="none"/></svg> },
  { key: 'settings',  label: 'Settings',    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

function TogglePill({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      style={{
        flexShrink: 0, position: 'relative',
        width: 48, height: 26, borderRadius: 13,
        background: isDark ? '#374151' : '#D1D5DB',
        border: 'none', cursor: 'pointer', padding: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: isDark ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#FFFFFF',
        transition: 'left 0.2s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
      }}>
        {isDark
          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        }
      </div>
    </button>
  )
}

export { TogglePill }

function WorkspaceSwitcher({ workspaces, activeWorkspaceId, onSwitch }) {
  const [open, setOpen] = useState(false)
  if (!workspaces || workspaces.length <= 1) return null
  const active = workspaces.find(w => w.workspaceId === activeWorkspaceId)

  return (
    <div style={{ position: 'relative', padding: '10px 10px 0' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        width: '100%', padding: '9px 10px', borderRadius: 8,
        background: 'var(--bg)', border: '1px solid var(--border)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text3)', flexShrink: 0 }}><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 9h6"/><path d="M9 13h6"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.name || 'Workspace'}</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text4)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 10, right: 10, marginTop: 4,
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden',
          }}>
            {workspaces.map(w => (
              <button key={w.workspaceId} onClick={() => { onSwitch(w.workspaceId); setOpen(false) }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                background: w.workspaceId === activeWorkspaceId ? 'var(--sidebar-active)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{w.role === 'owner' ? 'Owner' : 'Member'}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Sidebar({ active, onNav, loadedAt, loading, error, theme, onThemeToggle, isManualTheme, mobileOpen, onMobileClose, onLogout, logoUrl, isAdmin, workspaces, activeWorkspaceId, onSwitchWorkspace }) {
  const isDark = theme === 'dark'

  return (
    <>
      {mobileOpen && (
        <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }} />
      )}

      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`} style={{
        width: 240, height: '100dvh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 100,
        transform: 'translateX(-100%)',
        transition: 'transform 0.25s ease, background 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
            : <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />}
          <button onClick={onMobileClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onSwitch={onSwitchWorkspace} />

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 6px', fontWeight: 600 }}>Analytics</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className="nav-item-btn"
              onClick={() => { onNav(item.key); onMobileClose?.() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 8, border: 'none', width: '100%', textAlign: 'left',
                fontSize: 17, fontWeight: active === item.key ? 600 : 400,
                color: active === item.key ? 'var(--text)' : 'var(--text3)',
                background: active === item.key ? 'var(--sidebar-active)' : 'transparent',
                cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer, always at bottom */}
        <div style={{ padding: '14px 20px', paddingBottom: 'max(18px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto' }}>
          {isAdmin && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 10px 6px', fontWeight: 600 }}>Admin</div>
              <button className="sidebar-footer-btn" onClick={() => { onNav('members'); onMobileClose?.() }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 10px', background: active === 'members' ? 'var(--sidebar-active)' : 'transparent', border: 'none', color: active === 'members' ? 'var(--text)' : 'var(--text2)', cursor: 'pointer', borderRadius: 7, fontSize: 15, fontWeight: 600, textAlign: 'left', marginBottom: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                AGP Members
              </button>
            </>
          )}
          {onLogout && (
            <button className="sidebar-footer-btn" onClick={() => { onLogout(); onMobileClose?.() }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 10px', marginBottom: 8, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', borderRadius: 7, fontSize: 15, fontWeight: 600, textAlign: 'left' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TogglePill isDark={isDark} onToggle={onThemeToggle} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981' }}>
                {loading ? 'Loading...' : error ? 'Error' : 'Live'}
              </span>
              {loadedAt && !loading && !error && (
                <span style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {loadedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar, always visible */}
      <aside style={{
        width: 240, height: '100dvh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 50,
        transition: 'background 0.3s ease',
      }} className="sidebar-desktop">
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
            : <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />}
        </div>
        <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onSwitch={onSwitchWorkspace} />
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 6px', fontWeight: 600 }}>Analytics</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className="nav-item-btn"
              data-tour={`sidebar-${item.key}`}
              onClick={() => onNav(item.key)}
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
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 20px', paddingBottom: 'max(18px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {isAdmin && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 6px', fontWeight: 600 }}>Admin</div>
            <button className="sidebar-footer-btn" onClick={() => onNav('members')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', background: active === 'members' ? 'var(--sidebar-active)' : 'transparent', border: 'none', color: active === 'members' ? 'var(--text)' : 'var(--text2)', cursor: 'pointer', borderRadius: 7, fontSize: 13, fontWeight: 600, textAlign: 'left', marginBottom: 2 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              AGP Members
            </button>
          </>
        )}
        {onLogout && (
            <button className="sidebar-footer-btn" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', marginBottom: 6, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', borderRadius: 7, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981', animation: 'pulse-dot 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: loading ? '#F59E0B' : error ? '#EF4444' : '#10B981' }}>
              {loading ? 'Loading...' : error ? 'Error' : 'Live'}
            </span>
            {loadedAt && !loading && !error && (
              <span style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                · {loadedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .sidebar.sidebar-open { transform: translateX(0) !important; box-shadow: 4px 0 32px rgba(0,0,0,0.25); }
        /* On mobile hide desktop sidebar, show hamburger */
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
        }
        /* On desktop hide the mobile overlay sidebar by default (it's behind) */
        @media (min-width: 769px) {
          .sidebar { display: none !important; }
        }
      `}</style>
    </>
  )
}
