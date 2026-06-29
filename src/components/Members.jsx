import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import Outreach from './Outreach'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API_KEY = 'AIzaSyCp1H8a78aqz21-ztsOQ-yCRjZNyPxhZXM'

async function fetchRange(sheetId, range) {
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.values || []
}

function MemberCard({ member, onSelect }) {
  return (
    <div onClick={() => onSelect(member)}
      style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)', padding: '20px 24px', cursor: 'pointer', transition: 'transform 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = ''}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>
          {(member.userName || member.email || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{member.userName || 'Unnamed'}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  )
}

function MemberDashboard({ member, isMobile, isTablet }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const sheets = member.outreachSheets || (member.outreachSheetId ? [{ id: member.outreachSheetId, tabs: member.outreachTabs || ['Mar','Apr','May','Jun'] }] : [])
        const tabData = {}
        await Promise.all(sheets.map(async sheet => {
          const tabs = sheet.tabs || []
          const results = await Promise.all(tabs.map(tab => fetchRange(sheet.id, `${tab}!A1:AZ700`).catch(() => [])))
          tabs.forEach((tab, i) => {
            const key = tab.toLowerCase().slice(0, 3)
            tabData[key] = [...(tabData[key] || []), ...results[i]]
          })
        }))
        setData({ mar: tabData['mar']||[], apr: tabData['apr']||[], may: tabData['may']||[], jun: tabData['jun']||[] })
      } catch(e) { setError(e.message) }
      setLoading(false)
    }
    load()
  }, [member])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}><div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
  if (error) return <div style={{ color: '#EF4444', padding: 20 }}>{error}</div>
  if (!data) return null

  return (
    <div>
      <Outreach data={data} filter="all" isMobile={isMobile} isTablet={isTablet} />
    </div>
  )
}

export default function Members({ isMobile, isTablet }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'users'))
        setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(m => m.setupComplete))
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} className="hoverable-fade" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Members
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          {(selected.userName || selected.email || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{selected.userName || 'Unnamed'}</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{selected.email}</div>
        </div>
      </div>
      <MemberDashboard member={selected} isMobile={isMobile} isTablet={isTablet} />
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ color: 'var(--text4)', fontSize: 14 }}>No members yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 14 }}>
          {members.map(m => <MemberCard key={m.uid} member={m} onSelect={setSelected} />)}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
