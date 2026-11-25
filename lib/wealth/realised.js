// Realised gains on mutual funds (pure, tested).
//
// Method: AVERAGE COST, the same basis the app already uses to reduce "invested" when units are redeemed (see positionFrom in
// statementImport.js), so realised gain + unrealised gain adds up to the total. Indian tax statements use FIFO lots and
// holding periods, so the figure here is a track record, not a tax computation.
//
// A redemption needs its units. A purchase with no units recorded (a typed-in holding, for example) means the average cost is
// unknown, and the result is marked `incomplete` instead of guessing.

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const r3 = (n) => Math.round(Number(n) * 1000) / 1000

/** One fund's transactions (any order) to { realised, proceeds, soldCost, sells, incomplete }. */
export function realisedGains(txns = []) {
  const list = [...txns].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  let units = 0, cost = 0, realised = 0, proceeds = 0, soldCost = 0, incomplete = false
  const sells = []
  for (const t of list) {
    const amount = Math.abs(Number(t.amount) || 0)
    const u = Math.abs(Number(t.units) || 0)
    if (t.type === 'redeem') {
      if (!(u > 0)) { incomplete = true; continue }
      const avg = units > 0 ? cost / units : 0
      const used = Math.min(u, units)
      if (used < u - 0.0005 || !(avg > 0)) incomplete = true // sold more than the history shows, or no known cost
      const part = amount * (used / u)
      const c = avg * used
      realised += part - c; proceeds += part; soldCost += c
      sells.push({ date: t.date, units: r3(used), proceeds: r2(part), cost: r2(c), gain: r2(part - c) })
      cost -= c; units -= used
    } else {
      if (!(u > 0)) incomplete = true
      units += u; cost += amount
    }
  }
  return { realised: r2(realised), proceeds: r2(proceeds), soldCost: r2(soldCost), sells, incomplete, hasSales: sells.length > 0 }
}

/** All funds together. `hasSales` is false until something has been redeemed; `incomplete` if any fund's history is. */
export function portfolioRealised(funds = [], txns = []) {
  let realised = 0, proceeds = 0, soldCost = 0, hasSales = false, incomplete = false
  for (const f of funds) {
    const g = realisedGains(txns.filter((t) => t.fundId === f.id))
    realised += g.realised; proceeds += g.proceeds; soldCost += g.soldCost
    hasSales = hasSales || g.hasSales
    incomplete = incomplete || (g.hasSales && g.incomplete)
  }
  return { realised: r2(realised), proceeds: r2(proceeds), soldCost: r2(soldCost), hasSales, incomplete }
}

/**
 * Selling units from a fund you hold: the new position (average cost) and the transaction to record.
 * Throws a plain message when the entry cannot be right. `nav` or `amount` must be given; the other is worked out.
 */
export function applyRedemption(fund, { date, units, nav, amount }) {
  const u = Number(units)
  if (!(u > 0)) throw new Error('Enter how many units were sold')
  const held = Number(fund.units) || 0
  if (u > held + 0.0005) throw new Error(`You hold ${r3(held)} units, so you cannot sell ${r3(u)}`)
  let n = Number(nav), amt = Number(amount)
  if (!(amt > 0) && n > 0) amt = u * n
  if (!(n > 0) && amt > 0) n = amt / u
  if (!(amt > 0)) throw new Error('Enter the sale amount or the NAV it was sold at')
  if (!date) throw new Error('Choose the date')
  const avg = held > 0 ? (Number(fund.invested) || 0) / held : 0
  const remaining = r3(held - u)
  const invested = r2(Math.max(0, (Number(fund.invested) || 0) - avg * u))
  return {
    txn: { date, type: 'redeem', amount: r2(amt), nav: r2(n), units: r3(u) },
    fund: {
      units: remaining,
      invested: remaining > 0 ? invested : 0,
      purchaseNav: remaining > 0 ? r2(invested / remaining) : 0,
      currentValue: r2(remaining * (Number(fund.currentNav) || n)),
    },
    gain: r2(amt - avg * u),
  }
}
