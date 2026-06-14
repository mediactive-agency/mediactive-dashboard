import { useState, useEffect } from 'react'
import { saveUserConfig } from '../hooks/useData'

function Input({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
      {hint && <div style={{ fontSize: 11.5, color: 'var(--text4)', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '24px 26px', boxShadow: 'var(--card-shadow)', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  )
}

export default function Settings({ user, config, onSaved, isMobile }) {
  const [userName, setUserName] = useState('')
  const [calendlyPat, setCalendlyPat] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (config) {
      setUserName(config.userName || '')
      setCalendlyPat(config.calendlyPat || '')
      setLogoPreview(config.logoUrl || null)
      if (config.logoUrl && !config.logoUrl.startsWith('data:')) setLogoUrl(config.logoUrl)
    }
  }, [config])

  function handleLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 300 * 1024) {
      setError('Logo must be under 300KB. Try compressing it or use an SVG.')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = ev => { setLogoPreview(ev.target.result); setLogoUrl('') }
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await saveUserConfig(user.uid, {
        userName: userName.trim(),
        calendlyPat: calendlyPat.trim() || null,
        logoUrl: logoPreview || logoUrl || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (onSaved) onSaved()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Section title="Profile">
        <Input label="First name" value={userName} onChange={setUserName} placeholder="e.g. Alex" />
      </Section>

      <Section title="Logo">
        {logoPreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img src={logoPreview} alt="Logo" style={{ height: 40, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }} />
            <button onClick={() => { setLogoPreview(null); setLogoUrl('') }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
          </div>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload logo
          <input type="file" accept="image/*,.svg" onChange={handleLogoFile} style={{ display: 'none' }} />
        </label>
        <div style={{ fontSize: 11.5, color: 'var(--text4)', marginBottom: 14 }}>PNG, JPG or SVG. Max 300KB.</div>
        <Input label="Or paste URL / SVG code" value={logoUrl} onChange={v => { setLogoUrl(v); setLogoPreview(null) }} placeholder="https://... or <svg>...</svg>" />
      </Section>

      <Section title="Calendly">
        <Input
          label="Personal access token"
          type="password"
          value={calendlyPat}
          onChange={setCalendlyPat}
          placeholder="eyJraWQiOi..."
          hint="calendly.com → Integrations → API & Webhooks → Generate token"
        />
      </Section>

      <Section title="Sheets">
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
          Connected sheets: <b style={{ color: 'var(--text)' }}>{config?.outreachSheetId ? 'Outreach ✓' : 'None'}</b>{config?.salesSheetId ? ', Sales calls ✓' : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>To reconnect sheets, contact support or re-run the onboarding wizard.</div>
      </Section>

      {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button onClick={save} disabled={saving} style={{ padding: '12px 24px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
      </button>
    </div>
  )
}
