import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const PROXY = "https://script.google.com/macros/s/AKfycbwhZJ3fb9is6_vU1Wh7RdHWM0-dCwNQ6xTkIc3N45v7L9dNnRmycZhEQZfM17nKW2Hy/exec"

// Same idea as the per-user config (useData.js): a client can have one legacy
// single sheet, or a list of sheets that all get merged into the client's data.
function normalizeClientSheets(c) {
  return c['Outreach Sheets'] || (c['Outreach Sheet ID'] ? [{ id: c['Outreach Sheet ID'], tabs: (c['Sheet Tabs'] || 'Mar,Apr,May,Jun').split(',').map(t => t.trim()) }] : [])
}

async function fetchClientSheetData(client) {
  const sheets = normalizeClientSheets(client)
  const tabData = {}
  await Promise.all(sheets.map(async sheet => {
    const tabs = sheet.tabs || []
    const results = await Promise.all(tabs.map(tab =>
      fetch(`${PROXY}?id=${sheet.id}&range=${encodeURIComponent(tab + '!A1:AZ700')}`)
        .then(r => r.json()).then(d => d.values || []).catch(() => [])
    ))
    tabs.forEach((tab, i) => {
      const key = tab.toLowerCase().slice(0, 3)
      if (!tabData[key]) tabData[key] = []
      tabData[key] = [...tabData[key], ...(results[i] || [])]
    })
  }))
  return {
    mar: [], apr: [], may: [], jun: [],
    ...tabData,
  }
}

// Loads your clients and their outreach sheet data, lives at the App level so it
// survives switching tabs. `enabled` should only flip true once the main dashboard
// data (useData) has already finished loading, so this slow per-client fetch runs
// quietly in the background instead of competing with or blocking your own data.
// By the time you actually click the Clients tab it's usually already there.
export function useClients(user, { enabled = true } = {}) {
  const [clients, setClients] = useState([])
  const [clientData, setClientData] = useState({})
  const [loading, setLoading] = useState(false)
  const startedForUid = useRef(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'clients'), where('active', '==', true), where('userId', '==', user.uid)))
      const list = snap.docs.map(d => ({
        ID: d.id, Name: d.data().name, Color: d.data().color,
        'Outreach Sheet ID': d.data().outreachSheetId, 'Sheet Tabs': d.data().sheetTabs,
        'Outreach Sheets': d.data().outreachSheets || null,
        'Calendly PAT': d.data().calendlyPat, 'Calendly User URI': d.data().calendlyUserUri,
        'Created At': d.data().createdAt?.toDate?.() || new Date(),
        campaignMessages: d.data().campaignMessages || {},
      }))
      setClients(list)
      const dataMap = {}
      await Promise.all(list.map(async c => {
        try { dataMap[c.ID] = await fetchClientSheetData(c) }
        catch (e) { dataMap[c.ID] = null }
      }))
      setClientData(dataMap)
    } catch (e) {
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled || !user) return
    if (startedForUid.current === user.uid) return // already kicked off for this user
    startedForUid.current = user.uid
    load()
  }, [enabled, user?.uid])

  return { clients, clientData, loading, reload: load }
}
