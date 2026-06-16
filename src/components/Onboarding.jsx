import { useState } from 'react'
import { saveUserConfig } from '../hooks/useData'

const GRADIENT = 'linear-gradient(90deg, #B16CEA, #FF5E69, #FFA84B)'
const OUTREACH_TEMPLATE = 'https://docs.google.com/spreadsheets/d/1YtTplni2SkwMkNh7uKbVTTRbcsrpiLuUA-UDEKcEZo4/copy'
const SALES_TEMPLATE = 'https://docs.google.com/spreadsheets/d/1tj37ympzYWEWjg3mHcJSUCrqbGZbEfe0fQK2NBdwlIs/copy'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API_KEY = 'AIzaSyCp1H8a78aqz21-ztsOQ-yCRjZNyPxhZXM'

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

function generateSkillFile(salesSheetId, salesTab) {
  return `---
name: log-sales-call
description: >
  Logs sales calls to a Google Sheet by pulling data from Fathom meeting summaries.
  Use this skill whenever the user wants to log, record, or save a sales call,
  mentions a prospect name or Fathom call, says "log this call", "log all calls",
  "add to the sheet", or asks to update their sales call tracker. Also triggers
  when the user pastes a transcript or meeting notes and wants it saved.
---

# Log Sales Call

Pulls Fathom meeting summaries, extracts structured sales data, shows for review, and logs to Google Sheets via Zapier.

## Fixed config
- Spreadsheet ID: ${salesSheetId}
- Worksheet: ${salesTab || 'Sheet1'}
- Columns A–J: Prospect name | Call date | Current state | Goal | Objections | Closed? | Notes | Duration | Service | Lead quality

---

## What to log vs skip

**Log these (sales/pitch calls):**
- First pitch of any service
- Upsell pitch to an existing client

**Skip these:**
- Onboarding calls
- Handover / delivery calls
- Internal meetings
- Unnamed meetings with no identifiable prospect

---

## Step 1 — Fetch the meeting

| Input | Action |
|-------|--------|
| Fathom URL | \`Fathom:get_recording_by_url(url)\` → then \`get_meeting_summary(recording_id)\` |
| Prospect name | \`Fathom:find_person(name, recorded_by: "anyone")\` → then \`get_meeting_summary\` |
| "log all" | \`Fathom:list_meetings(include_summary: true, max_pages: 10)\` → filter to pitch calls |
| Pasted transcript | Skip Fathom fetch, extract directly |

---

## Step 2 — Extract fields

**Prospect name** — Full name of the prospect

**Call date** — DD MMM YYYY

**Current state** — \`Clients: X | Revenue: $X/month | [how they get clients]\`

**Goal** — \`X clients | $X/month | in X months\`

**Objections** — One line per objection. Write \`None\` if none.

**Closed?** — \`Yes\` / \`No\` / \`Follow-up\`

**Notes** — One sentence max.

**Duration** — Total minutes

**Service** — Service pitched (must be confirmed explicitly)

**Lead quality** — Score 1–5 only (5=ready to buy, 1=bad fit)

---

## Step 3 — Show for review

Display all fields cleanly, then ask: **"Looks good? I'll log it."**

Wait for confirmation before logging.

---

## Step 4 — Log to sheet

After confirmation, call:

\`\`\`
execute_zapier_write_action(
  action: "add_row",
  app: "Google Sheets",
  instructions: "Add this row to spreadsheet ID '${salesSheetId}', worksheet '${salesTab || 'Sheet1'}':
    Prospect name=..., Call date=..., Current state=..., Goal=...,
    Objections=..., Closed?=..., Notes=..., Duration=..., Service=..., Lead quality=...",
  params: { spreadsheet: "${salesSheetId}", worksheet: "${salesTab || 'Sheet1'}" }
)
\`\`\`

---

## Step 5 — Confirm

After logging, confirm with:
> ✅ Logged [Prospect name]
`
}

function downloadSkill(salesSheetId, salesTab) {
  const content = generateSkillFile(salesSheetId, salesTab)
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'log-sales-call.skill'
  a.click()
  URL.revokeObjectURL(url)
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
  )
}

function Btn({ children, onClick, primary, disabled, small, href }) {
  const style = {
    padding: small ? '8px 14px' : '11px 22px',
    background: disabled ? 'var(--border)' : primary ? 'var(--text)' : 'transparent',
    color: disabled ? 'var(--text3)' : primary ? 'var(--bg)' : 'var(--text2)',
    border: primary ? 'none' : '1px solid var(--border)', borderRadius: 9,
    cursor: disabled ? 'default' : 'pointer', fontWeight: 700, fontSize: small ? 12 : 13,
    fontFamily: 'inherit', flexShrink: 0, textDecoration: 'none', display: 'inline-block',
  }
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={style}>{children}</a>
  return <button onClick={onClick} disabled={disabled} style={style}>{children}</button>
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
  return <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text2)', margin: '0 0 14px' }}>{children}</p>
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

async function fetchSheetTabs(sheetId) {
  const url = `${SHEETS_API}/${sheetId}?key=${API_KEY}&fields=sheets.properties.title`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return (json.sheets || []).map(s => s.properties.title)
}

const STEPS = ['Welcome', 'Outreach sheet', 'Sales calls sheet', 'Claude skill', 'Fathom', 'Calendly', 'Logo', 'Done']

export default function Onboarding({ user, onComplete, isMobile }) {
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [outreachSheets, setOutreachSheets] = useState([])
  const [outreachInput, setOutreachInput] = useState('')
  const [outreachTabsAvail, setOutreachTabsAvail] = useState(null)
  const [outreachTabs, setOutreachTabs] = useState([])
  const [outreachSheetId, setOutreachSheetId] = useState('')
  const [salesInput, setSalesInput] = useState('')
  const [salesSheetId, setSalesSheetId] = useState('')
  const [salesTabsAvail, setSalesTabsAvail] = useState(null)
  const [salesTab, setSalesTab] = useState('')
  const [calendlyPat, setCalendlyPat] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const next = () => { setStatus(null); setStep(s => s + 1) }
  const back = () => { setStatus(null); setStep(s => s - 1) }

  async function loadOutreachTabs() {
    const id = extractSheetId(outreachInput)
    if (!id) { setStatus({ type: 'err', msg: 'Paste a valid Google Sheets URL' }); return }
    if (outreachSheets.find(s => s.id === id)) { setStatus({ type: 'err', msg: 'This sheet is already connected.' }); return }
    setBusy(true); setStatus(null)
    try {
      const tabs = await fetchSheetTabs(id)
      setOutreachSheetId(id)
      setOutreachTabsAvail(tabs)
      const monthTabs = tabs.filter(t => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t))
      setOutreachTabs(monthTabs.length > 0 ? monthTabs : tabs)
      setStatus({ type: 'ok', msg: `Found ${tabs.length} tabs. Select the ones with your outreach data.` })
    } catch (e) {
      setStatus({ type: 'err', msg: `Could not read sheet: ${e.message}. Make sure it's set to "Anyone with the link can view".` })
    } finally { setBusy(false) }
  }

  function addOutreachSheet() {
    if (!outreachSheetId || outreachTabs.length === 0) return
    setOutreachSheets(prev => [...prev, { id: outreachSheetId, tabs: outreachTabs }])
    setOutreachInput(''); setOutreachSheetId(''); setOutreachTabsAvail(null); setOutreachTabs([]); setStatus(null)
  }

  function removeOutreachSheet(id) {
    setOutreachSheets(prev => prev.filter(s => s.id !== id))
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

  function handleLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setLogoPreview(ev.target.result); setLogoUrl('') }
    reader.readAsDataURL(file)
  }

  async function finish() {
    setSaving(true)
    try {
      await saveUserConfig(user.uid, {
        email: user.email,
        userName: userName || user.displayName || '',
        outreachSheets: outreachSheets.length > 0 ? outreachSheets : [{ id: outreachSheetId, tabs: outreachTabs }],
        outreachSheetId,
        outreachTabs,
        salesSheetId: salesSheetId || null,
        salesTab: salesTab || 'Sheet1',
        calendlyPat: calendlyPat.trim() || null,
        logoUrl: logoPreview || logoUrl || null,
        setupComplete: true,
        createdAt: new Date().toISOString(),
      })
      onComplete({ showTour: true })
    } catch (e) {
      setStatus({ type: 'err', msg: e.message })
    }
    setSaving(false)
  }

  const canNext = {
    0: !!userName.trim(),
    1: outreachSheets.length > 0 || (!!outreachSheetId && outreachTabs.length > 0),
    2: !!salesSheetId,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
  }[step]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: isMobile ? 16 : 32 }}>
      <div style={{ width: '100%', maxWidth: 600, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--card-shadow)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: GRADIENT, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease', flexShrink: 0 }} />

        <div style={{ padding: isMobile ? '26px 22px' : '34px 40px', overflowY: 'auto' }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i <= step ? 'var(--text)' : 'var(--border)', transition: 'all 0.25s' }} />
            ))}
          </div>

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 10px' }}>Welcome to your sales dashboard</h1>
              <P>Connect your tracking sheets and you'll have a full outreach and sales analytics dashboard in minutes. Your data stays in your Google account — we only read it, never store it.</P>
              <Label>What is your first name?</Label>
              <Input value={userName} onChange={setUserName} placeholder="e.g. Alex" />
            </>
          )}

          {/* Step 1 — Outreach sheet */}
          {step === 1 && (
            <>
              <H2>Outreach sheet</H2>
              <P>This is where you track your daily outreach — connections, replies, and bookings, one tab per month.</P>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Don't have one yet?</div>
                <P>Make a copy of our template. It has the right structure with all monthly tabs pre-built. Once you copy it, you can start logging your outreach right away.</P>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn href={OUTREACH_TEMPLATE} primary small>Make a copy in Google Sheets</Btn>
                </div>
              </div>
              <Label>Paste your sheet URL</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Input value={outreachInput} onChange={setOutreachInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <Btn small onClick={loadOutreachTabs} disabled={busy || !outreachInput.trim()}>{busy ? 'Loading...' : 'Connect'}</Btn>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 12 }}>Make sure the sheet is set to <b>Anyone with the link can view</b> (Share → Change → Anyone with the link).</div>
              {outreachTabsAvail && (
                <>
                  <Label>Select outreach tabs</Label>
                  <TabPills tabs={outreachTabsAvail} isSelected={t => outreachTabs.includes(t)} onPick={toggleTab} />
                  {outreachSheetId && outreachTabs.length > 0 && (
                    <button onClick={addOutreachSheet} style={{ marginTop: 8, padding: '8px 14px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add this sheet
                    </button>
                  )}
                </>
              )}
              {outreachSheets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Label>Connected sheets</Label>
                  {outreachSheets.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{s.id.slice(0, 20)}...</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.tabs.join(', ')}</div>
                      </div>
                      <button onClick={() => removeOutreachSheet(s.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Add another year by pasting a new URL above.</div>
                </div>
              )}
              <StatusMsg status={status} />
            </>
          )}

          {/* Step 2 — Sales calls sheet */}
          {step === 2 && (
            <>
              <H2>Sales calls sheet</H2>
              <P>This is where every sales call gets logged — prospect, objections, outcome, lead quality.</P>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Don't have one yet?</div>
                <P>Make a copy of our template. It has the right columns for all the data Claude will log automatically.</P>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn href={SALES_TEMPLATE} primary small>Make a copy in Google Sheets</Btn>
                </div>
              </div>
              <Label>Paste your sheet URL</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Input value={salesInput} onChange={setSalesInput} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <Btn small onClick={loadSalesTabs} disabled={busy || !salesInput.trim()}>{busy ? 'Loading...' : 'Connect'}</Btn>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 12 }}>Make sure the sheet is set to <b>Anyone with the link can view</b>.</div>
              {salesTabsAvail && (
                <>
                  <Label>Select the tab with your call log</Label>
                  <TabPills tabs={salesTabsAvail} isSelected={t => salesTab === t} onPick={setSalesTab} />
                </>
              )}
              <StatusMsg status={status} />
            </>
          )}

          {/* Step 3 — Claude skill */}
          {step === 3 && (
            <>
              <H2>Claude call logging skill</H2>
              <P>This skill lets Claude automatically log your sales calls from Fathom straight into your sheet. After your next call, just tell Claude "log my last call" — it handles the rest.</P>
              {salesSheetId ? (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Your personalised skill file is ready</div>
                  <P>It's pre-configured with your sheet ID. Download it and upload it to Claude.</P>
                  <button onClick={() => downloadSkill(salesSheetId, salesTab)} style={{ padding: '10px 18px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Download skill file
                  </button>
                </div>
              ) : (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, color: 'var(--text3)', fontSize: 13 }}>
                  Connect your sales calls sheet first to generate a personalised skill file.
                </div>
              )}
              <Steps items={[
                <>Go to <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>claude.ai</a> → Settings → Capabilities → Skills</>,
                <>Upload the skill file you just downloaded</>,
                <>Connect the <b style={{ color: 'var(--text)' }}>Zapier</b> connector in Settings → Connectors</>,
                <>At <a href="https://mcp.zapier.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>mcp.zapier.com</a> add the action <b style={{ color: 'var(--text)' }}>Google Sheets: Add row</b> and connect your Google account</>,
              ]} />
            </>
          )}

          {/* Step 4 — Fathom */}
          {step === 4 && (
            <>
              <H2>Fathom</H2>
              <P>Fathom records and summarizes your sales calls. Together with the Claude skill, it makes call logging completely automatic.</P>
              <Steps items={[
                <>Create a free account at <a href="https://fathom.video" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>fathom.video</a> and connect your calendar so it auto-joins your meetings</>,
                <>In <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>claude.ai</a> → Settings → Connectors, find <b style={{ color: 'var(--text)' }}>Fathom</b> and connect it</>,
                <>After your next call, tell Claude "log my last call" and the whole pipeline runs</>,
              ]} />
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Already using Fathom? Just make sure the Claude connector is on and continue.</div>
            </>
          )}

          {/* Step 5 — Calendly */}
          {step === 5 && (
            <>
              <H2 optional>Calendly</H2>
              <P>Connect Calendly to see your upcoming booked calls on the dashboard. Create a personal access token at <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>calendly.com/integrations</a> and paste it below.</P>
              <Label>Personal access token</Label>
              <Input type="password" value={calendlyPat} onChange={setCalendlyPat} placeholder="eyJraWQiOi..." />
              <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10 }}>You can skip this and add it later in Settings.</p>
            </>
          )}

          {/* Step 6 — Logo */}
          {step === 6 && (
            <>
              <H2 optional>Your logo</H2>
              <P>Add your company logo to personalise the dashboard. It will appear in the sidebar.</P>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logoPreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={logoPreview} alt="Logo preview" style={{ height: 48, maxWidth: 160, objectFit: 'contain', borderRadius: 6 }} />
                    <button onClick={() => setLogoPreview(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  </div>
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)', width: 'fit-content' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload logo
                  <input type="file" accept="image/*" onChange={handleLogoFile} style={{ display: 'none' }} />
                </label>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>PNG or SVG recommended. Max 1MB.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text4)' }}>or paste URL</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
                <Input value={logoUrl} onChange={v => { setLogoUrl(v); setLogoPreview(null) }} placeholder="https://your-site.com/logo.png" />
              </div>
            </>
          )}

          {/* Step 7 — Done */}
          {step === 7 && (
            <>
              <H2>Setup complete</H2>
              <P>Your sheets are connected. Next you'll get a quick tour of the dashboard so you know exactly how everything works.</P>
              <StatusMsg status={status} />
            </>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
            <div>{step > 0 && <Btn onClick={back}>Back</Btn>}</div>
            {step === 7
              ? <Btn primary onClick={finish} disabled={saving}>{saving ? 'Setting up...' : 'Start tour →'}</Btn>
              : <Btn primary onClick={next} disabled={!canNext}>Continue</Btn>}
          </div>
        </div>
      </div>
    </div>
  )
}
