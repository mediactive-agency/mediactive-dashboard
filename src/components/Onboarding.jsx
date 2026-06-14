import { useState } from 'react'
import { saveUserConfig } from '../hooks/useData'

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [outreachUrl, setOutreachUrl] = useState('')
  const [salesUrl, setSalesUrl] = useState('')
  const [calendlyPat, setCalendlyPat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none'
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--text3)',
    marginBottom: 6, display: 'block', letterSpacing: '0.05em'
  }

  async function finish() {
    if (!outreachUrl) { setError('Outreach sheet is required'); return }
    const outreachId = extractSheetId(outreachUrl)
    if (!outreachId) { setError('Invalid outreach sheet URL'); return }
    setLoading(true)
    try {
      await saveUserConfig(user.uid, {
        email: user.email,
        outreachSheetId: outreachId,
        salesSheetId: salesUrl ? extractSheetId(salesUrl) : null,
        calendlyPat: calendlyPat || null,
        outreachTabs: ['Mar', 'Apr', 'May', 'Jun'],
        setupComplete: true,
        createdAt: new Date().toISOString(),
      })
      onComplete()
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 36, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            {step === 1 ? 'Connect your sheets' : 'Connect Calendly'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {step === 1 ? 'Paste the links to your Google Sheets. Make sure they\'re set to "Anyone with the link can view".' : 'Optional — connect Calendly to see upcoming calls.'}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1,2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? 'var(--text)' : 'var(--border)' }} />)}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>OUTREACH SHEET *</label>
              <input style={inputStyle} value={outreachUrl} onChange={e => setOutreachUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..." />
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>
                Your main outreach tracking sheet with monthly tabs (Mar, Apr, May, Jun...)
              </div>
            </div>
            <div>
              <label style={labelStyle}>SALES CALLS SHEET</label>
              <input style={inputStyle} value={salesUrl} onChange={e => setSalesUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..." />
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>
                Optional — your sales call log sheet
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>
              Skip this if you don't use Calendly or don't have a PAT yet.
            </div>
            <div>
              <label style={labelStyle}>CALENDLY PERSONAL ACCESS TOKEN</label>
              <input style={inputStyle} value={calendlyPat} onChange={e => setCalendlyPat(e.target.value)}
                placeholder="eyJraWQi..." />
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>
                calendly.com → Integrations → API & Webhooks → Generate token
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s-1)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button onClick={() => { if (!outreachUrl) { setError('Outreach sheet is required'); return }; setError(''); setStep(2) }}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              Continue
            </button>
          ) : (
            <button onClick={finish} disabled={loading}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Get started'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
