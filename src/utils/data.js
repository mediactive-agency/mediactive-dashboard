export const TODAY = new Date()

export function toDateStr(val) {
  if (!val) return null
  if (typeof val === 'string') {
    const s = val.trim()
    // ISO with time component — apply local timezone offset to get correct date
    if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
      const d = new Date(s)
      const offset = d.getTimezoneOffset()
      const corrected = new Date(d.getTime() - offset * 60 * 1000)
      return corrected.getUTCFullYear() + '-' + String(corrected.getUTCMonth()+1).padStart(2,'0') + '-' + String(corrected.getUTCDate()).padStart(2,'0')
    }
    // Already YYYY-MM-DD
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
    // DD/MM/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
    // DD-Mon-YYYY
    const m3 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
    if (m3) {
      const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
      return `${m3[3]}-${months[m3[2]]||'01'}-${m3[1].padStart(2,'0')}`
    }
    return null
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  }
  return null
}

export function toSalesDateStr(val) {
  if (!val) return null
  if (typeof val === 'string') {
    const s = val.trim()
    const MONTHS = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
    const m3 = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
    if (m3 && MONTHS[m3[2]]) return `${m3[3]}-${MONTHS[m3[2]]}-${m3[1].padStart(2,'0')}`
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
    return toDateStr(val)
  }
  return toDateStr(val)
}

export function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

export function ago(n) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return dateStr(d)
}

export const todayStr = dateStr(TODAY)

export function inRange(ds, filter, customFrom, customTo) {
  if (!ds) return false
  switch(filter) {
    case 'today':     return ds === todayStr
    case 'yesterday': return ds === ago(1)
    case '7d':        return ds >= ago(7)
    case '14d':       return ds >= ago(14)
    case '30d':       return ds >= ago(30)
    case '90d':       return ds >= ago(90)
    case 'custom':    return (!customFrom || ds >= customFrom) && (!customTo || ds <= customTo)
    default:          return true
  }
}

export function normName(n) {
  if (!n) return ''
  if (n.includes('Main acc Normal')) return 'Main acc — Normal'
  if (n.includes('2nd acc Normal') || n.includes('2nd Account Old')) return '2nd acc — Normal'
  if (n.includes('Main acc preview')) return 'Main acc — Preview'
  if (n.includes('2nd acc preview')) return '2nd acc — Preview'
  if (n.toLowerCase().includes('inmail') && n.toLowerCase().includes('new')) return 'InMails — New Niche'
  if (n.toLowerCase().includes('inmail')) return 'InMails'
  if (n.includes('New Niche')) return 'Main acc — New Niche'
  if (n.includes('Old Niche')) return 'Main acc — Old Niche'
  return n
}

export const FILTERS = [
  { key: 'all',       label: 'All Time' },
  { key: '90d',       label: '90d' },
  { key: '30d',       label: '30d' },
  { key: '14d',       label: '14d' },
  { key: '7d',        label: '7d' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today',     label: 'Today' },
  { key: 'custom',    label: 'Custom' },
]

export const LOGO_SVG = `<svg width="110" height="17" viewBox="0 0 1263 194" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 2.86785H29.4606L90.4676 108.978H92.0319L153.039 2.86785H182.239V189.539H153.039V88.1212L154.603 56.8356H153.039L99.8533 149.91H82.3855L29.4606 56.8356H27.8964L29.4606 88.1212V189.539H0V2.86785ZM333.915 159.035C328.527 168.942 320.879 177.199 310.972 183.803C301.065 190.408 288.898 193.71 274.472 193.71C264.912 193.71 256.048 192.059 247.88 188.757C239.884 185.281 232.932 180.5 227.022 174.417C221.113 168.334 216.507 161.208 213.205 153.039C209.902 144.696 208.251 135.571 208.251 125.664C208.251 116.452 209.815 107.761 212.944 99.5926C216.072 91.2498 220.418 84.0367 225.98 77.9534C231.715 71.6963 238.58 66.7427 246.576 63.0927C254.572 59.4427 263.436 57.6177 273.169 57.6177C283.076 57.6177 291.854 59.2689 299.501 62.5713C307.322 65.8737 313.927 70.4796 319.315 76.3891C324.703 82.2986 328.787 89.4248 331.569 97.7676C334.523 106.11 336.001 115.235 336.001 125.143C336.001 126.011 336.001 126.793 336.001 127.489C335.827 128.358 335.74 129.14 335.74 129.835C335.566 130.531 335.479 131.226 335.479 131.921H237.19C237.712 138.004 239.189 143.306 241.622 147.825C244.055 152.343 247.011 156.081 250.487 159.035C254.137 161.99 258.134 164.163 262.479 165.553C266.825 166.943 271.083 167.639 275.254 167.639C283.597 167.639 290.462 165.64 295.851 161.642C301.239 157.645 305.671 152.692 309.147 146.782L333.915 159.035ZM307.062 109.76C306.714 107.153 305.845 104.285 304.454 101.157C303.237 97.8545 301.239 94.8998 298.458 92.2926C295.851 89.5117 292.375 87.1652 288.029 85.2534C283.858 83.3415 278.73 82.3855 272.647 82.3855C264.305 82.3855 257.091 84.9058 251.008 89.9462C245.098 94.8129 241.101 101.418 239.015 109.76H307.062Z" fill="url(#logo_grad)"/><defs><linearGradient id="logo_grad" x1="0" y1="96.8551" x2="1262.76" y2="96.8551" gradientUnits="userSpaceOnUse"><stop stop-color="#B16CEA"/><stop offset="0.504808" stop-color="#FF5E69"/><stop offset="1" stop-color="#FFA84B"/></linearGradient></defs></svg>`

export const LOGO_MINI_SVG = `<svg width="16" height="17" viewBox="0 0 183 194" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 2.86785H29.4606L90.4676 108.978H92.0319L153.039 2.86785H182.239V189.539H153.039V88.1212L154.603 56.8356H153.039L99.8533 149.91H82.3855L29.4606 56.8356H27.8964L29.4606 88.1212V189.539H0V2.86785Z" fill="url(#mg)"/><defs><linearGradient id="mg" x1="0" y1="96" x2="183" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="#B16CEA"/><stop offset="1" stop-color="#FF5E69"/></linearGradient></defs></svg>`
export function pct(a, b) { return b > 0 ? +((a/b)*100).toFixed(1) : 0 }
