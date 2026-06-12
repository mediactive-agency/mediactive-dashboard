import { useState, useEffect } from 'react'

const PROXY = "https://script.google.com/macros/s/AKfycbwhZJ3fb9is6_vU1Wh7RdHWM0-dCwNQ6xTkIc3N45v7L9dNnRmycZhEQZfM17nKW2Hy/exec"
const OUTREACH_ID = "1B5cc52T8mGLqcmvpBjneyb5v4N1W88ORrXz4JWfvZU0"
const SALES_ID = "1Stqpv22BnAlU0OGf9fjRjaWDlDMwMC4M3Myhp09iP8E"

async function fetchRange(id, range) {
  const res = await fetch(`${PROXY}?id=${id}&range=${encodeURIComponent(range)}`)
  const json = await res.json()
  return json.values || []
}

async function fetchCalendly() {
  try {
    const res = await fetch(`${PROXY}?calendly=1`)
    return await res.json()
  } catch (e) {
    return { collection: [] }
  }
}

export function useData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [mar, apr, may, jun, sales, calendly] = await Promise.all([
        fetchRange(OUTREACH_ID, "Mar!A1:AZ600"),
        fetchRange(OUTREACH_ID, "Apr!A1:AZ700"),
        fetchRange(OUTREACH_ID, "May!A1:AZ700"),
        fetchRange(OUTREACH_ID, "Jun!A1:AZ700"),
        fetchRange(SALES_ID, "Sheet1!A:J"),
        fetchCalendly(),
      ])
      setData({ mar, apr, may, jun, sales, calendly })
      setLoadedAt(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { data, loading, error, reload: load, loadedAt }
}
