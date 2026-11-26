/**
 * The fund's chart from real NAV history: for each day the NAV was published, the units held then × that day's NAV (value),
 * against what had been put in by then (invested). `history` is [{ date: 'DD-MM-YYYY', nav }] oldest first, as mfapi.in gives it.
 * Starts at the first purchase, keeps at most `max` points, and ends on today's figures. Returns [] when there is nothing to draw.
 */
export function navSeries(history = [], txns = [], today = { date: '', value: 0, invested: 0 }, max = 160) {
  const iso = (d) => (/^\d{2}-\d{2}-\d{4}$/.test(d) ? d.split('-').reverse().join('-') : String(d))
  const buys = [...txns].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  if (!buys.length) return []
  const first = buys[0].date
  const days = history.map((h) => ({ date: iso(h.date), nav: Number(h.nav) })).filter((h) => h.date >= first && h.nav > 0)
  if (days.length < 2) return []
  const step = Math.max(1, Math.ceil(days.length / max))
  const picked = days.filter((_, i) => i % step === 0 || i === days.length - 1)
  let k = 0, units = 0, cost = 0
  const out = picked.map((d) => {
    while (k < buys.length && buys[k].date <= d.date) {
      const t = buys[k++], u = Math.abs(Number(t.units) || 0), amt = Math.abs(Number(t.amount) || 0)
      if (t.type === 'redeem') { const avg = units > 0 ? cost / units : 0; const used = Math.min(u, units); cost -= avg * used; units -= used } else { units += u; cost += amt }
    }
    return { date: d.date, invested: Math.round(cost), value: Math.round(units * d.nav) }
  })
  if (today.date && today.date > out[out.length - 1].date) out.push({ date: today.date, invested: Math.round(today.invested), value: Math.round(today.value) })
  return out
}
