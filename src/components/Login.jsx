import { LOGO_SVG } from '../utils/data'

function GoogleButton({ onLogin, loading }) {
  return (
    <button
      onClick={onLogin}
      disabled={loading}
      style={{
        width: '100%', padding: '14px 20px', borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--bg)',
        color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        fontFamily: 'inherit',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--text3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  )
}

export default function Login({ onLogin, loading, inviteToken }) {
  return (
    <div className="login-root" style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Left panel, branding + the actual sign-in action */}
      <div className="login-left" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 36px', boxSizing: 'border-box',
        overflowY: 'auto',
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 380, width: '100%' }}>
          {/* Logo */}
          <div
            style={{ marginBottom: 22, filter: 'var(--logo-filter, none)' }}
            dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
          />

          {/* Title */}
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12,
          }}>
            AGP Tracking Dashboard
          </div>

          {/* Tagline */}
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: 'var(--text)',
            lineHeight: 1.2, letterSpacing: '-0.03em', margin: '0 0 14px',
          }}>
            Track your outreach.<br />Close more deals.
          </h1>

          <p style={{
            fontSize: 15, color: 'var(--text3)', lineHeight: 1.6, margin: '0 0 22px',
          }}>
            One place for your social outreach, sales calls, daily tasks and pipeline.
          </p>

          {inviteToken && (
            <div style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              You've been invited to a workspace. Sign in to join it.
            </div>
          )}

          <GoogleButton onLogin={onLogin} loading={loading} />

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
            By signing in you agree to store your outreach data in your own Google Sheets. We never access or sell your data.
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 20, marginTop: 24 }}>
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>, label: '100% free' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: 'Your data stays yours' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                <span style={{ color: '#10B981' }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel, quotes in a gray box */}
      <div className="login-right" style={{
        width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 36px', boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: 320, width: '100%', background: 'var(--border)',
          borderRadius: 16, padding: '26px 24px',
        }}>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 10px', fontStyle: 'italic' }}>
            "The best feedback is data. Make objective decisions, not emotional ones. Move faster."
          </p>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', marginBottom: 22 }}>Mediactive</div>

          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 10px', fontStyle: 'italic' }}>
            "Don't be a nerd."
          </p>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>Ethan Welby</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-root { flex-direction: column; height: auto; min-height: 100vh; overflow: visible; }
          .login-left { flex: none; width: 100%; overflow-y: visible; border-right: none; border-bottom: 1px solid var(--border); padding: 32px 24px; }
          .login-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>
    </div>
  )
}
