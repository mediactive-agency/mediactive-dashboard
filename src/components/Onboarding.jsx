import { useState } from 'react'
import { saveUserConfig } from '../hooks/useData'

const GRADIENT = 'linear-gradient(90deg, #B16CEA, #FF5E69, #FFA84B)'

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
  )
}

function Btn({ children, onClick, primary, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '8px 14px' : '11px 22px',
      background: disabled ? 'var(--border)' : primary ? 'var(--text)' : 'transparent',
      color: disabled ? 'var(--text3)' : primary ? 'var(--bg)' : 'var(--text2)',
      border: primary ? 'none' : '1px solid var(--border)', borderRadius: 9,
      cursor: disabled ? 'default' : 'pointer', fontWeight: 700, fontSize: small ? 12 : 13, fontFamily: 'inherit', flexShrink: 0,
    }}>{children}</button>
  )
}

function StatusMsg({ status }) {
  if (!status) return null
  const ok = status.type === 'ok'
  return (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: ok ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
      {ok
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      {status.msg}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</div>
}

function H2({ children, optional }) {
  return (
    <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
      {children}
      {optional && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', verticalAlign: 'middle', marginLeft: 8 }}>OPTIONAL</span>}
    </h2>
  )
}

function P({ children }) {
  return <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text2)', margin: '0 0 18px' }}>{children}</p>
}

function Steps({ items }) {
  return (
    <ol style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text2)', margin: '0 0 16px', paddingLeft: 18 }}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  )
}

function TabPills({ tabs, isSelected, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {tabs.map(tab => {
        const on = isSelected(tab)
        return (
          <button key={tab} onClick={() => onPick(tab)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', border: '1px solid', borderColor: on ? 'var(--text)' : 'var(--border)',
            background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--text2)',
          }}>{tab}</button>
        )
      })}
    </div>
  )
}

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API_KEY = 'AIzaSyCp1H8a78aqz21-ztsOQ-yCRjZNyPxhZXM'

async function fetchSheetTabs(sheetId) {
  const url = `${SHEETS_API}/${sheetId}?key=${API_KEY}&fields=sheets.properties.title`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return (json.sheets || []).map(s => s.properties.title)
}

const STEPS = ['Welcome', 'Outreach', 'Sales', 'Fathom', 'Calendly', 'Done']

export default function Onboarding({ user, onComplete, isMobile }) {
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [outreachInput, setOutreachInput] = useState('')
  const [outreachSheetId, setOutreachSheetId] = useState('')
  const [outreachTabs, setOutreachTabs] = useState([])
  const [outreachTabsAvail, setOutreachTabsAvail] = useState(null)
  const [salesInput, setSalesInput] = useState('')
  const [salesSheetId, setSalesSheetId] = useState('')
  const [salesTabsAvail, setSalesTabsAvail] = useState(null)
  const [salesTab, setSalesTab] = useState('')
  const [calendlyPat, setCalendlyPat] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const next = () => { setStatus(null); setStep(s => s + 1) }
  const back = () => { setStatus(null); setStep(s => s - 1) }

  async function loadOutreachTabs() {
    const id = extractSheetId(outreachInput)
    if (!id) { setStatus({ type: 'err', msg: 'Paste a valid Google Sheets URL' }); return }
    setBusy(true); setStatus(null)
    try {
      const tabs = await fetchSheetTabs(id)
      setOutreachSheetId(id)
      setOutreachTabsAvail(tabs)
      // Auto-select month tabs
      const monthTabs = tabs.filter(t => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t))
      setOutreachTabs(monthTabs.length > 0 ? monthTabs : tabs)
      setStatus({ type: 'ok', msg: `Found ${tabs.length} tabs. Select the ones with your outreach data.` })
    } catch (e) {
      setStatus({ type: 'err', msg: `Could not read sheet: ${e.message}. Make sure it's set to "Anyone with the link can view".` })
    } finally { setBusy(false) }
  }

  async function loadSalesTabs() {
    const id = extractSheetId(salesInput)
    if (!id) { setStatus({ type: 'err', msg: 'Paste a valid Google Sheets URL' }); return }
    setBusy(true); setStatus(null)
    try {
      const tabs = await fetchSheetTabs(id)
      setSalesSheetId(id)
      setSalesTabsAvail(tabs)
      setSalesTab(tabs[0] || '')
      setStatus({ type: 'ok', msg: 'Sheet connected. Pick the tab with your call log.' })
    } catch (e) {
      setStatus({ type: 'err', msg: `Could not read sheet: ${e.message}. Make sure it's set to "Anyone with the link can view".` })
    } finally { setBusy(false) }
  }

  function toggleTab(tab) {
    setOutreachTabs(prev => prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab])
  }

  async function finish() {
    setSaving(true)
    try {
      await saveUserConfig(user.uid, {
        email: user.email,
        userName: userName || user.displayName || '',
        outreachSheetId,
        outreachTabs,
        salesSheetId: salesSheetId || null,
        salesTab: salesTab || 'Sheet1',
        calendlyPat: calendlyPat.trim() || null,
        setupComplete: true,
        createdAt: new Date().toISOString(),
      })
      onComplete()
    } catch (e) {
      setStatus({ type: 'err', msg: e.message })
    }
    setSaving(false)
  }

  const canNext = {
    0: !!userName.trim(),
    1: !!outreachSheetId && outreachTabs.length > 0,
    2: !!salesSheetId,
    3: true,
    4: true,
    5: true,
  }[step]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: isMobile ? 16 : 32 }}>
      <div style={{ width: '100%', maxWidth: 580, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--card-shadow)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: GRADIENT, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease', flexShrink: 0 }} />

        <div style={{ padding: isMobile ? '26px 22px' : '34px 40px', overflowY: 'auto' }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i <= step ? 'var(--text)' : 'var(--border)', transition: 'all 0.25s' }} />
            ))}
          </div>

          {step === 0 && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 10px' }}>Welcome to your sales dashboard</h1>
              <P>Connect your tracking sheets and you'll have a full outreach and sales analytics dashboard in minutes. Your data stays in your Google account — we only read it, never store it.</P>
              <Label>What is your first name?</Label>
              <Input value={userName} onChange={setUserName} placeholder="e.g. Alex" />
            </>
          )}

          {step === 1 && (
            <>
              <H2>Outreach sheet</H2>
              <P>This is where you track your daily outreach — connections, replies, and bookings, one tab per month. Make sure the sheet is set to <b style={{ color: 'var(--text)' }}>Anyone with the link can view</b>.</P>
              <Label>Paste your sheet URL</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Input value={outreachInput} onChange={setOutreachInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <Btn small onClick={loadOutreachTabs} disabled={busy || !outreachInput.trim()}>{busy ? 'Loading...' : 'Load tabs'}</Btn>
              </div>
              {outreachTabsAvail && (
                <>
                  <Label>Select outreach tabs</Label>
                  <TabPills tabs={outreachTabsAvail} isSelected={t => outreachTabs.includes(t)} onPick={toggleTab} />
                </>
              )}
              <StatusMsg status={status} />
            </>
          )}

          {step === 2 && (
            <>
              <H2>Sales calls sheet</H2>
              <P>This is where every sales call gets logged — prospect, objections, outcome, lead quality. Make sure it's set to <b style={{ color: 'var(--text)' }}>Anyone with the link can view</b>.</P>
              <Label>Paste your sheet URL</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Input value={salesInput} onChange={setSalesInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <Btn small onClick={loadSalesTabs} disabled={busy || !salesInput.trim()}>{busy ? 'Loading...' : 'Load tabs'}</Btn>
              </div>
              {salesTabsAvail && (
                <>
                  <Label>Select the tab with your call log</Label>
                  <TabPills tabs={salesTabsAvail} isSelected={t => salesTab === t} onPick={setSalesTab} />
                </>
              )}
              <StatusMsg status={status} />
            </>
          )}

          {step === 3 && (
            <>
              <H2>Fathom</H2>
              <P>Fathom records and summarizes your sales calls. Together with Claude, it lets you log every call automatically — just say "log my last call" and it handles the rest.</P>
              <Steps items={[
                <>Create a free account at <a href="https://fathom.video" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>fathom.video</a> and connect your calendar so it auto-joins your meetings</>,
                <>In <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>claude.ai</a> go to Settings → Connectors, find <b style={{ color: 'var(--text)' }}>Fathom</b> and connect it</>,
                <>Connect <b style={{ color: 'var(--text)' }}>Zapier</b> the same way and add the action <b style={{ color: 'var(--text)' }}>Google Sheets: Add row</b></>,
                <>After your next call, tell Claude "log my last call" and the whole pipeline runs</>,
              ]} />
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Already using Fathom? Just make sure the Claude connector is on and continue.</div>
            </>
          )}

          {step === 4 && (
            <>
              <H2 optional>Calendly</H2>
              <P>Connect Calendly to see your upcoming booked calls on the dashboard. Create a personal access token at <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>calendly.com/integrations</a> and paste it below. You can skip this and add it later.</P>
              <Label>Personal access token</Label>
              <Input type="password" value={calendlyPat} onChange={setCalendlyPat} placeholder="eyJraWQiOi..." />
              <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10 }}>The token is stored only in your Firestore account and used only to fetch your upcoming calls.</p>
            </>
          )}

          {step === 5 && (
            <>
              <H2>You're all set</H2>
              <P>Your dashboard is ready. Click below to open it.</P>
              <StatusMsg status={status} />
            </>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
            <div>{step > 0 && <Btn onClick={back}>Back</Btn>}</div>
            {step === 5
              ? <Btn primary onClick={finish} disabled={saving}>{saving ? 'Setting up...' : 'Open dashboard'}</Btn>
              : <Btn primary onClick={next} disabled={!canNext}>Continue</Btn>}
          </div>
        </div>
      </div>
    </div>
  )
}
