import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API_KEY = 'AIzaSyCp1H8a78aqz21-ztsOQ-yCRjZNyPxhZXM'
const PROXY = "https://script.google.com/macros/s/AKfycbwhZJ3fb9is6_vU1Wh7RdHWM0-dCwNQ6xTkIc3N45v7L9dNnRmycZhEQZfM17nKW2Hy/exec"

function extractSheetId(input) {
  if (!input) return ''
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

async function fetchRange(sheetId, range) {
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.values || []
}

async function fetchCalendly(pat) {
  if (!pat) return { collection: [] }
  try {
    // Calendly fetch stále přes proxy (potřebuje server-side kvůli CORS)
    const res = await fetch(`${PROXY}?calendly=1`)
    return await res.json()
  } catch (e) {
    return { collection: [] }
  }
}

export async function saveUserConfig(userId, config) {
  await setDoc(doc(db, 'users', userId), config, { merge: true })
}

export async function saveClientConfig(clientId, config) {
  await setDoc(doc(db, 'clients', clientId), config, { merge: true })
}

export async function getUserConfig(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? snap.data() : null
}

export async function fetchDashboardData(cfg) {
  const salesId = cfg.salesSheetId

  // Podpora více outreach sheetů (multi-year)
  const outreachSheets = cfg.outreachSheets ||
    (cfg.outreachSheetId ? [{ id: cfg.outreachSheetId, tabs: cfg.outreachTabs || ['Mar','Apr','May','Jun'] }] : [])

  // Fetch všechny sheety, merguj taby, stejný tab z různých sheetů se sloučí
  const tabData = {}
  await Promise.all(outreachSheets.map(async sheet => {
    const sheetTabs = sheet.tabs || []
    const results = await Promise.all(
      sheetTabs.map(tab => fetchRange(sheet.id, `${tab}!A1:AZ700`).catch(() => []))
    )
    sheetTabs.forEach((tab, i) => {
      const key = tab.toLowerCase().slice(0, 3)
      if (!tabData[key]) tabData[key] = []
      tabData[key] = [...tabData[key], ...results[i]]
    })
  }))

  const salesTab = cfg.salesTab || 'Sheet1'
  const sales = salesId
    ? await fetchRange(salesId, `${salesTab}!A:J`).catch(() => [])
    : []

  const calendly = await fetchCalendly(cfg.calendlyPat)

  // tabData obsahuje VŠECHNY natažené taby (klíč = první 3 písmena tabu, lowercase)
  //, žádný hardcoded seznam měsíců, kolik tabů je ve Settings nakonfigurováno, tolik se sem propíše.
  // mar/apr/may/jun mají fallback na [], protože na ně přímo spoléhá starší Dashboard kód.
  return {
    mar: [], apr: [], may: [], jun: [],
    ...tabData,
    sales,
    calendly,
  }
}

export function useData(user, workspaceId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)
  const [config, setConfig] = useState(null)
  const [needsSetup, setNeedsSetup] = useState(false)

  const effectiveId = workspaceId || user?.uid

  async function load() {
    if (!user || !effectiveId) return
    setLoading(true)
    setError(null)
    try {
      // Načti config aktivního workspace z Firestore
      const cfg = await getUserConfig(effectiveId)
      if (!cfg || !cfg.outreachSheetId) {
        setNeedsSetup(true)
        setLoading(false)
        return
      }
      setConfig(cfg)
      setNeedsSetup(false)

      const result = await fetchDashboardData(cfg)
      setData(result)
      setLoadedAt(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.uid, effectiveId])

  return { data, loading, error, reload: load, loadedAt, config, needsSetup }
}
