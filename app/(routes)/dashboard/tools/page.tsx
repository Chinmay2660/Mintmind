'use client'

import { useMemo, useState } from 'react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { availableBalance, toISO } from '@/lib/wealth/calc'
import { emergencyFund, loanPayoff, retirementCorpus, termCover } from '@/lib/calculators'
import { formatINR } from '@/lib/wealth/format'
import { Num, Result, ASSUME, num } from '@/components/tools/kit'
import { LoadingBlock, PageHeader, Select } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { moneyCheckup } from '@/lib/planning'
import { AboutYou } from '@/components/planning/AboutYou'
import { PlanAhead } from '@/components/planning/PlanAhead'
import { CheckUp } from '@/components/planning/CheckUp'
import { useProfileInputs } from '@/components/planning/useProfileInputs'

const TABS = ['Plan ahead', 'Money check-up', 'Emergency fund', 'Loan payoff', 'Insurance cover', 'Retirement'] as const
type Tab = (typeof TABS)[number]

const sum = (rows: any[], k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
const fromData = (n: number) => (n > 0 ? String(Math.round(n)) : '')

export default function PlanningToolsPage() {
  const { ready, data } = useWealth()
  const [tab, setTab] = useState<Tab>('Plan ahead')
  const { v, set, derived } = useProfileInputs(data)
  if (!ready) return <LoadingBlock className="h-72" />
  return (
    <div className="space-y-5">
      <PageHeader title="Planning tools" description="Planners prefilled with your own numbers. Change any value to try a what-if. Nothing here is saved." />
      <div role="tablist" aria-label="Planning tools" className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors', tab === t ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted')}>{t}</button>)}
      </div>
      {(tab === 'Plan ahead' || tab === 'Money check-up') && <AboutYou v={v} set={set} />}
      {tab === 'Plan ahead' && <PlanAhead netWorth={derived.netWorth} monthlySave={Math.max(num(v.takeHome) - num(v.spend), 0)} />}
      {tab === 'Money check-up' && <CheckUp result={moneyCheckup({ takeHome: num(v.takeHome), spend: num(v.spend), essentials: num(v.essentials), liquid: derived.liquid, loans: derived.loans, termCover: derived.termCover, healthCover: derived.healthCover, age: num(v.age), retireAge: num(v.retireAge), monthlyInvest: derived.monthlyInvest, retirementSavings: derived.retirementSavings })} />}
      {tab === 'Emergency fund' && <Emergency data={data} />}
      {tab === 'Loan payoff' && <Payoff data={data} />}
      {tab === 'Insurance cover' && <Cover data={data} />}
      {tab === 'Retirement' && <Retire />}
      <p className="text-xs text-muted-foreground">Educational what-if tools, not investment, tax or insurance advice.</p>
    </div>
  )
}

function Emergency({ data }: { data: any }) {
  const ym = toISO(new Date()).slice(0, 7)
  const liquid = (data.bankAccounts || []).reduce((s: number, a: any) => s + availableBalance(a), 0)
  const [exp, setExp] = useState(fromData(data.budgets?.find((b: any) => b.id === ym)?.total || 0))
  const [sav, setSav] = useState(fromData(liquid))
  const [months, setMonths] = useState('6'); const [save, setSave] = useState('10000')
  const o = useMemo(() => emergencyFund({ monthlyExpense: num(exp), savings: num(sav), targetMonths: num(months), monthlySaving: num(save) }), [exp, sav, months, save])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2">
    <Num label="Monthly spending (₹)" value={exp} set={setExp} hint="Prefilled from this month's budget" /><Num label="Savings you could use (₹)" value={sav} set={setSav} hint="Bank balances above minimum balance" />
    <Num label="Months to cover" value={months} set={setMonths} /><Num label="You can add per month (₹)" value={save} set={setSave} /></div>
    <Result rows={[['Covered today', `${o.coveredMonths.toFixed(1)} months`], ['Target fund', formatINR(o.target)], ['Still to build', formatINR(o.gap)], ['Ready in', o.gap === 0 ? 'Already there' : o.monthsToTarget == null ? '—' : `${o.monthsToTarget} months`]]} note="Keep this in an easy-access account. 3 to 6 months is a common starting point." /></div>
}

function Payoff({ data }: { data: any }) {
  const loans = (data.liabilities || []).filter((l: any) => Number(l.outstanding) > 0 && Number(l.emi) > 0).map((l: any) => ({ balance: Number(l.outstanding), ratePct: Number(l.rate) || 0, emi: Number(l.emi), name: l.name }))
  const [extra, setExtra] = useState('5000'); const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  const base = useMemo(() => loanPayoff({ loans }), [data.liabilities])
  const plan = useMemo(() => loanPayoff({ loans, extraMonthly: num(extra), strategy }), [data.liabilities, extra, strategy])
  const fmtM = (m: number) => `${Math.floor(m / 12)} yr ${m % 12} mo`
  if (!loans.length) return <p className="surface-card p-4 sm:p-5 text-sm text-muted-foreground">Add loans with an EMI under Net Worth to plan their payoff. No loans? Nice.</p>
  return <div className="grid gap-5 md:grid-cols-2"><div className="space-y-4">
    <ul className="divide-y divide-border rounded-xl border border-border text-sm">{loans.map((l: any) => <li key={l.name} className="flex justify-between gap-3 px-3 py-2"><span>{l.name}</span><span className="text-muted-foreground">{formatINR(l.balance)} · {l.ratePct}%</span></li>)}</ul>
    <div className="grid gap-4 sm:grid-cols-2"><Num label="Extra you can pay each month (₹)" value={extra} set={setExtra} />
      <div><label className="mb-1.5 block text-sm font-medium" htmlFor="po-s">Which loan first?</label><Select id="po-s" value={strategy} onChange={(e) => setStrategy(e.target.value as any)}><option value="avalanche">Highest interest first</option><option value="snowball">Smallest balance first</option></Select></div></div></div>
    <Result rows={[['Debt-free in', fmtM(plan.months)], ['Without extra', fmtM(base.months)], ['Interest you pay', formatINR(plan.interest)], ['Interest saved', formatINR(Math.max(base.interest - plan.interest, 0))]]} note="Highest interest first usually costs least. Smallest balance first feels quicker because loans disappear sooner." /></div>
}

function Cover({ data }: { data: any }) {
  const debts = sum(data.liabilities || [], 'outstanding')
  const existing = (data.policies || []).filter((p: any) => p.type === 'term' || p.type === 'life').reduce((s: number, p: any) => s + (Number(p.sumAssured) || 0), 0)
  const [inc, setInc] = useState('1200000'); const [yrs, setYrs] = useState('15'); const [d, setD] = useState(fromData(debts)); const [g, setG] = useState('0'); const [ex, setEx] = useState(fromData(existing)); const [liq, setLiq] = useState('0')
  const o = useMemo(() => termCover({ annualIncome: num(inc), years: num(yrs), debts: num(d), goals: num(g), existingCover: num(ex), liquidAssets: num(liq) }), [inc, yrs, d, g, ex, liq])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2">
    <Num label="Yearly income (₹)" value={inc} set={setInc} /><Num label="Years your family needs it" value={yrs} set={setYrs} /><Num label="Debts to clear (₹)" value={d} set={setD} hint="Prefilled from your loans" /><Num label="Future goals (₹)" value={g} set={setG} hint="Education, marriage…" />
    <Num label="Life cover you have (₹)" value={ex} set={setEx} hint="Prefilled from term policies" /><Num label="Savings to count (₹)" value={liq} set={setLiq} /></div>
    <Result rows={[['Cover your family needs', formatINR(o.need)], ['What you already have', formatINR(o.have)], ['Gap to close', formatINR(o.gap)]]} note="Income replacement plus debts and goals, less what you already have. A planning estimate, not a recommendation." /></div>
}

function Retire() {
  const [e, setE] = useState('50000'); const [a, setA] = useState('32'); const [ra, setRa] = useState('60'); const [i, setI] = useState('6'); const [have, setHave] = useState('0'); const [r, setR] = useState('10')
  const o = useMemo(() => retirementCorpus({ monthlyExpenseToday: num(e), currentAge: num(a), retireAge: num(ra), inflationPct: num(i), withdrawalPct: 4 }), [e, a, ra, i])
  const years = Math.max(o.yearsToRetire, 0); const grown = num(have) * Math.pow(1 + num(r) / 100, years); const gap = Math.max(o.corpus - grown, 0)
  const mr = num(r) / 1200, n = years * 12
  const monthly = gap > 0 && n > 0 ? Math.ceil(mr === 0 ? gap / n : (gap * mr) / ((Math.pow(1 + mr, n) - 1) * (1 + mr))) : 0
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2">
    <Num label="Monthly spending today (₹)" value={e} set={setE} /><Num label="Your age" value={a} set={setA} /><Num label="Retire at" value={ra} set={setRa} /><Num label="Inflation (% a year)" value={i} set={setI} />
    <Num label="Saved for retirement (₹)" value={have} set={setHave} /><Num label="Assumed return (% a year)" value={r} set={setR} /></div>
    <Result rows={[['Corpus needed', formatINR(o.corpus)], ['Your savings grown', formatINR(grown)], ['Gap', formatINR(gap)], ['Monthly saving to close it', gap ? formatINR(monthly) : 'On track']]} note={ASSUME} /></div>
}
