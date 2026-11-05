'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'
import { emi, goalSip, prepayment, rentVsBuy, retirementCorpus, sipFutureValue } from '@/lib/calculators'
import { formatINR } from '@/lib/wealth/format'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const TOOLS = ['Net worth', 'SIP', 'Goal SIP', 'Loan & prepayment', 'Retirement', 'Rent vs buy'] as const
type Tool = (typeof TOOLS)[number]

const num = (v: string) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : 0)

function Num({ label, value, set, hint, min = 0 }: { label: string; value: string; set: (v: string) => void; hint?: string; min?: number }) {
  return <Field label={label} hint={hint}>{(id) => <Input id={id} type="number" min={min} step="any" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />}</Field>
}
const Result = ({ rows, note }: { rows: [string, string][]; note: string }) => (
  <div className="surface-card p-5">
    <dl className="divide-y divide-border">{rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 py-2"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-muted-foreground">{note}</p>
  </div>
)
const ASSUME = 'What-if arithmetic from the numbers and assumed return you enter. It is not a prediction or advice, and nothing you type leaves this page.'

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
        <fieldset><legend className="mb-2 text-sm font-semibold">What you own</legend><div className="grid gap-4 sm:grid-cols-2">{ASSET_FIELDS.map(([l, h]) => <Num key={l} label={l} hint={h} value={a[l] ?? ''} set={(v) => setA({ ...a, [l]: v })} />)}</div></fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">What you owe</legend><div className="grid gap-4 sm:grid-cols-2">{DEBT_FIELDS.map(([l, h]) => <Num key={l} label={l} hint={h} value={d[l] ?? ''} set={(v) => setD({ ...d, [l]: v })} />)}</div></fieldset>
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start"><Result rows={any ? [['Total assets', formatINR(assets)], ['Total liabilities', formatINR(debts)], ['Your net worth', formatINR(assets - debts)]] : [['Your net worth', '—']]} note="Net worth is assets minus liabilities on one date. It is a position, not a score. Count each holding once and use current balances. Nothing you enter leaves this page." /></div>
    </div>
  )
}

export default function ToolsPage() {
  const [tool, setTool] = useState<Tool>('Net worth')
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-5 w-5" /></span><span className="text-lg font-semibold tracking-tight">Mintmind</span></Link>
        <div className="flex items-center gap-2"><ThemeToggle /><Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Home</Link></div></div></header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <div><h1 className="text-3xl font-semibold tracking-tight">Money calculators</h1><p className="mt-1 text-muted-foreground">Try the numbers first. No sign-up, and nothing you type is stored or sent.</p></div>
        <div role="tablist" aria-label="Calculators" className="flex gap-1.5 overflow-x-auto pb-1">{TOOLS.map((t) => <button key={t} role="tab" aria-selected={tool === t} onClick={() => setTool(t)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', tool === t ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground')}>{t}</button>)}</div>
        {tool === 'Net worth' && <NetWorthCalc />}{tool === 'SIP' && <Sip />}{tool === 'Goal SIP' && <GoalSip />}{tool === 'Loan & prepayment' && <Loan />}{tool === 'Retirement' && <Retire />}{tool === 'Rent vs buy' && <Rvb />}
        <p className="text-xs text-muted-foreground">Educational tools, not investment, tax or insurance advice.</p>
      </main>
    </div>
  )
}
