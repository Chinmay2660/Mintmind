'use client'

import { Money } from '@/components/wealth/Money'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ArrowLeft, ArrowRight, Check, Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { FEATURES, normaliseSelection, validateAge, validateMobile } from '@/lib/features'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { SubscriptionForm } from '@/components/wealth/budget/Subscriptions'
import { AccountForm } from '@/components/wealth/AccountForm'
import { AssetForm } from '@/components/wealth/AssetForm'
import { ItemForm } from '@/components/wealth/AssetsLoans'
import { FundForm } from '@/components/wealth/FundForms'
import { addFund, save } from '@/lib/wealth/actions'

// Everything is switched on for a new profile. Switching a feature off, or choosing preferences, is done in Settings afterwards.
const STEPS = ['Profile', 'Start', '', '', '', 'Quick setup'] as const
const SHORT = [1, 5]
const ALL_FEATURES = normaliseSelection(FEATURES.map((f) => f.key))

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isDemo, data } = useWealth()
  const { ready, onboardingCompleted, completeOnboarding } = useFeatures()
  const { theme } = useTheme()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [age, setAge] = useState('')
  const [ageError, setAgeError] = useState('')
  const [done, setDone] = useState(false)
  const finishing = useRef(false)
  // Setup is shown once. Coming back to it after it was finished goes to the dashboard; the same choices live in Settings.
  useEffect(() => { if (ready && onboardingCompleted && !finishing.current && !done) router.replace('/dashboard') }, [ready, onboardingCompleted, done, router])

  const finish = async () => {
    const a = validateAge(age)
    if (!a.ok) { setStep(0); setAgeError(a.error); return }
    const mo = validateMobile(mobile)
    if (!mo.ok) { setStep(0); setMobileError(mo.error); return }
    setBusy(true)
    finishing.current = true
    try {
      await completeOnboarding({ selection: ALL_FEATURES, goals: [], package: 'complete', needs: null, age: a.value, mobile: mo.value, theme: theme || 'light', notifications: 'important' })
      setDone(true)
      setStep(5)
    } catch (e: any) {
      finishing.current = false
      toast.error(e?.response?.data?.error || 'Could not save your choices. Please try again.')
    } finally { setBusy(false) }
  }

  const setUp = () => void finish()

  const next = () => {
    if (step === 0) {
      const a = validateAge(age)
      if (!a.ok) return void setAgeError(a.error)
      setAgeError('')
      const mo = validateMobile(mobile)
      if (!mo.ok) return void setMobileError(mo.error)
      setMobileError('')
      return void setStep(1)
    }
    setStep((s) => s + 1)
  }

  if (!ready) return <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  const nameOrEmail = user?.name || user?.email || ''
  const flow = SHORT
  const pos = Math.max(0, flow.indexOf(step))
  const progress = step === 0 ? 10 : ((pos + 1) / flow.length) * 100

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden pb-8 bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_30%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <header className="relative border-b border-border/60 backdrop-blur"><div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span><span className="font-semibold">Mintmind</span></Link>
        {isDemo && <span className="rounded-md bg-warning/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warning">Demo mode</span>}
      </div></header>

      <main className="relative mx-auto my-auto w-full max-w-4xl rounded-2xl border border-border bg-card/80 px-5 py-8 shadow-[var(--shadow-elevated)] backdrop-blur sm:px-10 sm:py-10">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{step === 0 ? 'Optional details' : `Step ${pos + 1} of ${flow.length}`}</span><span>{STEPS[step]}</span></div>
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
            <div><h1 className="text-2xl font-semibold tracking-tight">Welcome to your wealth app</h1><p className="mt-1 text-muted-foreground">Everything is switched on, so nothing is hidden from you: accounts, budget, investments, cards, insurance, family, vault, documents and more. You can turn off anything you do not need later in Settings, and nothing you add is ever deleted.</p></div>
          </section>
        )}

        {step === 5 && done && <QuickSetup selected={ALL_FEATURES} data={data} onOpen={() => router.push('/dashboard')} />}

        {step === 1 && (
          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-5">
            <Button size="lg" onClick={setUp} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Set up my app{!busy && <ArrowRight className="ml-1.5 h-4 w-4" />}</Button>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
              <button type="button" onClick={() => setStep(0)} disabled={busy} className="-my-2 py-2.5 text-muted-foreground hover:text-foreground hover:underline">Add phone or age (optional)</button>
            </div>
          </div>
        )}
        {step === 0 && (
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5">
            <div><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button></div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setAge(''); setAgeError(''); setMobile(''); setMobileError(''); setStep(1) }} disabled={busy}>Skip</Button>
              <Button onClick={next} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save{!busy && <ArrowRight className="ml-1.5 h-4 w-4" />}</Button>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}

type FormKey = 'asset' | 'loan' | 'account' | 'fund' | 'subscription'
const SETUP: Record<string, { label: string; action: string; href: string; form?: FormKey; done: (d: any) => boolean }> = {
  dashboard: { label: 'Dashboard & Net Worth', action: 'Ready', href: '/dashboard', done: () => true },
  net_assets: { label: 'Assets (property, gold, EPF, stocks)', action: 'Add an asset', href: '', form: 'asset', done: (d) => d.assets.length > 0 },
  net_liabilities: { label: 'Loans and other liabilities', action: 'Add a loan', href: '', form: 'loan', done: (d) => d.liabilities.length > 0 },
  bank_accounts: { label: 'Bank Accounts', action: 'Add your first account', href: '', form: 'account', done: (d) => d.bankAccounts.length > 0 },
  mutual_funds: { label: 'Mutual Funds & SIPs', action: 'Add your investments', href: '', form: 'fund', done: (d) => d.funds.length > 0 },
  recurring: { label: 'Recurring payments (subscriptions, rent, SIPs)', action: 'Add a payment', href: '', form: 'subscription', done: (d) => d.sips.length > 0 || d.meta.some((m: any) => m.key === 'subscriptions' && m.value?.length > 0) },
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
  const { db, netWorth } = useWealth()
  const [form, setForm] = useState<FormKey | null>(null)
  const keys = [...selected, ...(selected.includes('dashboard') ? ['net_assets', 'net_liabilities'] : []), ...(selected.includes('budget_expenses') || selected.includes('mutual_funds') ? ['recurring'] : [])]
  const rows = keys.map((k) => ({ k, ...SETUP[k] })).filter((r) => r.label)
  const doneCount = rows.filter((r) => r.done(data)).length
  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Your wealth app is almost ready</h1><p className="mt-1 text-muted-foreground">Set up what you like now, or skip and do it later. You never need to enter real data to look around.</p></div>
      {/* the first useful result: as soon as one item is added, show what it adds up to */}
      {(netWorth.assets > 0 || netWorth.liabilities > 0) && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4" role="status">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your net worth so far</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums"><Money value={netWorth.netWorth} /></p>
          <p className="mt-1 text-xs text-muted-foreground">Assets <Money value={netWorth.assets} /> minus loans <Money value={netWorth.liabilities} />. It updates as you add more.</p>
        </div>
      )}
      <div><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Setup progress</span><span>{doneCount} of {rows.length} ready</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / Math.max(rows.length, 1)) * 100}%` }} /></div></div>
      <ul className="divide-y divide-border rounded-xl border border-border">{rows.map((r) => { const ok = r.done(data); return (
        <li key={r.k} className="flex items-center justify-between gap-3 px-4 py-3"><span className="flex items-center gap-2.5 text-sm font-medium"><span className={cn('flex h-5 w-5 items-center justify-center rounded-full', ok ? 'bg-primary text-primary-foreground' : 'border border-border')}>{ok && <Check className="h-3 w-3" />}</span>{r.label}</span>
          {ok ? <span className="text-xs text-muted-foreground">Ready</span> : <span className="flex items-center gap-2">{r.form ? <Button size="sm" variant="outline" onClick={() => setForm(r.form!)}>{r.action}</Button> : <Button asChild size="sm" variant="outline"><Link href={r.href}>{r.action}</Link></Button>}<span className="hidden text-xs text-muted-foreground sm:inline">or skip for now</span></span>}</li>) })}</ul>
      {/* the same forms the app pages use, opened here so setup does not send you away */}
      {form === 'subscription' && <SubscriptionForm onClose={() => setForm(null)} />}
      {form === 'account' && <AccountForm onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'bankAccounts', rec); await db.balanceHistory.add({ id: `bh_${Date.now()}`, accountId: rec.id, date: rec.lastUpdated, balance: rec.currentBalance, note: 'Opening balance' }); toast.success('Account added') }} />}
      {form === 'asset' && <AssetForm row={null} category="epf" onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Asset added') }} />}
      {form === 'loan' && <ItemForm kind="liability" row={null} onClose={() => setForm(null)} onSave={async (rec) => { await save(db, 'liabilities', rec); toast.success('Loan added') }} />}
      {form === 'fund' && <FundForm onClose={() => setForm(null)} onSave={async (rec) => { await addFund(db, rec); toast.success('Fund added') }} />}
      <p className="text-xs text-muted-foreground">SIPs are added under Investments, once you have a fund.</p>
      <Button size="lg" onClick={onOpen}>Open my dashboard<ArrowRight className="ml-2 h-4 w-4" /></Button>
    </section>
  )
}
