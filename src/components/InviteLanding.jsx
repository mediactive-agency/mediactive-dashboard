import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { LOGO_SVG } from '../utils/data'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function InviteLanding({ token, user, onLogin, onAccept }) {
  const [invite, setInvite] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    getDoc(doc(db, 'invites', token)).then(snap => {
      if (!active) return
      if (!snap.exists()) setNotFound(true)
      else setInvite(snap.data())
    }).catch(() => { if (active) setNotFound(true) })
    return () => { active = false }
  }, [user, token])

  async function handleAccept() {
    setAccepting(true); setError('')
    try {
      await onAccept(token)
    } catch (e) {
      setError(e.message || 'Could not accept this invite.')
      setAccepting(false)
    }
  }

  const inviterName = invite?.createdByName
  const workspaceName = invite?.workspaceName

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '44px 36px', boxShadow: 'var(--card-shadow)' }}>
        {invite?.logoUrl
          ? <img src={invite.logoUrl} alt="Logo" style={{ height: 36, maxWidth: 170, objectFit: 'contain', margin: '0 auto 28px', display: 'block' }} />
          : <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center', filter: 'var(--logo-filter, none)' }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
        }

        {notFound ? (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Invite not found</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6 }}>This invite link is invalid, expired, or was already used. Ask whoever sent it for a new one.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>
              {user
                ? (inviterName ? `${inviterName} invited you to ${workspaceName ? `${workspaceName}` : 'their workspace'}` : 'You\u2019ve been invited to a workspace')
                : 'You\u2019ve been invited to a workspace'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 30, lineHeight: 1.6 }}>
              {user
                ? 'Accept to get access to their outreach, sales calls and pipeline data.'
                : 'Sign in with Google to see who invited you and accept.'}
            </div>

            {!user ? (
              <button
                onClick={onLogin}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  fontFamily: 'inherit',
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--text)', color: 'var(--bg)',
                  cursor: accepting ? 'default' : 'pointer', fontWeight: 700, fontSize: 15,
                  fontFamily: 'inherit', opacity: accepting ? 0.7 : 1,
                }}
              >
                {accepting ? 'Joining...' : 'Accept invite'}
              </button>
            )}
            {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 14 }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  )
}
