// Zerodha Kite -> wallet sync planning. Pure functions (unit tested); no network, no DB.
// The server returns normalised holdings; this decides what would change so the user can review it first.

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const tokens = (s) => new Set(String(s || '').toLowerCase().replace(/direct|growth|plan|option|fund|[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 1))
function overlap(a, b) {
  const A = tokens(a), B = tokens(b)
  if (!A.size || !B.size) return 0
  let n = 0
  for (const t of A) if (B.has(t)) n++
  return n / Math.min(A.size, B.size)
}

/** Match a Kite MF holding to one of the user's funds: stored symbol > folio + similar name > unique folio > same name. */
export function matchFund(funds, h, kiteHoldings = []) {
  const bySymbol = funds.find((f) => f.kiteSymbol && f.kiteSymbol === h.symbol)
  if (bySymbol) return bySymbol
  const folio = norm(h.folio)
  if (folio) {
    const sameFolio = funds.filter((f) => norm(f.folio) === folio)
    const named = sameFolio.find((f) => overlap(f.name, h.name) >= 0.5)
    if (named) return named
    const folioUnique = kiteHoldings.filter((x) => norm(x.folio) === folio).length === 1
    if (sameFolio.length === 1 && folioUnique) return sameFolio[0]
  }
  return funds.find((f) => norm(f.name) === norm(h.name)) || null
}

export function planKiteSync({ funds = [], sips = [], assets = [] }, payload) {
  const plan = { navUpdates: [], unchanged: [], newFunds: [], newSips: [], sipUpdates: [], equity: null, errors: payload.errors || {} }
  const holdings = payload.mutualFunds || []
  const matched = new Map() // kite symbol -> fund

  for (const h of holdings) {
    if (!(h.nav > 0)) continue
    const f = matchFund(funds, h, holdings)
    if (!f) {
      plan.newFunds.push({ symbol: h.symbol, folio: h.folio, name: h.name, units: h.units, averageNav: h.averageNav, nav: h.nav, navDate: h.navDate })
      continue
    }
    matched.set(h.symbol, f)
    const row = {
      fundId: f.id, name: f.name, symbol: h.symbol, oldNav: f.currentNav, newNav: h.nav, navDate: h.navDate,
      unitsMismatch: Math.abs((f.units || 0) - h.units) > 0.001 ? { mine: f.units, kite: h.units } : null,
      newValue: Math.round((f.units || 0) * h.nav * 100) / 100,
    }
    if (f.currentNav === h.nav && f.navDate === h.navDate && f.kiteSymbol === h.symbol) plan.unchanged.push(row)
    else plan.navUpdates.push(row)
  }

  for (const s of payload.sips || []) {
    const fund = matched.get(s.symbol) || funds.find((f) => f.kiteSymbol === s.symbol)
    const existing = sips.find((x) => x.kiteSipId === s.id) || (fund && sips.find((x) => x.fundId === fund.id && Number(x.amount) === s.amount && x.frequency === s.frequency))
    const item = { kiteSipId: s.id, fundId: fund?.id || null, fundName: fund?.name || s.name, symbol: s.symbol, amount: s.amount, frequency: s.frequency, debitDay: s.day, status: s.status === 'active' ? 'active' : s.status === 'paused' ? 'paused' : 'stopped', instalmentsTotal: s.instalments > 0 ? s.instalments : 0, instalmentsCompleted: s.completed, startDate: s.created }
    if (existing) {
      const changed = existing.status !== item.status || existing.instalmentsCompleted !== item.instalmentsCompleted || existing.kiteSipId !== s.id
      if (changed) plan.sipUpdates.push({ ...item, id: existing.id })
    } else plan.newSips.push(item)
  }

  if (payload.equity) {
    const target = assets.find((a) => a.source === 'kite') || assets.find((a) => a.category === 'stocks')
    plan.equity = { value: payload.equity.value, invested: payload.equity.invested, count: payload.equity.count, dayChange: payload.equity.dayChange, assetId: target?.id || null, previousValue: target?.value ?? null, replacesManual: !!target && target.source !== 'kite' }
  }
  return plan
}
