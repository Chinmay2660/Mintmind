// My Wealth AI: question answering over the deterministic facts. Works with no AI provider (and in Demo Mode).
// An optional AI provider may rephrase an answer, but the figures here are the source of truth.
// Every answer names its data period; unknown or missing data is stated plainly, never guessed.
import { formatINR, formatPct, formatDate } from '../wealth/format.js'
import { addMonths } from '../wealth/calc.js'
import { monthLabel } from '../wealth/selectors.js'
import { labelOf } from './insights.js'

const inr = (n) => formatINR(n)
const has = (q, ...words) => words.some((w) => (w instanceof RegExp ? w.test(q) : q.includes(w)))

export const SUGGESTED_QUESTIONS = [
  'What is my current net worth?', 'Am I overspending this month?', 'How much can I spend today?', 'Which credit card payment is due next?',
  'Show my fund-wise performance', 'Which insurance premiums are due soon?', 'What is our consolidated family net worth?', 'How much did I save last month?',
]

const ans = (text, f, extra = {}) => ({ text, period: extra.period || `as of ${f.asOf}`, modules: extra.modules || [], links: extra.links || [], unavailable: !!extra.unavailable, rows: extra.rows || null, ...extra })
const noData = (what, f, links) => ans(`I don't have ${what}, so I can't answer that from your data.`, f, { unavailable: true, links })

export function answerQuestion(question, f, data = {}) {
  const q = String(question || '').toLowerCase().replace(/[?!.]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return ans('Ask me about your net worth, budget, mutual funds, cards, insurance or family finances.', f)

  // ---------- explain a concept ----------
  if (has(q, 'xirr') && has(q, 'explain', 'what is', 'meaning', 'mean')) {
    return ans('XIRR is your annualised return that takes into account when each rupee went in. A lump sum made years ago and a SIP instalment made last month are weighted by how long they were invested. It is different from simple "absolute return", which ignores timing, and from CAGR, which assumes a single investment. It describes past performance and does not predict future returns.', f, { modules: ['Mutual Funds'], period: 'concept', links: [{ label: 'Mutual Funds', href: '/dashboard/mutual-funds' }] })
  }

  // ---------- net worth ----------
  if (has(q, 'net worth') && !has(q, 'family', 'our ')) {
    const n = f.netWorth
    if (has(q, 'grown', 'growth', 'this year', 'increase', 'change')) {
      if (has(q, 'contribut', 'most', 'why', 'due to') && n.contributors.length) {
        const top = n.contributors.slice(0, 3).map((c) => `${labelOf(c.key)} (${c.diff >= 0 ? '+' : '-'}${inr(Math.abs(c.diff))})`).join(', ')
        return ans(`Compared with ${formatDate(n.vsLastMonth.baseDate)}, the biggest movements in your assets were: ${top}.`, f, { modules: ['Net Worth'], period: `since ${formatDate(n.vsLastMonth.baseDate)}`, links: [{ label: 'Net Worth', href: '/dashboard/net-worth' }] })
      }
      if (has(q, 'this year') || has(q, 'year to date')) {
        if (!n.yearToDate) return noData(`a net worth snapshot from the end of last year`, f)
        return ans(`Since ${formatDate(n.yearToDate.baseDate)} your net worth has ${n.yearToDate.diff >= 0 ? 'grown' : 'fallen'} by ${inr(Math.abs(n.yearToDate.diff))}${n.yearToDate.pct != null ? ` (${formatPct(n.yearToDate.pct, 1)})` : ''}, from ${inr(n.current - n.yearToDate.diff)} to ${inr(n.current)}.`, f, { modules: ['Net Worth'], period: `since ${formatDate(n.yearToDate.baseDate)}` })
      }
      if (!n.vsLastMonth) return noData('enough net worth history to compare', f)
      return ans(`Your net worth is ${inr(n.current)}. Since ${formatDate(n.vsLastMonth.baseDate)} it has ${n.vsLastMonth.diff >= 0 ? 'increased' : 'decreased'} by ${inr(Math.abs(n.vsLastMonth.diff))}${n.vsLastMonth.pct != null ? ` (${formatPct(n.vsLastMonth.pct, 1)})` : ''}.${n.vsLastYear ? ` Over 12 months it changed by ${formatPct(n.vsLastYear.pct, 1)}.` : ''}`, f, { modules: ['Net Worth'], period: `since ${formatDate(n.vsLastMonth.baseDate)}`, links: [{ label: 'Net Worth', href: '/dashboard/net-worth' }] })
    }
    if (has(q, 'invested')) return ans(`${inr(n.investedValue)} of your ${inr(n.assets)} assets (${n.investedSharePct}%) is in investments: mutual funds, stocks, EPF, PPF, fixed deposits and gold. The rest is bank balances, real estate and other assets.`, f, { modules: ['Net Worth'] })
    return ans(`Your net worth is ${inr(n.current)}: assets of ${inr(n.assets)} minus liabilities of ${inr(n.liabilities)}.`, f, { modules: ['Net Worth'], links: [{ label: 'Net Worth', href: '/dashboard/net-worth' }], headline: { label: 'Net worth', value: inr(n.current), tone: 'neutral' }, lead: n.vsLastMonth ? `${n.vsLastMonth.diff >= 0 ? 'Up' : 'Down'} ${inr(Math.abs(n.vsLastMonth.diff))} since ${formatDate(n.vsLastMonth.baseDate)}.` : 'Assets minus liabilities.', stats: [['Assets', inr(n.assets)], ['Liabilities', inr(n.liabilities)], ['Invested', `${Math.round(n.investedSharePct)}% of assets`]], followups: ['What contributed most to my net worth growth?', 'How much do I owe?', 'How much of my wealth is invested?'] })
  }
  if (has(q, 'how much do i owe', 'what do i owe', 'my liabilities', 'total liabilities', 'my debt', 'how much debt')) {
    const parts = Object.entries(f.netWorth.liabilityBreakdown).filter(([, v]) => v > 0).map(([k, v]) => `${labelOf(k) === k ? k : k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${inr(v)}`).join(', ')
    return ans(`You owe ${inr(f.netWorth.liabilities)} in total${parts ? ` (${parts})` : ''}. That is ${f.netWorth.debtToAssetPct}% of your assets.`, f, { modules: ['Net Worth', 'Cards'] })
  }
  if (has(q, 'how much of my wealth', 'wealth is invested', 'how much is invested')) return answerQuestion('what is my net worth invested', f, data)

  // ---------- family ----------
  if (has(q, 'family', 'our net worth', 'combined') && !has(q, 'insurance', 'policy', 'policies', 'covered', 'cover')) {
    if (!f.family) return noData('family data (no members have shared their net worth with you)', f, [{ label: 'Family Circle', href: '/dashboard/family' }])
    const fam = f.family
    if (has(q, 'highest', 'who has', 'most')) return ans(fam.highest ? `${fam.highest.name} has the highest net worth among members who share it: ${inr(fam.highest.netWorth)}.` : 'No member has shared a net worth I can compare.', f, { modules: ['Family Circle'], unavailable: !fam.highest })
    if (has(q, 'changed', 'change', 'growth', 'grown')) return noData('a family net worth history (only current shared figures are available)', f, [{ label: 'Family Circle', href: '/dashboard/family' }])
    const lines = fam.members.map((m) => `${m.name}: ${m.netWorth == null ? 'not shared' : inr(m.netWorth)}`).join('; ')
    return ans(`Combined net worth of members who share it is ${inr(fam.total)}. ${lines}.${fam.hidden ? ` ${fam.hidden} member(s) have not shared theirs, so they are excluded.` : ''}`, f, { modules: ['Family Circle'], links: [{ label: 'Family Circle', href: '/dashboard/family' }], rows: fam.members.map((m) => [m.name, m.netWorth == null ? 'Not shared' : inr(m.netWorth)]) })
  }

  // ---------- budget & spending ----------
  const b = f.budget
  if (has(q, 'overspend', 'over budget', 'over my budget', 'within budget', 'on track')) {
    if (!b) return noData(`a budget for ${f.monthLabel}`, f, [{ label: 'Set a budget', href: '/dashboard/budget' }])
    return ans(b.status === 'over' ? `Yes, you are spending faster than planned. After ${b.dayToday} of ${b.days} days you have spent ${inr(b.spent)} against an expected ${inr(b.expectedTillToday)}, which is ${inr(b.variance)} ahead of pace (${b.utilisationPct}% of the budget used, ${b.monthPassedPct}% of the month passed).` : `No. You have spent ${inr(b.spent)} against an expected ${inr(b.expectedTillToday)} by day ${b.dayToday}, which is ${inr(Math.abs(b.variance))} under your planned pace.`, f, { modules: ['Budget'], period: `${b.label}, day ${b.dayToday}`, links: [{ label: 'Budget & Expenses', href: '/dashboard/budget' }], headline: { label: b.status === 'over' ? 'Ahead of pace by' : 'Under pace by', value: inr(Math.abs(b.variance)), tone: b.status === 'over' ? 'bad' : 'good' }, lead: b.status === 'over' ? 'Yes, you are spending faster than planned.' : 'No, you are within your planned pace.', stats: [['Spent', inr(b.spent)], ['Expected by today', inr(b.expectedTillToday)], ['Budget used', `${b.utilisationPct}%`]], bar: { value: b.utilisationPct, marker: b.monthPassedPct, label: `${b.utilisationPct}% of budget used · ${b.monthPassedPct}% of the month gone` }, followups: ['How much can I spend today?', 'How much will I spend by the end of this month?', 'Which category is consuming most of my budget?'] })
  }
  if ((has(q, 'spend', 'budget', 'allowance') && has(q, 'today'))  || has(q, 'can i spend', 'daily allowance')) {
    if (!b) return noData(`a budget for ${f.monthLabel}`, f, [{ label: 'Set a budget', href: '/dashboard/budget' }])
    return ans(`Staying on your planned pace, you can spend about ${inr(b.allowanceToday)} today. (Your planned daily budget is ${inr(b.dailyBudget)}; you have ${inr(b.remaining)} left for the month, which is ${inr(b.safeDailySpend)} a day if spread over the ${b.remainingDays} remaining days. These are different measures.)`, f, { modules: ['Budget'], period: `${b.label}, day ${b.dayToday}`, headline: { label: 'You can spend today', value: inr(b.allowanceToday), tone: b.allowanceToday > 0 ? 'good' : 'bad' }, lead: b.allowanceToday > 0 ? 'That keeps you on your planned pace.' : 'You are already ahead of pace, so any spend today moves you further over.', stats: [['Planned per day', inr(b.dailyBudget)], ['Left this month', inr(b.remaining)], ['Left per day', `${inr(b.safeDailySpend)} × ${b.remainingDays} days`]], detail: 'Three different numbers: today\u2019s allowance follows your planned pace so far. Planned per day is your budget divided by the days in the month. Left per day spreads what remains over the remaining days.', followups: ['Am I overspending this month?', 'How much will I spend by the end of this month?'] })
  }
  if (has(q, 'which category', 'most of my budget', 'consuming', 'biggest expense', 'top categor')) {
    const c = f.money.topExpenseCategories[0]
    if (!c) return noData(`any expenses recorded for ${f.monthLabel}`, f)
    return ans(`${c.name} is your largest expense category this month at ${inr(c.value)} (${c.pct}% of spending).`, f, { modules: ['Budget'], period: f.monthLabel, rows: f.money.topExpenseCategories.map((x) => [x.name, `${inr(x.value)} (${x.pct}%)`]) })
  }
  if (has(q, 'end of this month', 'month end', 'by the end', 'forecast', 'will i spend', 'projected')) {
    if (!b) return noData(`a budget for ${f.monthLabel}`, f)
    return ans(`Estimate: at your current pace you may spend about ${inr(b.projected)} by the end of ${b.label}${b.projectedOver > 0 ? `, ${inr(b.projectedOver)} over your ${inr(b.total)} budget` : `, within your ${inr(b.total)} budget`}. This is a projection from spending so far, not a certainty.`, f, { modules: ['Budget'], period: `${b.label}, day ${b.dayToday}`, kind: 'estimate' })
  }
  if (has(q, 'save last month', 'saved last month', 'savings last month', 'did i save')) {
    const l = f.money.lastMonth
    if (!l) return noData('income and expense data for last month', f)
    return ans(`In ${l.label} you received ${inr(l.income)} and spent ${inr(l.expense)}, so you saved ${inr(l.saved)}${l.savingsRatePct != null ? ` (${l.savingsRatePct}% of income)` : ''}. Transfers and card repayments are not counted.`, f, { modules: ['Budget'], period: l.label, headline: { label: `Saved in ${l.label}`, value: inr(l.saved), tone: l.saved >= 0 ? 'good' : 'bad' }, lead: l.savingsRatePct != null ? `That is ${l.savingsRatePct}% of your income.` : '', stats: [['Income', inr(l.income)], ['Spent', inr(l.expense)]], detail: 'Transfers between your own accounts and card repayments are not counted as spending.', followups: ['Am I overspending this month?'] })
  }
  const spendMatch = q.match(/(?:spend|spent|expenses?)\s+(?:on|for)\s+([a-z &]+?)(?:\s+(?:this|last|in)\b.*)?$/)
  if (spendMatch && data.expenses) {
    const word = spendMatch[1].trim()
    const cat = [...new Set(data.expenses.map((e) => e.category))].find((c) => c.toLowerCase().includes(word) || word.includes(c.toLowerCase()))
    if (!cat) return noData(`a category matching "${word}"`, f)
    const last = has(q, 'last month')
    const ym = last ? addMonths(`${f.ym}-01`, -1).slice(0, 7) : f.ym
    const total = data.expenses.filter((e) => e.category === cat && String(e.date).slice(0, 7) === ym).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return ans(`You spent ${inr(total)} on ${cat} in ${monthLabel(ym)}.`, f, { modules: ['Budget'], period: monthLabel(ym), links: [{ label: 'Transactions', href: '/dashboard/budget' }] })
  }

  // ---------- mutual funds ----------
  const mf = f.funds
  if (has(q, 'mutual fund', 'portfolio', 'fund', 'sip', 'xirr')) {
    if (!mf.summary.fundCount) return noData('any mutual funds added', f, [{ label: 'Add a fund', href: '/dashboard/mutual-funds' }])
    const s = mf.summary
    if (has(q, 'why', 'changed', 'explain')) {
      if (!mf.monthChange) return noData('a net worth snapshot to compare your portfolio with last month', f)
      const m = mf.monthChange
      return ans(`Since ${formatDate(m.baseDate)} your portfolio value changed by ${m.valueChange >= 0 ? '+' : '-'}${inr(Math.abs(m.valueChange))}. Of that, ${inr(m.contributions)} was new money you invested this month, and the remaining ${m.marketMovement >= 0 ? '+' : '-'}${inr(Math.abs(m.marketMovement))} came from changes in NAV (market movement). Fund-level NAV changes use the NAVs you entered or synced.`, f, { modules: ['Mutual Funds'], period: `since ${formatDate(m.baseDate)}` })
    }
    if (has(q, 'highest', 'best', 'top return')) return mf.best ? ans(`${mf.best.name} has the highest absolute return: ${formatPct(mf.best.absReturnPct)} (${inr(mf.best.absReturn)} gain on ${inr(mf.best.invested)}${mf.best.xirrPct != null ? `, XIRR ${formatPct(mf.best.xirrPct, 1)}` : ''}). This is past performance.`, f, { modules: ['Mutual Funds'] }) : noData('fund returns', f)
    if (has(q, 'fund-wise', 'fund wise', 'each fund', 'performance', 'show my fund')) return ans(`Fund-wise performance (past, based on the NAVs you entered or synced):`, f, { modules: ['Mutual Funds'], rows: mf.perFund.map((x) => [x.name, `${inr(x.value)} · ${formatPct(x.absReturnPct)}${x.xirrPct != null ? ` · XIRR ${formatPct(x.xirrPct, 1)}` : ''}`]), links: [{ label: 'Mutual Funds', href: '/dashboard/mutual-funds' }] })
    if (has(q, 'xirr')) return ans(s.xirrPct != null ? `Your overall portfolio XIRR is ${formatPct(s.xirrPct, 1)} a year, calculated from the dates of every investment and today's value.` : 'I cannot calculate XIRR yet because the investment dates are missing or the cashflows are not enough.', f, { modules: ['Mutual Funds'], unavailable: s.xirrPct == null })
    if (has(q, 'sip')) return ans(`You have ${s.activeSips} active SIP${s.activeSips === 1 ? '' : 's'} with a monthly commitment of ${inr(s.monthlySipCommitment)}.`, f, { modules: ['Mutual Funds'] })
    if (has(q, 'invest') && !has(q, 'value')) return ans(`You have invested ${inr(s.invested)} in mutual funds. They are worth ${inr(s.value)} now, an absolute ${s.absReturn >= 0 ? 'gain' : 'loss'} of ${inr(Math.abs(s.absReturn))} (${formatPct(s.absReturnPct)}).`, f, { modules: ['Mutual Funds'] })
    return ans(`Your mutual fund portfolio is worth ${inr(s.value)} on ${inr(s.invested)} invested: ${s.absReturn >= 0 ? '+' : '-'}${inr(Math.abs(s.absReturn))} (${formatPct(s.absReturnPct)})${s.xirrPct != null ? `, XIRR ${formatPct(s.xirrPct, 1)}` : ''}. Your largest holding is ${mf.largest.name} (${mf.largest.sharePct}%). Fund category data is not recorded, so I cannot show category allocation.`, f, { modules: ['Mutual Funds'], links: [{ label: 'Mutual Funds', href: '/dashboard/mutual-funds' }], headline: { label: 'Portfolio value', value: inr(s.value), tone: 'neutral' }, lead: `${s.absReturn >= 0 ? 'Gain' : 'Loss'} of ${inr(Math.abs(s.absReturn))} (${formatPct(s.absReturnPct)}) on what you invested. Past performance only.`, stats: [['Invested', inr(s.invested)], ['XIRR', s.xirrPct != null ? formatPct(s.xirrPct, 1) : 'n/a'], ['Largest holding', `${mf.largest.sharePct}%`]], detail: `Largest holding: ${mf.largest.name}. Fund category is not recorded, so category allocation is not shown.`, followups: ['Show my fund-wise performance', 'Explain why my portfolio value changed this month', 'Explain XIRR'] })
  }

  // ---------- cards ----------
  const c = f.cards
  if (has(q, 'credit card', 'card', 'outstanding', 'utilis', 'utiliz')) {
    if (!c.perCard.length) return noData('any credit cards added', f)
    if (has(q, 'due', 'next')) return c.nextDue ? ans(`Next: ${c.nextDue.title}, ${inr(c.nextDue.amount)} due on ${formatDate(c.nextDue.date)} (${c.nextDue.daysLeft === 0 ? 'today' : `in ${c.nextDue.daysLeft} days`}).`, f, { modules: ['Cards'], links: [{ label: 'Cards', href: '/dashboard/credit-cards' }], headline: { label: c.nextDue.title, value: inr(c.nextDue.amount), tone: c.nextDue.daysLeft <= 3 ? 'bad' : 'neutral' }, lead: `Due ${c.nextDue.daysLeft === 0 ? 'today' : `in ${c.nextDue.daysLeft} days`} on ${formatDate(c.nextDue.date)}.`, stats: [['Total outstanding', inr(c.outstanding)], ['Utilisation', `${c.utilisationPct}%`]], followups: ['Which card has the highest utilisation?', 'How much did I spend on credit cards this month?'] }) : ans('None of your cards has an outstanding balance, so no payment is due.', f, { modules: ['Cards'] })
    if (has(q, 'highest', 'most', 'which card')) { const t = c.perCard[0]; return ans(`${t.name} has the highest utilisation at ${t.utilisationPct}% (${inr(t.outstanding)} of ${inr(t.limit)}).`, f, { modules: ['Cards'] }) }
    if (has(q, 'spend', 'spent')) return ans(`You spent ${inr(c.monthSpend)} on credit cards in ${f.monthLabel}.`, f, { modules: ['Cards'], period: f.monthLabel })
    return ans(`Your total credit card outstanding is ${inr(c.outstanding)} against a combined limit of ${inr(c.limit)}: ${c.utilisationPct}% utilisation.`, f, { modules: ['Cards'], rows: c.perCard.map((x) => [x.name, `${inr(x.outstanding)} (${x.utilisationPct}%)`]) })
  }

  // ---------- insurance ----------
  const ins = f.insurance
  if (has(q, 'insurance', 'policy', 'policies', 'premium', 'coverage', 'cover', 'expir')) {
    if (!data.policies?.length && !ins.policies.length) return noData('any insurance policies added', f)
    if (has(q, 'family', 'covered', 'who')) return ans(ins.coveredMembers.length ? `Family members covered by your policies: ${ins.coveredMembers.join(', ')}.` : 'No family members are mapped to your policies yet.', f, { modules: ['Insurance'], unavailable: !ins.coveredMembers.length })
    if (has(q, 'expir')) return ans(ins.expiring.length ? ins.expiring.map((e) => `${e.title} on ${formatDate(e.date)} (${e.daysLeft} days)`).join('; ') + '.' : 'None of your policies expires in the next 45 days.', f, { modules: ['Insurance'] })
    if (has(q, 'due', 'soon', 'premium')) return ans(ins.upcomingPremiums.length ? `Upcoming premiums: ${ins.upcomingPremiums.map((p) => `${p.title} ${inr(p.amount)} on ${formatDate(p.date)} (${p.daysLeft < 0 ? 'overdue' : `${p.daysLeft} days`})`).join('; ')}.` : 'No premiums are due in the next 60 days.', f, { modules: ['Insurance'], links: [{ label: 'Insurance', href: '/dashboard/insurance' }] })
    if (has(q, 'health')) return ans(`Your active health insurance cover totals ${inr(ins.healthCover)}.`, f, { modules: ['Insurance'] })
    if (has(q, 'show', 'all', 'list')) return ans(`You have ${ins.policies.length} policies:`, f, { modules: ['Insurance'], rows: ins.policies.map((p) => [p.name, `${p.type} · cover ${inr(p.sumAssured)} · premium ${inr(p.premium)} ${p.frequency}`]), links: [{ label: 'Insurance', href: '/dashboard/insurance' }] })
    return ans(`Your total active cover is ${inr(ins.coverTotal)} across ${ins.activeCount} policies, with annual premiums of about ${inr(ins.annualPremium)}. Insurance cover is protection and is not counted in your net worth.`, f, { modules: ['Insurance'] })
  }

  // ---------- banks ----------
  if (has(q, 'bank', 'cash', 'balance', 'savings account')) return ans(`Your bank and cash balances total ${inr(f.banks.total)}: ${f.banks.accounts.map((a) => `${a.name} ${inr(a.balance)}`).join(', ')}.`, f, { modules: ['Bank Accounts'], links: [{ label: 'Bank Accounts', href: '/dashboard/bank-accounts' }], headline: { label: 'Bank & cash', value: inr(f.banks.total), tone: 'neutral' }, lead: `Across ${f.banks.accounts.length} accounts.`, rows: f.banks.accounts.map((a) => [a.name, inr(a.balance)]) })

  // ---------- documents / search fallback ----------
  const hits = searchRecords(q, data)
  if (hits.length) return ans(`Here is what I found for "${question}":`, f, { modules: [...new Set(hits.map((h) => h.module))], rows: hits.slice(0, 8).map((h) => [h.title, h.detail]), links: hits.slice(0, 3).map((h) => ({ label: h.module, href: h.href })), period: 'records search' })

  return ans("I can't answer that from the information in your account. I can help with net worth, budget and spending, mutual funds, cards, insurance, bank balances and family summaries. Try one of the suggested questions.", f, { unavailable: true })
}

/** Keyword search over the user's own records. Account/card numbers are masked; the Vault is never searched. */
export function searchRecords(q, data) {
  const words = String(q).toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !['the', 'show', 'find', 'all', 'my', 'for', 'and', 'related', 'latest', 'are', 'how'].includes(w))
  if (!words.length) return []
  const out = []
  const match = (...texts) => { const t = texts.join(' ').toLowerCase(); return words.every((w) => t.includes(w)) }
  const mask = (n) => (n ? `••••${String(n).slice(-4)}` : '')
  for (const d of data.documents || []) if (match(d.name, d.category, d.notes || '', d.fileName || '')) out.push({ module: 'Documents', title: d.name, detail: `${d.category} · ${d.uploaded ? formatDate(String(d.uploaded).slice(0, 10)) : ''}`, href: '/dashboard/documents' })
  for (const p of data.policies || []) if (match(p.company, p.policyName, p.type, p.holder || '')) out.push({ module: 'Insurance', title: `${p.company} ${p.policyName}`, detail: `${p.type} · cover ${inr(p.sumAssured)}`, href: '/dashboard/insurance' })
  for (const f of data.funds || []) if (match(f.name)) out.push({ module: 'Mutual Funds', title: f.name, detail: `value ${inr(f.currentValue)}`, href: `/dashboard/mutual-funds/${f.id}` })
  for (const c of data.cards || []) if (match(c.bank, c.cardName, 'card')) out.push({ module: 'Cards', title: `${c.bank} ${c.cardName}`, detail: `${mask(c.cardNumber)} · outstanding ${inr(c.outstanding)}`, href: '/dashboard/credit-cards' })
  for (const a of data.bankAccounts || []) if (match(a.bankName, a.nickname || '', 'account')) out.push({ module: 'Bank Accounts', title: a.nickname || a.bankName, detail: `${a.accountNumber ? mask(a.accountNumber) + ' · ' : ''}${inr(a.currentBalance)}`, href: `/dashboard/bank-accounts/${a.id}` })
  for (const m of data.members || []) if (match(m.name, m.relation || '')) out.push({ module: 'Family Circle', title: m.name, detail: m.relation || m.role, href: '/dashboard/family' })
  return out
}
