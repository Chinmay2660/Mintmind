// What a NAV refresh is allowed to change. Everything the user entered (units, invested amount, folio, SIP, history) is
// deliberately absent, so a price update can never touch it.
export function navPatch(fund, nav, date, source = 'manual', extra = {}, today = '') {
  const n = Number(nav)
  const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100
  return { prevNav: fund.currentNav, currentNav: n, currentValue: round2(fund.units * n), navDate: date || today, navSource: source, ...extra }
}
