import { addFund, save, updateNav } from '../actions'
import { uid } from '../db'
import { toISO } from '../calc'

/**
 * Applies the parts of a Kite sync plan the user ticked.
 * selection = { nav: Set<fundId>, newFunds: Set<symbol>, newSips: Set<kiteSipId>, sipUpdates: Set<kiteSipId>, equity: boolean }
 * Returns counts for the confirmation toast. NAVs come from Kite as-is (with Kite's own price date); nothing is estimated.
 */
export async function applyKiteSync(db, plan, selection) {
  const done = { nav: 0, funds: 0, sips: 0, equity: false }
  const today = toISO(new Date())

  for (const u of plan.navUpdates) {
    if (!selection.nav.has(u.fundId)) continue
    await updateNav(db, u.fundId, u.newNav, u.navDate || today, 'kite', { kiteSymbol: u.symbol })
    done.nav += 1
  }
  // keep symbol link on unchanged-but-matched rows so later syncs match reliably
  for (const u of plan.unchanged) await db.funds.update(u.fundId, { kiteSymbol: u.symbol })

  const fundIdBySymbol = new Map()
  for (const f of await db.funds.toArray()) if (f.kiteSymbol) fundIdBySymbol.set(f.kiteSymbol, f.id)

  for (const n of plan.newFunds) {
    if (!selection.newFunds.has(n.symbol)) continue
    const rec = await addFund(db, {
      name: n.name, folio: n.folio || 'N/A', investmentType: 'Imported from Zerodha', investmentDate: today,
      units: n.units, purchaseNav: n.averageNav, currentNav: n.nav, invested: Math.round(n.units * n.averageNav * 100) / 100, currentValue: Math.round(n.units * n.nav * 100) / 100,
      navDate: n.navDate || today, kiteSymbol: n.symbol, datesApproximate: true,
      notes: 'Imported from Zerodha. Investment dates are not provided by Kite, so XIRR is unavailable until you add dated investments from your statement.',
    })
    await db.funds.update(rec.id, { navSource: 'kite' })
    fundIdBySymbol.set(n.symbol, rec.id)
    done.funds += 1
  }

  const toSip = (s, id) => ({ id, kiteSipId: s.kiteSipId, fundId: s.fundId || fundIdBySymbol.get(s.symbol), amount: s.amount, frequency: s.frequency, debitDay: s.debitDay || 1, startDate: s.startDate || today, endDate: null, instalmentsTotal: s.instalmentsTotal, instalmentsCompleted: s.instalmentsCompleted, status: s.status, accountId: null })
  for (const s of plan.newSips) {
    if (!selection.newSips.has(s.kiteSipId)) continue
    const rec = toSip(s, uid('sip'))
    if (!rec.fundId) continue // its fund was not imported
    await save(db, 'sips', rec)
    done.sips += 1
  }
  for (const s of plan.sipUpdates) {
    if (!selection.sipUpdates.has(s.kiteSipId)) continue
    const old = await db.sips.get(s.id)
    await save(db, 'sips', { ...old, status: s.status, instalmentsCompleted: s.instalmentsCompleted, kiteSipId: s.kiteSipId })
    done.sips += 1
  }

  if (plan.equity && selection.equity) {
    // Updates the existing Stocks asset in place (never adds a second one), so stocks are not double counted.
    const existing = plan.equity.assetId ? await db.assets.get(plan.equity.assetId) : null
    await save(db, 'assets', { ...(existing || {}), id: existing?.id || 'as_kite_stocks', category: 'stocks', name: existing?.source === 'kite' || !existing ? 'Equity holdings (Zerodha)' : existing.name, value: plan.equity.value, invested: plan.equity.invested, holdings: plan.equity.count, source: 'kite', updated: today, notes: `Synced from Zerodha Kite: ${plan.equity.count} holdings` })
    done.equity = true
  }
  return done
}
