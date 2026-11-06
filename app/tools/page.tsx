'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Coins, Flag, Home, Landmark, Percent, PieChart, Scale, Sunset, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { budgetRule, cagr, lumpsumFuture, emi, goalSip, prepayment, rentVsBuy, retirementCorpus, sipFutureValue } from '@/lib/calculators'
import { formatINR } from '@/lib/wealth/format'
import { Num, Result, ASSUME, num } from '@/components/tools/kit'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { FieldSet } from '@/components/ui/layout'

const TOOLS = ['Net worth', 'SIP', 'Lumpsum', 'Goal SIP', 'Growth rate', 'Loan & prepayment', 'Retirement', 'Rent vs buy', 'Budget split'] as const
type Tool = (typeof TOOLS)[number]


function Sip() {
  const [m, setM] = useState('10000'); const [r, setR] = useState('12'); const [y, setY] = useState('10'); const [s, setS] = useState('0')
  const o = useMemo(() => sipFutureValue({ monthly: num(m), annualReturnPct: num(r), years: num(y), stepUpPct: num(s) }), [m, r, y, s])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Monthly SIP (₹)" value={m} set={setM} /><Num label="Assumed return (% a year)" value={r} set={setR} /><Num label="Years" value={y} set={setY} /><Num label="Yearly step-up (%)" value={s} set={setS} /></div>
    <Result rows={[['You invest', formatINR(o.invested)], ['Estimated value', formatINR(o.futureValue)], ['Estimated gain', formatINR(o.gain)]]} note={ASSUME} /></div>
}
function GoalSip() {
  const [t, setT] = useState('2500000'); const [r, setR] = useState('12'); const [y, setY] = useState('10'); const [e, setE] = useState('0')
  const need = useMemo(() => goalSip({ target: num(t), annualReturnPct: num(r), years: num(y), existing: num(e) }), [t, r, y, e])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Goal amount (₹)" value={t} set={setT} /><Num label="Assumed return (% a year)" value={r} set={setR} /><Num label="Years to goal" value={y} set={setY} /><Num label="Already saved (₹)" value={e} set={setE} /></div>
    <Result rows={[['Monthly SIP needed', need ? formatINR(need) : 'Already on track']]} note={ASSUME} /></div>
}
function Loan() {
  const [p, setP] = useState('5000000'); const [r, setR] = useState('9'); const [y, setY] = useState('20'); const [x, setX] = useState('5000'); const [l, setL] = useState('0')
  const o = useMemo(() => prepayment({ principal: num(p), annualRatePct: num(r), years: num(y), extraMonthly: num(x), lumpsum: num(l) }), [p, r, y, x, l])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Loan amount (₹)" value={p} set={setP} /><Num label="Interest rate (%)" value={r} set={setR} /><Num label="Tenure (years)" value={y} set={setY} /><Num label="Extra every month (₹)" value={x} set={setX} /><Num label="One-time prepayment (₹)" value={l} set={setL} /></div>
    <Result rows={[['EMI', formatINR(o.emi || emi({ principal: num(p), annualRatePct: num(r), years: num(y) }))], ['Interest saved', formatINR(o.interestSaved)], ['Time saved', `${Math.floor(o.monthsSaved / 12)} yrs ${o.monthsSaved % 12} months`]]} note={`${ASSUME} Assumes a fixed rate.`} /></div>
}
function Retire() {
  const [e, setE] = useState('50000'); const [a, setA] = useState('30'); const [ra, setRa] = useState('60'); const [i, setI] = useState('6'); const [w, setW] = useState('4')
  const o = useMemo(() => retirementCorpus({ monthlyExpenseToday: num(e), currentAge: num(a), retireAge: num(ra), inflationPct: num(i), withdrawalPct: num(w) || 4 }), [e, a, ra, i, w])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Monthly spending today (₹)" value={e} set={setE} /><Num label="Your age" value={a} set={setA} /><Num label="Retire at" value={ra} set={setRa} /><Num label="Inflation (% a year)" value={i} set={setI} /><Num label="Withdrawal rate (%)" value={w} set={setW} min={1} /></div>
    <Result rows={[['Years to retirement', String(o.yearsToRetire)], ['Yearly spending then', formatINR(o.yearlyExpenseAtRetirement)], ['Corpus needed', formatINR(o.corpus)]]} note={ASSUME} /></div>
}

function Lump() {
  const [a, setA] = useState('500000'); const [r, setR] = useState('10'); const [y, setY] = useState('10')
  const o = useMemo(() => lumpsumFuture({ amount: num(a), annualReturnPct: num(r), years: num(y) }), [a, r, y])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Amount invested (₹)" value={a} set={setA} /><Num label="Assumed return (% a year)" value={r} set={setR} /><Num label="Years" value={y} set={setY} /></div>
    <Result rows={[['Estimated value', formatINR(o.futureValue)], ['Estimated gain', formatINR(o.gain)], ['Doubles in about', o.doubleYears ? `${o.doubleYears.toFixed(1)} years` : '—']]} note={ASSUME} /></div>
}
function Growth() {
  const [s, setS] = useState('100000'); const [e, setE] = useState('250000'); const [y, setY] = useState('7')
  const g = useMemo(() => cagr({ start: num(s), end: num(e), years: num(y) }), [s, e, y])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Starting value (₹)" value={s} set={setS} /><Num label="Ending value (₹)" value={e} set={setE} /><Num label="Years held" value={y} set={setY} /></div>
    <Result rows={[['Yearly growth rate', g == null ? '—' : `${g.toFixed(2)}%`]]} note="Turns a total gain into a steady yearly rate you can compare. Real returns bounce around year to year." /></div>
}
function Split() {
  const [i, setI] = useState('80000'); const [n, setN] = useState('50'); const [w, setW] = useState('30')
  const o = useMemo(() => budgetRule({ income: num(i), needsPct: num(n), wantsPct: num(w) }), [i, n, w])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Monthly take-home (₹)" value={i} set={setI} /><Num label="Needs (%)" value={n} set={setN} /><Num label="Wants (%)" value={w} set={setW} /></div>
    <Result rows={[['Needs', formatINR(o.needs)], ['Wants', formatINR(o.wants)], [`Savings & debt (${o.savingsPct}%)`, formatINR(o.savings)]]} note="A rule of thumb to start from, not a rule. Adjust the percentages to your life." /></div>
}
function Rvb() {
  const [p, setP] = useState('8000000'); const [d, setD] = useState('20'); const [lr, setLr] = useState('9'); const [ly, setLy] = useState('20'); const [rent, setRent] = useState('25000'); const [y, setY] = useState('15')
  const o = useMemo(() => rentVsBuy({ price: num(p), downPaymentPct: num(d), loanRatePct: num(lr), loanYears: num(ly), monthlyRent: num(rent), years: num(y) }), [p, d, lr, ly, rent, y])
  return <div className="grid gap-5 md:grid-cols-2"><div className="grid gap-4 sm:grid-cols-2"><Num label="Home price (₹)" value={p} set={setP} /><Num label="Down payment (%)" value={d} set={setD} /><Num label="Loan rate (%)" value={lr} set={setLr} /><Num label="Loan tenure (years)" value={ly} set={setLy} /><Num label="Monthly rent (₹)" value={rent} set={setRent} /><Num label="Compare over (years)" value={y} set={setY} /></div>
    <Result rows={[['EMI if you buy', formatINR(o.emi)], ['Net position if you buy', formatINR(o.buyNetWorth)], ['Net position if you rent and invest', formatINR(o.rentNetWorth)]]} note={`Assumes 5% rent growth, 5% home appreciation and 10% investment return. ${ASSUME} It ignores taxes, maintenance and stamp duty.`} /></div>
}

const ASSET_FIELDS: [string, string][] = [['Savings accounts & cash', 'Available balances, excluding FDs and investments below'], ['Fixed deposits (FD)', 'Current value, not maturity amount'], ['Mutual funds', 'Current value of units, not contributions'], ['Direct stocks', 'Current value of shares'], ['EPF', 'Recorded balance, not future contributions'], ['PPF', 'Current balance, not maturity value'], ['NPS', 'Current value. Restricted access is not available cash'], ['Gold', 'Realistic resale estimate'], ['Property', 'Your share of estimated value before the loan'], ['Other assets', 'Vehicles, bonds, business and so on']]
const DEBT_FIELDS: [string, string][] = [['Home loan', 'Outstanding principal, not EMI'], ['Vehicle loan', 'Outstanding principal'], ['Credit card balances', 'Amount owed today'], ['Other debt', 'Anything not counted above']]

function NetWorthCalc() {
  const [a, setA] = useState<Record<string, string>>({})
  const [d, setD] = useState<Record<string, string>>({})
  const assets = Object.values(a).reduce((s, v) => s + num(v), 0)
  const debts = Object.values(d).reduce((s, v) => s + num(v), 0)
  const any = assets > 0 || debts > 0
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <FieldSet legend="What you own"><div className="grid gap-4 sm:grid-cols-2">{ASSET_FIELDS.map(([l, h]) => <Num key={l} label={l} hint={h} value={a[l] ?? ''} set={(v) => setA({ ...a, [l]: v })} />)}</div></FieldSet>
        <FieldSet legend="What you owe"><div className="grid gap-4 sm:grid-cols-2">{DEBT_FIELDS.map(([l, h]) => <Num key={l} label={l} hint={h} value={d[l] ?? ''} set={(v) => setD({ ...d, [l]: v })} />)}</div></FieldSet>
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start"><Result rows={any ? [['Total assets', formatINR(assets)], ['Total liabilities', formatINR(debts)], ['Your net worth', formatINR(assets - debts)]] : [['Your net worth', '—']]} note="Net worth is assets minus liabilities on one date. It is a position, not a score. Count each holding once and use current balances. Nothing you enter leaves this page." /></div>
    </div>
  )
}

const META: Record<Tool, { icon: LucideIcon; text: string }> = {
  'Net worth': { icon: Scale, text: 'What you own minus what you owe' },
  SIP: { icon: TrendingUp, text: 'Small monthly amounts, grown over time' },
  Lumpsum: { icon: Coins, text: 'One investment and its value later' },
  'Goal SIP': { icon: Flag, text: 'The monthly amount a goal needs' },
  'Growth rate': { icon: Percent, text: 'Turn a total gain into a yearly rate' },
  'Loan & prepayment': { icon: Landmark, text: 'EMI and what extra payments save' },
  Retirement: { icon: Sunset, text: 'The corpus you will need' },
  'Rent vs buy': { icon: Home, text: 'Buy a home, or rent and invest' },
  'Budget split': { icon: PieChart, text: 'Needs, wants and savings' },
}

export default function ToolsPage() {
  const [tool, setTool] = useState<Tool>('SIP')
  const Icon = META[tool].icon
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_45%_at_50%_15%,#000_30%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-12rem] h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <header className="relative border-b border-border/60 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-5 w-5" /></span><span className="text-lg font-semibold tracking-tight">Mintmind</span></Link>
        <div className="flex items-center gap-2"><ThemeToggle /><Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Home</Link></div></div></header>
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground"><Calculator className="h-3.5 w-3.5 text-primary" />{TOOLS.length} free calculators</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Money calculators</h1>
          <p className="mt-2 text-muted-foreground">Try the numbers first. No sign-up, and nothing you type is stored or sent.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <nav aria-label="Calculators" role="tablist" className="grid grid-cols-2 gap-2 lg:sticky lg:top-6 lg:grid-cols-1 lg:self-start">
            {TOOLS.map((t) => { const M = META[t]; const on = tool === t; return (
              <button key={t} role="tab" aria-selected={on} onClick={() => setTool(t)} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent shadow-card' : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card')}>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><M.icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{t}</span><span className="hidden truncate text-xs text-muted-foreground lg:block">{M.text}</span></span>
              </button>) })}
          </nav>
          <section role="tabpanel" className="rounded-2xl border border-border bg-card/80 p-5 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold tracking-tight">{tool}</h2><p className="text-sm text-muted-foreground">{META[tool].text}</p></div></div>
            {tool === 'Net worth' && <NetWorthCalc />}{tool === 'SIP' && <Sip />}{tool === 'Goal SIP' && <GoalSip />}{tool === 'Loan & prepayment' && <Loan />}{tool === 'Retirement' && <Retire />}{tool === 'Rent vs buy' && <Rvb />}{tool === 'Lumpsum' && <Lump />}{tool === 'Growth rate' && <Growth />}{tool === 'Budget split' && <Split />}
            <p className="mt-6 text-xs text-muted-foreground">Educational tools, not investment, tax or insurance advice.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
