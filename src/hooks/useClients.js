import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const PROXY = "https://script.google.com/macros/s/AKfycbwhZJ3fb9is6_vU1Wh7RdHWM0-dCwNQ6xTkIc3N45v7L9dNnRmycZhEQZfM17nKW2Hy/exec"

async function fetchClientSheetData(client) {
  const tabs = (client['Sheet Tabs'] || 'Mar,Apr,May,Jun').split(',').map(t => t.trim())
  const sheetId = client['Outreach Sheet ID']
  const results = await Promise.all(tabs.map(tab =>
    fetch(`${PROXY}?id=${sheetId}&range=${encodeURIComponent(tab + '!A1:AZ700')}`)
      .then(r => r.json()).then(d => d.values || []).catch(() => [])
  ))
  const dataObj = {}
  tabs.forEach((tab, i) => { dataObj[tab.toLowerCase().slice(0, 3)] = results[i] })
  return {
    mar: dataObj['mar'] || results[0] || [],
    apr: dataObj['apr'] || results[1] || [],
    may: dataObj['may'] || results[2] || [],
    jun: dataObj['jun'] || results[3] || [],
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
