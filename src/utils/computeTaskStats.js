import { TODAY, toDateStr, dateStr } from './data'

function nextBizDay(d) {
  const n = new Date(d); n.setDate(n.getDate()+1)
  if (n.getDay() === 6) n.setDate(n.getDate()+2)
  if (n.getDay() === 0) n.setDate(n.getDate()+1)
  return n
}

export function computeTaskStats(data) {
  if (!data) return null

  const now = new Date(TODAY)
  const today = new Date(now)
  if (now.getHours() < 3) today.setDate(today.getDate() - 1)
  const todayStr = dateStr(today)

  const allRows = []
  for (const sheet of [data.mar, data.apr, data.may, data.jun||[]]) {
    let ds = -1
    for (let i = 0; i < sheet.length; i++) { if (sheet[i] && sheet[i][1] === 'Name' && sheet[i][3] === 'Date') { ds = i+1; break } }
    if (ds < 0) continue
    for (let i = ds; i < sheet.length; i++) {
      const r = sheet[i]; if (!r || !r[3]) continue
      const d = toDateStr(r[3]); if (!d) continue
      allRows.push({ r, date: d })
    }
  }

  const dailyInitiated = {}, dailyFUDone = {}, dailyFUTotal = {}, dailyPFUDone = {}, dailyPFUTotal = {}
  const calDays = []
  const start = new Date('2026-03-01T12:00:00'); const end = new Date(todayStr+'T12:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) { if (d.getDay() !== 0 && d.getDay() !== 6) calDays.push(dateStr(d)) }

  allRows.forEach(x => { dailyInitiated[x.date] = (dailyInitiated[x.date]||0) + 1 })
  allRows.forEach(x => {
    const r = x.r; const varN = String(r[4]||'').toLowerCase()
    if (varN.includes('inmail')) return
    const bookedDate = toDateStr(r[27]); const hasPositiveReply = !!(r[14] && toDateStr(r[14]))
    if (!hasPositiveReply) {
      const fuDoneDate = r[5] ? toDateStr(r[5]) : null
      if ((r[6]||r[7]||r[8]||r[9]) && !fuDoneDate) return
      const dueDate = dateStr(nextBizDay(new Date(x.date+'T12:00:00')))
      if (bookedDate && bookedDate <= dueDate) return
      dailyFUTotal[dueDate] = (dailyFUTotal[dueDate]||0) + 1
      if (fuDoneDate === dueDate) dailyFUDone[dueDate] = (dailyFUDone[dueDate]||0) + 1
    } else {
      const replyDate = toDateStr(r[14]); if (!replyDate) return
      const slots = []
      for (let i = 0; i < 7; i++) {
        const v = String(r[16+i]||'').trim(); const sd = toDateStr(r[16+i])
        if (!v) slots.push({ date: null, text: false })
        else if (sd) slots.push({ date: sd, text: false })
        else slots.push({ date: null, text: true })
      }
      const slotDueDates = []; let prevDate = replyDate
      for (let i = 0; i < 7; i++) {
        const due = dateStr(nextBizDay(new Date(prevDate+'T12:00:00')))
        slotDueDates.push(due); prevDate = slots[i].date || due
      }
      const activeFrom = dateStr(nextBizDay(new Date(replyDate+'T12:00:00')))
      for (const D of calDays) {
        if (D < activeFrom) continue
        if (bookedDate && bookedDate <= D) break
        let endedAsOfD = false, filledAsOfD = 0
        for (let i = 0; i < 7; i++) {
          if (slots[i].text && slotDueDates[i] <= D) { endedAsOfD = true; break }
          if (slots[i].date && slots[i].date <= D) filledAsOfD++
        }
        if (endedAsOfD) break; if (filledAsOfD === 7) break
        dailyPFUTotal[D] = (dailyPFUTotal[D]||0) + 1
        for (let i = 0; i < 7; i++) { if (slots[i].date === D) { dailyPFUDone[D] = (dailyPFUDone[D]||0) + 1; break } }
      }
    }
  })

  const dailyFollowupTotal = {}, dailyFollowupDone = {}
  calDays.forEach(D => {
    const t = (dailyFUTotal[D]||0)+(dailyPFUTotal[D]||0), d2 = (dailyFUDone[D]||0)+(dailyPFUDone[D]||0)
    if (t > 0) dailyFollowupTotal[D] = t; if (d2 > 0) dailyFollowupDone[D] = d2
  })

  const outreachCount = allRows.filter(x => x.date === todayStr).length
  const fuTotal = dailyFUTotal[todayStr]||0, fuDone = dailyFUDone[todayStr]||0
  const pfuTotal = dailyPFUTotal[todayStr]||0, pfuDone = dailyPFUDone[todayStr]||0

  let streak = 0
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const ds2 = dateStr(d)
    const initiated = dailyInitiated[ds2]||0
    const fuT = dailyFollowupTotal[ds2]||0, fuD = dailyFollowupDone[ds2]||0
    const done = initiated >= 20 && (fuT === 0 || fuD >= fuT)
    // Dnešek: připočti pokud splněný, ale nerozbíjej streak pokud ještě ne
    if (i === 0) { if (done) streak++; break }
    if (done) streak++
    else break
  }

  return { dailyInitiated, dailyFUTotal, dailyFUDone, dailyPFUTotal, dailyPFUDone, dailyFollowupTotal, dailyFollowupDone, outreachCount, fuTotal, fuDone, pfuTotal, pfuDone, streak, todayStr, today }
}
