// Small deterministic dataset used by the AI unit tests (today = 10 Jun 2026).
import { computeNetWorth } from '../wealth/calc.js'

export const TODAY = new Date(2026, 5, 10)

export function sampleData() {
  const bankAccounts = [{ id: 'b1', bankName: 'HDFC', nickname: 'Primary', type: 'savings', currentBalance: 400000, mab: 10000 }, { id: 'cash', bankName: 'Cash', type: 'cash', currentBalance: 10000 }]
  const funds = [
    { id: 'f1', name: 'Alpha Flexi Cap Fund', folio: '1', units: 1000, invested: 400000, currentValue: 560000, currentNav: 560, prevNav: 555, investmentDate: '2024-01-01', navDate: '2026-06-09', navSource: 'manual' },
    { id: 'f2', name: 'Beta Index Fund', folio: '2', units: 500, invested: 300000, currentValue: 290000, currentNav: 580, investmentDate: '2024-06-01', navDate: '2026-06-09', navSource: 'manual' },
  ]
  const fundTxns = [
    { id: 't1', fundId: 'f1', date: '2024-01-01', type: 'lumpsum', amount: 400000 },
    { id: 't2', fundId: 'f2', date: '2024-06-01', type: 'lumpsum', amount: 300000 },
    { id: 't3', fundId: 'f1', date: '2026-06-05', type: 'sip', amount: 10000 },
    { id: 't4', fundId: 'f1', date: '2026-05-05', type: 'sip', amount: 5000 },
  ]
  const sips = [{ id: 's1', fundId: 'f1', amount: 10000, frequency: 'monthly', status: 'active', startDate: '2024-01-05', debitDay: 5, instalmentsTotal: 0, instalmentsCompleted: 12 }]
  const cards = [
    { id: 'c1', bank: 'HDFC', cardName: 'Regalia', limit: 100000, outstanding: 75000, dueDay: 13, statementDay: 20 },
    { id: 'c2', bank: 'ICICI', cardName: 'Amazon', limit: 100000, outstanding: 5000, dueDay: 25, statementDay: 5 },
  ]
  const policies = [
    { id: 'p1', company: 'Star', policyName: 'Health', type: 'health', sumAssured: 1000000, premium: 24000, frequency: 'yearly', nextPremium: '2026-06-17', endDate: '2027-06-17', members: ['Arjun', 'Priya'] },
    { id: 'p2', company: 'HDFC', policyName: 'Term', type: 'term', sumAssured: 15000000, premium: 18000, frequency: 'yearly', nextPremium: '2026-12-01', endDate: '2046-12-01', members: ['Arjun'] },
    { id: 'p3', company: 'ICICI', policyName: 'Motor', type: 'motor', sumAssured: 600000, premium: 12000, frequency: 'yearly', nextPremium: '2026-07-01', endDate: '2026-07-01', members: [] },
  ]
  const expenses = [
    { id: 'e1', date: '2026-06-02', amount: 9000, category: 'Food', mode: 'upi', accountId: 'b1' },
    { id: 'e2', date: '2026-06-05', amount: 5000, category: 'Shopping', mode: 'card', cardId: 'c1' },
    { id: 'e3', date: '2026-05-10', amount: 6000, category: 'Food', mode: 'upi', accountId: 'b1' },
    { id: 'e4', date: '2026-05-20', amount: 8000, category: 'Shopping', mode: 'upi', accountId: 'b1' },
    { id: 'e5', date: '2026-04-10', amount: 6500, category: 'Food', mode: 'upi', accountId: 'b1' },
  ]
  const bankTxns = [{ id: 'i1', date: '2026-05-01', type: 'income', category: 'Salary', amount: 100000, accountId: 'b1' }, { id: 'i2', date: '2026-06-01', type: 'income', category: 'Salary', amount: 100000, accountId: 'b1' }]
  const budgets = [{ id: '2026-06', total: 30000, categories: { Food: 8000, Shopping: 10000 } }, { id: '2026-05', total: 30000, categories: {} }]
  const assets = [{ id: 'a1', category: 'realEstate', value: 4500000, updated: '2026-05-01' }]
  const liabilities = [{ id: 'l1', category: 'homeLoan', outstanding: 1800000 }]
  const netWorth = computeNetWorth({ banks: bankAccounts, funds, assets, cards, liabilities })
  const snapshots = [
    { id: '2025-06', date: '2025-06-10', netWorth: 4200000, assets: 6000000, liabilities: 1800000, assetBreakdown: { bank: 300000, mutualFunds: 600000, realEstate: 4500000 } },
    { id: '2026-05', date: '2026-05-10', netWorth: 5000000, assets: 6900000, liabilities: 1900000, assetBreakdown: { bank: 380000, mutualFunds: 800000, realEstate: 4500000 } },
  ]
  return { bankAccounts, funds, fundTxns, sips, cards, policies, expenses, bankTxns, transfers: [], budgets, assets, liabilities, snapshots, members: [], documents: [], meta: [], netWorth }
}
