'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ArrowLeft, ArrowRight, Check, Info, Laptop, Loader2, Moon, Sun, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { FEATURES, GOALS, PACKAGES, featureByKey, normaliseSelection, recommendedFor, validateAge, validateMobile } from '@/lib/features'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { iconFor } from '@/components/onboarding/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { FieldSet } from '@/components/ui/layout'

const STEPS = ['Profile', 'Goals', 'Package', 'Features', 'Preferences', 'Quick setup'] as const
const NEEDS = [{ v: 'personal', l: 'Personal finances' }, { v: 'family', l: 'Family finances' }, { v: 'investments', l: 'Investments' }, { v: 'complete', l: 'Complete wealth management' }]
const FREQ = [{ v: 'daily', l: 'Daily' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }, { v: 'important', l: 'Only important alerts' }]
const THEMES = [{ v: 'light', l: 'Light', i: Sun }, { v: 'dark', l: 'Dark', i: Moon }, { v: 'system', l: 'System default', i: Laptop }]

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isDemo, data } = useWealth()
  const { ready, onboardingCompleted, completeOnboarding } = useFeatures()
  const { setTheme, theme } = useTheme()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [age, setAge] = useState('')
  const [ageError, setAgeError] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [pkg, setPkg] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(['dashboard'])
  const [needs, setNeeds] = useState<string | null>(null)
  const [freq, setFreq] = useState('important')
  const [learn, setLearn] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const recommended = useMemo(() => new Set(recommendedFor(goals)), [goals])
  const toggle = (k: string) => { if (k === 'dashboard') return; setPkg(null); setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k])) }
  const pick = (key: string) => { setPkg(key); setSelected(normaliseSelection(PACKAGES.find((p) => p.key === key)!.features)) }

  const finish = async () => {
    const a = validateAge(age)
    if (!a.ok) { setStep(0); setAgeError(a.error); return }
    const mo = validateMobile(mobile)
    if (!mo.ok) { setStep(0); setMobileError(mo.error); return }
    setBusy(true)
    try {
      await completeOnboarding({ selection: selected, goals, package: pkg, needs, age: a.value, mobile: mo.value, theme: theme || 'system', notifications: freq })
      setDone(true)
      setStep(5)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Could not save your choices. Please try again.')
    } finally { setBusy(false) }
  }

  const next = () => {
    if (step === 0) {
      const a = validateAge(age)
      if (!a.ok) return void setAgeError(a.error)
      setAgeError('')
      const mo = validateMobile(mobile)
      if (!mo.ok) return void setMobileError(mo.error)
      setMobileError('')
    }
    if (step === 4) return void finish()
    setStep((s) => s + 1)
  }

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const nameOrEmail = user?.name || user?.email || ''
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden pb-8 bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_30%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <header className="relative border-b border-border/60 backdrop-blur"><div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span><span className="font-semibold">Mintmind</span></Link>
        {isDemo && <span className="rounded-md bg-warning/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warning">Demo mode</span>}
      </div></header>

      <main className="relative mx-auto my-auto w-full max-w-4xl rounded-2xl border border-border bg-card/80 px-5 py-8 shadow-[var(--shadow-elevated)] backdrop-blur sm:px-10 sm:py-10">
        <div className="mb-8" role="group" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Step {step + 1} of {STEPS.length}</span><span>{STEPS[step]}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>

        {step === 0 && (
          <section className="space-y-6">
            <div><h1 className="text-2xl font-semibold tracking-tight">Let&apos;s set up your profile</h1><p className="mt-1 text-muted-foreground">Only your name and email are needed. Everything else is optional.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">{(id) => <Input id={id} value={nameOrEmail} readOnly />}</Field>
              <Field label="Email address">{(id) => <Input id={id} value={user?.email || ''} readOnly />}</Field>
              <Field label="Mobile number (optional)" hint="Include the country code, e.g. +91 98765 43210" error={mobileError}>{(id) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={mobile} onChange={(e) => { setMobile(e.target.value); setMobileError('') }} placeholder="+91 …" />}</Field>
              <Field label="How old are you? (optional)" hint="Used only to suggest relevant guidance. It is never shared with family, and nothing is turned on because of it." error={ageError}>{(id) => <Input id={id} type="number" inputMode="numeric" min={18} max={120} value={age} onChange={(e) => { setAge(e.target.value); setAgeError('') }} />}</Field>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <div><h1 className="text-2xl font-semibold tracking-tight">What would you like to achieve with this app?</h1><p className="mt-1 text-muted-foreground">Choose as many as you like, or skip. This only helps us suggest features. Nothing is switched on from it.</p></div>
            <ul className="grid gap-3 sm:grid-cols-2">{GOALS.map((g) => { const Icon = iconFor(g.icon); const on = goals.includes(g.key); return (
              <li key={g.key}><button type="button" aria-pressed={on} onClick={() => setGoals((x) => (on ? x.filter((k) => k !== g.key) : [...x, g.key]))} className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{on ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="text-sm font-medium">{g.label}</span></button></li>) })}</ul>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div><h1 className="text-2xl font-semibold tracking-tight">Start from a package</h1><p className="mt-1 text-muted-foreground">These are suggestions, not plans. You can add or remove anything on the next screen.</p></div>
            <ul className="grid gap-3 sm:grid-cols-2">{PACKAGES.map((p) => { const on = pkg === p.key; return (
              <li key={p.key}><button type="button" aria-pressed={on} onClick={() => pick(p.key)} className={cn('h-full w-full rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}>
                <div className="flex items-center justify-between"><span className="font-semibold">{p.name}</span>{on && <Check className="h-4 w-4 text-primary" />}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{p.features.map((k) => featureByKey(k)?.name).join(' · ')}</p></button></li>) })}</ul>
            <p className="text-sm text-muted-foreground">Prefer to pick yourself? Continue and choose features one by one.</p>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div><h1 className="text-2xl font-semibold tracking-tight">Build your own wealth dashboard</h1><p className="mt-1 text-muted-foreground">Choose the features you need. Your app is personalised around them, and you can change this any time in Settings.</p></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setPkg('complete'); setSelected(normaliseSelection(FEATURES.map((f) => f.key))) }}>Select all</Button><Button variant="outline" size="sm" onClick={() => { setPkg(null); setSelected(['dashboard']) }}>Clear all</Button></div>
            <ul className="grid gap-3 sm:grid-cols-2">{FEATURES.map((f) => { const Icon = iconFor(f.icon); const on = selected.includes(f.key); return (
              <li key={f.key} className={cn('flex flex-col rounded-xl border p-4 transition-colors', on ? 'border-primary bg-accent/50' : 'border-border')}>
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-2 font-semibold">{f.name}{recommended.has(f.key) && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Recommended</span>}{f.core && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Always on</span>}</p><p className="mt-0.5 text-sm text-muted-foreground">{f.description}</p></div>
                  <label className="flex shrink-0 items-center"><span className="sr-only">Include {f.name}</span><input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={on} disabled={f.core} onChange={() => toggle(f.key)} /></label>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{f.benefits.slice(0, 3).map((b) => <li key={b} className="flex gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{b}</li>)}</ul>
                {f.sensitive && <p className="mt-2 text-[11px] text-muted-foreground">Needs its own security setup before use.</p>}
                <button type="button" className="mt-3 flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline" onClick={() => setLearn(f.key)}><Info className="h-3 w-3" />Learn more</button>
              </li>) })}</ul>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-7">
            <div><h1 className="text-2xl font-semibold tracking-tight">A few preferences</h1><p className="mt-1 text-muted-foreground">All optional. You can change them later.</p></div>
            <FieldSet legend="How would you describe your financial tracking needs?"><div className="grid gap-2 sm:grid-cols-2">{NEEDS.map((n) => <button key={n.v} type="button" aria-pressed={needs === n.v} onClick={() => setNeeds(needs === n.v ? null : n.v)} className={cn('rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors', needs === n.v ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}>{n.l}</button>)}</div></FieldSet>
            <FieldSet legend="How often would you like financial updates?"><div className="grid gap-2 sm:grid-cols-2">{FREQ.map((n) => <button key={n.v} type="button" aria-pressed={freq === n.v} onClick={() => setFreq(n.v)} className={cn('rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors', freq === n.v ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}>{n.l}</button>)}</div></FieldSet>
            <FieldSet legend="Which theme do you prefer?"><div className="grid gap-2 sm:grid-cols-3">{THEMES.map(({ v, l, i: Icon }) => <button key={v} type="button" aria-pressed={theme === v} onClick={() => setTheme(v)} className={cn('flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition-colors', theme === v ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}><Icon className="h-4 w-4" />{l}</button>)}</div></FieldSet>
          </section>
        )}

        {step === 5 && done && <QuickSetup selected={selected} data={data} onOpen={() => router.push('/dashboard')} />}

        {step < 5 && (
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5">
            <div>{step > 0 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button> : <span />}</div>
            <div className="flex items-center gap-2">
              {(step === 0 || step === 1 || step === 4) && <Button variant="ghost" onClick={() => { if (step === 0) { setAge(''); setAgeError('') } next() }} disabled={busy}>Skip</Button>}
              <Button onClick={next} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{step === 4 ? 'Finish setup' : 'Continue'}{!busy && <ArrowRight className="ml-1.5 h-4 w-4" />}</Button>
            </div>
          </div>
        )}
        {!onboardingCompleted && step < 5 && isDemo && <p className="mt-4 text-center text-xs text-muted-foreground">Just exploring? <button className="font-medium text-primary hover:underline" onClick={() => { setSelected(normaliseSelection(FEATURES.map((f) => f.key))); setPkg('complete'); setStep(4) }}>Use the full demo</button></p>}
      </main>

      <Dialog open={!!learn} onOpenChange={(o) => !o && setLearn(null)}>
        <DialogContent>{learn && (() => { const f = featureByKey(learn)!; return (<>
          <DialogHeader><DialogTitle>{f.name}</DialogTitle><DialogDescription>{f.description}</DialogDescription></DialogHeader>
          <ul className="space-y-1.5 text-sm">{f.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{b}</li>)}</ul>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm"><strong>What you need:</strong> {f.needs}</p>
          <Button onClick={() => { if (!selected.includes(f.key)) toggle(f.key); setLearn(null) }} disabled={f.core}>{selected.includes(f.key) ? 'Included' : 'Include this feature'}</Button>
        </>) })()}</DialogContent>
      </Dialog>
    </div>
  )
}

const SETUP: Record<string, { label: string; action: string; href: string; done: (d: any) => boolean }> = {
  dashboard: { label: 'Dashboard & Net Worth', action: 'Ready', href: '/dashboard', done: () => true },
  bank_accounts: { label: 'Bank Accounts', action: 'Add your first account', href: '/dashboard/bank-accounts', done: (d) => d.bankAccounts.length > 0 },
  mutual_funds: { label: 'Mutual Funds & SIPs', action: 'Add your investments', href: '/dashboard/mutual-funds', done: (d) => d.funds.length > 0 },
  credit_cards: { label: 'Cards', action: 'Add your cards', href: '/dashboard/credit-cards', done: (d) => d.cards.length > 0 },
  insurance: { label: 'Insurance', action: 'Add your policies', href: '/dashboard/insurance', done: (d) => d.policies.length > 0 },
  budget_expenses: { label: 'Budget & Expenses', action: 'Set your monthly budget', href: '/dashboard/budget', done: (d) => d.budgets.length > 0 },
  family_circle: { label: 'Family Circle', action: 'Invite a family member', href: '/dashboard/family', done: (d) => d.members.length > 1 },
  vault: { label: 'My Vault', action: 'Create your master password', href: '/dashboard/vault', done: (d) => d.meta.some((m: any) => m.key === 'vault') },
  documents: { label: 'Documents', action: 'Connect Google Drive', href: '/dashboard/vault?tab=documents', done: (d) => d.documents.length > 0 },
  digital_legacy: { label: 'Digital Legacy', action: 'Add a trusted contact', href: '/dashboard/vault?tab=legacy', done: (d) => d.legacy.length > 0 },
  ai_assistant: { label: 'AI Wealth Assistant', action: 'Ready', href: '/dashboard/ai', done: () => true },
  automation: { label: 'Smart Automation', action: 'Choose your reminders', href: '/dashboard/settings?tab=automation', done: (d) => d.automations.length > 0 },
}

function QuickSetup({ selected, data, onOpen }: { selected: string[]; data: any; onOpen: () => void }) {
  const rows = selected.map((k) => ({ k, ...SETUP[k] })).filter((r) => r.label)
  const doneCount = rows.filter((r) => r.done(data)).length
  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Your wealth app is almost ready</h1><p className="mt-1 text-muted-foreground">Set up what you like now, or skip and do it later. You never need to enter real data to look around.</p></div>
      <div><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Setup progress</span><span>{doneCount} of {rows.length} ready</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / Math.max(rows.length, 1)) * 100}%` }} /></div></div>
      <ul className="divide-y divide-border rounded-xl border border-border">{rows.map((r) => { const ok = r.done(data); return (
        <li key={r.k} className="flex items-center justify-between gap-3 px-4 py-3"><span className="flex items-center gap-2.5 text-sm font-medium"><span className={cn('flex h-5 w-5 items-center justify-center rounded-full', ok ? 'bg-primary text-primary-foreground' : 'border border-border')}>{ok && <Check className="h-3 w-3" />}</span>{r.label}</span>
          {ok ? <span className="text-xs text-muted-foreground">Ready</span> : <span className="flex items-center gap-2"><Button asChild size="sm" variant="outline"><Link href={r.href}>{r.action}</Link></Button><span className="hidden text-xs text-muted-foreground sm:inline">or skip for now</span></span>}</li>) })}</ul>
      <Button size="lg" onClick={onOpen}>Open my dashboard<ArrowRight className="ml-2 h-4 w-4" /></Button>
    </section>
  )
}
