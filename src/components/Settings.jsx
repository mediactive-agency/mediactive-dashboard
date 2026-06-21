import { useState, useEffect } from 'react'
import { saveUserConfig } from '../hooks/useData'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const OUTREACH_TEMPLATE = 'https://docs.google.com/spreadsheets/d/1YtTplni2SkwMkNh7uKbVTTRbcsrpiLuUA-UDEKcEZo4/copy'
const SALES_TEMPLATE = 'https://docs.google.com/spreadsheets/d/1tj37ympzYWEWjg3mHcJSUCrqbGZbEfe0fQK2NBdwlIs/copy'
const API_KEY = 'AIzaSyCp1H8a78aqz21-ztsOQ-yCRjZNyPxhZXM'

async function fetchSheetTabs(sheetId) {
  const url = `${SHEETS_API}/${sheetId}?key=${API_KEY}&fields=sheets.properties.title`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return (json.sheets || []).map(s => s.properties.title)
}

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

function TabPills({ tabs, isSelected, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {tabs.map(tab => {
        const on = isSelected(tab)
        return (
          <button key={tab} onClick={() => onPick(tab)} className={on ? 'hoverable-fade' : 'hoverable'} style={{
            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', border: '1px solid', borderColor: on ? 'var(--text)' : 'var(--border)',
            background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--text2)',
          }}>{tab}</button>
        )
      })}
    </div>
  )
}

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

export default function Settings({ user, config, workspaceId, workspace, isOwner, onSaved, isMobile }) {
  const [userName, setUserName] = useState('')
  const [outreachSheets, setOutreachSheets] = useState([])
  const [salesSheetInput, setSalesSheetInput] = useState('')
  const [salesSheetId, setSalesSheetId] = useState('')
  const [salesTab, setSalesTab] = useState('')
  const [salesTabsAvail, setSalesTabsAvail] = useState(null)
  const [salesSheetBusy, setSalesSheetBusy] = useState(false)
  const [salesSheetStatus, setSalesSheetStatus] = useState(null)
  const [newSheetInput, setNewSheetInput] = useState('')
  const [newSheetTabs, setNewSheetTabs] = useState([])
  const [newSheetTabsAvail, setNewSheetTabsAvail] = useState(null)
  const [newSheetId, setNewSheetId] = useState('')
  const [sheetBusy, setSheetBusy] = useState(false)
  const [sheetStatus, setSheetStatus] = useState(null)
  const [calendlyPat, setCalendlyPat] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dailyGoal, setDailyGoal] = useState(20)
  const [vslMode, setVslMode] = useState(false)
  const [weekendOutreach, setWeekendOutreach] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (config) {
      setUserName(config.userName || '')
      setOutreachSheets(config.outreachSheets || (config.outreachSheetId ? [{ id: config.outreachSheetId, tabs: config.outreachTabs || [] }] : []))
      setSalesSheetId(config.salesSheetId || '')
      setSalesTab(config.salesTab || 'Sheet1')
      setCalendlyPat(config.calendlyPat || '')
      setDailyGoal(config.dailyGoal ?? 20)
      setVslMode(config.vslMode ?? false)
      setWeekendOutreach(config.weekendOutreach ?? false)
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

  async function loadSalesSheetTabs() {
    const id = extractSheetId(salesSheetInput)
    if (!id) return
    setSalesSheetBusy(true); setSalesSheetStatus(null)
    try {
      const tabs = await fetchSheetTabs(id)
      setSalesSheetId(id); setSalesTabsAvail(tabs); setSalesTab(tabs[0] || 'Sheet1')
      setSalesSheetStatus({ type: 'ok', msg: 'Connected. Pick the tab with your call log.' })
    } catch(e) { setSalesSheetStatus({ type: 'err', msg: e.message }) }
    setSalesSheetBusy(false)
  }

  async function loadNewSheetTabs() {
    const id = extractSheetId(newSheetInput)
    if (!id) return
    setSheetBusy(true); setSheetStatus(null)
    try {
      const tabs = await fetchSheetTabs(id)
      setNewSheetId(id); setNewSheetTabsAvail(tabs)
      const monthTabs = tabs.filter(t => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t))
      setNewSheetTabs(monthTabs.length > 0 ? monthTabs : tabs)
      setSheetStatus({ type: 'ok', msg: `Found ${tabs.length} tabs.` })
    } catch(e) { setSheetStatus({ type: 'err', msg: e.message }) }
    setSheetBusy(false)
  }

  function addSheet() {
    if (!newSheetId || newSheetTabs.length === 0) return
    setOutreachSheets(prev => [...prev.filter(s => s.id !== newSheetId), { id: newSheetId, tabs: newSheetTabs }])
    setNewSheetInput(''); setNewSheetId(''); setNewSheetTabsAvail(null); setNewSheetTabs([]); setSheetStatus(null)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await saveUserConfig(workspaceId || user.uid, {
        userName: userName.trim(),
        dailyGoal: Number(dailyGoal) || 20,
        vslMode: vslMode,
        weekendOutreach: weekendOutreach,
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

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    if (!workspace || !workspaceId) return
    setMembersLoading(true)
    workspace.listMembers(workspaceId).then(setMembers).finally(() => setMembersLoading(false))
  }, [workspace, workspaceId])

  async function handleCreateInvite() {
    setInviteBusy(true); setInviteCopied(false)
    try {
      const link = await workspace.createInvite()
      setInviteLink(link)
    } catch (e) { setError(e.message) }
    setInviteBusy(false)
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteLink)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  async function handleRemoveMember(uid) {
    if (!workspace || !workspaceId) return
    await workspace.removeMember(uid, workspaceId)
    setMembers(prev => prev.filter(m => m.uid !== uid))
  }

  function TeamSection() {
    return (
      <Section title="Team">
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
          Invite a teammate (setter, ops...) to see this workspace. Send them the link, they sign in with Google and they're in.
        </div>
        {isOwner && (
          <div style={{ marginBottom: 18 }}>
            <button onClick={handleCreateInvite} disabled={inviteBusy} style={{ padding: '9px 16px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: inviteBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {inviteBusy ? 'Generating...' : '+ Create invite link'}
            </button>
            {inviteLink && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <input readOnly value={inviteLink} onFocus={e => e.target.select()}
                  style={{ flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', outline: 'none' }} />
                <button onClick={copyInvite} style={{ padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                  {inviteCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--text4)', marginTop: 8 }}>Link is valid for 7 days and works once.</div>
          </div>
        )}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
        {membersLoading ? (
          <div style={{ fontSize: 13, color: 'var(--text4)' }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text4)' }}>Just you for now.</div>
        ) : (
          members.map(m => (
            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.displayName || m.email || m.uid}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.role === 'owner' ? 'Owner' : 'Member'}</div>
              </div>
              {isOwner && m.role !== 'owner' && (
                <button onClick={() => handleRemoveMember(m.uid)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Remove</button>
              )}
            </div>
          ))
        )}
      </Section>
    )
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <TeamSection />
      <Section title="Profile">
        <Input label="First name" value={userName} onChange={setUserName} placeholder="e.g. Alex" />
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Daily outreach goal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min="1" max="500"
              value={dailyGoal}
              onChange={e => setDailyGoal(e.target.value)}
              style={{
                width: 80, padding: '9px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>connections per day</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>Used in Daily Tasks to mark the day as done. Default is 20.</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Outreach workflow</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => setVslMode(v => !v)}
              style={{
                width: 40, height: 22, borderRadius: 11, flexShrink: 0, marginTop: 1,
                background: vslMode ? '#B16CEA' : 'var(--border)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: vslMode ? 20 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>VSL workflow</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                Enable if you send a video sales letter after the first positive reply. Adds a second followup round and a Calendly'd stage in your outreach funnel.
              </div>
            </div>
          </label>
        </div>
      </Section>

      <Section title="Logo">
        {logoPreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img src={logoPreview} alt="Logo" style={{ height: 40, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }} />
            <button onClick={() => { setLogoPreview(null); setLogoUrl('') }} className="hoverable" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
          </div>
        )}
        <label className="hoverable" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
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

      <Section title="Outreach Sheets">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <a href={OUTREACH_TEMPLATE} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Outreach template
          </a>
        </div>
        {outreachSheets.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{s.id.slice(0, 24)}...</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.tabs.join(', ')}</div>
            </div>
            <button onClick={() => setOutreachSheets(prev => prev.filter(x => x.id !== s.id))} className="hoverable" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
          </div>
        ))}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add another sheet</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={newSheetInput} onChange={e => setNewSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={loadNewSheetTabs} disabled={sheetBusy || !newSheetInput.trim()} className="hoverable-fade" style={{ padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {sheetBusy ? 'Loading...' : 'Load tabs'}
          </button>
        </div>
        {newSheetTabsAvail && (
          <>
            <TabPills tabs={newSheetTabsAvail} isSelected={t => newSheetTabs.includes(t)} onPick={t => setNewSheetTabs(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
            {newSheetId && newSheetTabs.length > 0 && (
              <button onClick={addSheet} className="hoverable-fade" style={{ padding: '8px 14px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
                + Add sheet
              </button>
            )}
          </>
        )}
        {sheetStatus && <div style={{ fontSize: 12, color: sheetStatus.type === 'ok' ? '#10B981' : '#EF4444', marginTop: 8, fontWeight: 600 }}>{sheetStatus.msg}</div>}
      </Section>

      <Section title="Sales Calls Sheet">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <a href={SALES_TEMPLATE} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Sales calls template
          </a>
        </div>
        {salesSheetId && (
          <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--text3)' }}>
            Connected: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{salesSheetId.slice(0,24)}...</span>
            <span style={{ marginLeft: 8, color: 'var(--text4)' }}>Tab: {salesTab}</span>
          </div>
        )}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reconnect</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={salesSheetInput} onChange={e => setSalesSheetInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={loadSalesSheetTabs} disabled={salesSheetBusy || !salesSheetInput.trim()} className="hoverable-fade" style={{ padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {salesSheetBusy ? 'Loading...' : 'Connect'}
          </button>
        </div>
        {salesTabsAvail && (
          <TabPills tabs={salesTabsAvail} isSelected={t => salesTab === t} onPick={setSalesTab} />
        )}
        {salesSheetStatus && <div style={{ fontSize: 12, color: salesSheetStatus.type === 'ok' ? '#10B981' : '#EF4444', marginTop: 6, fontWeight: 600 }}>{salesSheetStatus.msg}</div>}
      </Section>

      {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button onClick={save} disabled={saving} className="hoverable-fade" style={{ padding: '12px 24px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
      </button>
    </div>
  )
}
