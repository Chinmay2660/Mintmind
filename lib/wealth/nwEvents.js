import { ASSET_LABELS, LIABILITY_LABELS } from './labels.js'

const num = (v) => Number(v) || 0
const label = (map, k) => map[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
const lakh = (n) => {
  const v = Math.abs(n)
  if (v >= 10000000) return `₹${+(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${+(v / 100000).toFixed(2)} L`
  if (v >= 1000) return `₹${+(v / 1000).toFixed(1)} K`
  return `₹${Math.round(v)}`
}

/**
 * Milestones worked out from the monthly net worth snapshots, to mark on the chart. Nothing is guessed: each event is a
 * change between two saved months.
 *   start    : the first month tracked
 *   debt-new : a kind of loan appears, or card dues start
 *   debt-down: a loan balance falls by at least a tenth, or is cleared
 *   asset-new: a kind of asset appears
 *   asset-up : one kind of asset rises by at least 15% of the previous total assets (new money or a big revaluation)
 *   note     : a month you wrote a note on
 * Each event has the net worth change for that month, and the list is the most important ones in date order.
 */
export function netWorthEvents(snapshots = [], { max = 8 } = {}) {
  const snaps = [...snapshots].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const out = []
  snaps.forEach((s, i) => {
    const prev = i > 0 ? snaps[i - 1] : null
    const delta = prev ? Math.round(num(s.netWorth) - num(prev.netWorth)) : null
    const add = (kind, text, weight) => out.push({ id: `${s.id}:${kind}:${out.length}`, ym: s.id, date: s.date, kind, text, nwDelta: delta, weight })
    if (!prev) { add('start', 'Started tracking', 100); if (s.note) add('note', s.note, 40); return }
    const aPrev = s.assetBreakdown ? prev.assetBreakdown || {} : {}, lPrev = prev.liabilityBreakdown || {}
    for (const [k, v] of Object.entries(s.liabilityBreakdown || {})) {
      const now = num(v), before = num(lPrev[k])
      if (now > 0 && before === 0) add('debt-new', `Added ${label(LIABILITY_LABELS, k).toLowerCase()} ${lakh(now)}`, 80 + Math.min(15, now / 1000000))
      else if (before > 0 && now < before * 0.9) add('debt-down', now === 0 ? `Cleared ${label(LIABILITY_LABELS, k).toLowerCase()}` : `Paid down ${label(LIABILITY_LABELS, k).toLowerCase()} by ${lakh(before - now)}`, 70 + Math.min(15, (before - now) / 1000000))
    }
    for (const [k, v] of Object.entries(prev.liabilityBreakdown || {})) if (num(v) > 0 && !(k in (s.liabilityBreakdown || {}))) add('debt-down', `Cleared ${label(LIABILITY_LABELS, k).toLowerCase()}`, 75)
    const totalPrev = num(prev.assets)
    for (const [k, v] of Object.entries(s.assetBreakdown || {})) {
      const now = num(v), before = num(aPrev[k])
      if (now > 0 && before === 0 && totalPrev > 0) add('asset-new', `Added ${label(ASSET_LABELS, k)} ${lakh(now)}`, 60 + Math.min(15, now / 1000000))
      else if (before > 0 && totalPrev > 0 && now - before >= totalPrev * 0.15) add('asset-up', `${label(ASSET_LABELS, k)} up ${lakh(now - before)}`, 50 + Math.min(15, (now - before) / 1000000))
    }
    if (s.note) add('note', s.note, 40)
  })
  // keep the start, then the heaviest, then put them back in date order
  const keep = new Set([...out].sort((a, b) => b.weight - a.weight).slice(0, max).map((e) => e.id))
  return out.filter((e) => keep.has(e.id)).sort((a, b) => a.date.localeCompare(b.date) || b.weight - a.weight)
}
