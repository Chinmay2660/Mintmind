import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Wallet, LayoutDashboard, TrendingUp, Landmark, PieChart, CreditCard, Shield, Users, KeyRound, FileText, HeartHandshake,
  Lock, Cloud, Eye, ShieldCheck, UserRound, Calculator, Sparkles, ListChecks, type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DemoButton } from '@/components/landing/DemoButton'
import { HeroScoreCard } from '@/components/landing/HeroScoreCard'
import { SampleSimulator } from '@/components/landing/SampleSimulator'
import { AppEntryButton } from '@/components/landing/AppEntryButton'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Mintmind: personal & family wealth in one place',
  description: 'Net worth, bank accounts, mutual funds, cards, insurance and budgets for families, with a private vault, documents in your own Drive, an AI assistant and a legacy plan.',
}

const MODULES: { icon: LucideIcon; name: string; text: string }[] = [
  { icon: LayoutDashboard, name: 'Dashboard', text: 'Net worth, growth, allocation, dues and budget pace on one screen.' },
  { icon: TrendingUp, name: 'Net Worth & Goals', text: 'History, comparisons and goals like an emergency or marriage fund.' },
  { icon: Landmark, name: 'Bank Accounts', text: 'Savings and cash, minimum-balance aware, updated by every transaction.' },
  { icon: PieChart, name: 'Mutual Funds', text: 'True XIRR, SIPs, fund history and weekly NAV updates.' },
  { icon: CreditCard, name: 'Cards', text: 'Credit and debit cards, utilisation, statements and dues.' },
  { icon: Shield, name: 'Insurance', text: 'Policies, premiums, renewals and family mapping.' },
  { icon: Wallet, name: 'Budget & Expenses', text: 'Day-wise pacing, categories, calendar and stats views.' },
  { icon: Users, name: 'Family Circle', text: 'Each person decides what to share. Joint assets counted once.' },
  { icon: KeyRound, name: 'My Vault', text: 'Zero-knowledge passwords and secure notes with biometrics.' },
  { icon: FileText, name: 'Documents', text: 'Kept in your own Google Drive, neatly organised.' },
  { icon: HeartHandshake, name: 'Digital Legacy', text: 'Trusted contacts and a controlled, verified handover.' },
  { icon: Sparkles, name: 'My Wealth AI', text: 'Ask in plain language. Insights, reports and a transparent health score.' },
]

const CALCS = [
  { name: 'SIP', text: 'See small monthly amounts grow over time.' },
  { name: 'Lumpsum', text: 'One investment, its value later and doubling time.' },
  { name: 'Goal SIP', text: 'Name a goal and a date, get the monthly amount.' },
  { name: 'Loan & prepayment', text: 'EMI, and what extra payments save.' },
  { name: 'Rent vs buy', text: 'Compare buying a home with renting and investing.' },
  { name: 'Budget split', text: 'Split take-home pay into needs, wants and savings.' },
]

const STEPS = [
  { icon: ListChecks, n: 'Step 1', title: 'Add your numbers', text: 'Accounts, funds, cards and policies. Rough is fine, update any time.' },
  { icon: TrendingUp, n: 'Step 2', title: 'See where you stand', text: 'Net worth, a rule-based health score and what changed this month.' },
  { icon: Sparkles, n: 'Step 3', title: 'Plan and automate', text: 'Set goals, get reminders and let simple automations nudge you.' },
]

const PRIVACY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Lock, title: 'A vault only you can open', text: 'Encrypted on your device. We, admins and family cannot read it.' },
  { icon: Eye, title: 'Sharing is opt-in', text: 'Family sees only what each person turns on.' },
  { icon: Cloud, title: 'Your Drive, your files', text: 'Documents live in your Google Drive with minimal access.' },
  { icon: ShieldCheck, title: 'Numbers you can trust', text: 'Figures are calculated by the app. AI only explains them, and only with your consent.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <header className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-3 shadow-card backdrop-blur sm:px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Mintmind home"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span><span className="font-semibold tracking-tight">Mintmind</span></Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a><a href="#calculators" className="hover:text-foreground">Calculators</a><a href="#privacy" className="hover:text-foreground">Privacy</a>
          </nav>
          <div className="flex items-center gap-1.5"><ThemeToggle /><Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex"><Link href="/auth/signin">Sign in</Link></Button><AppEntryButton /></div>
        </header>
      </div>

      <main>
        <section className="dot-grid relative">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Is your family&apos;s money on track?<span className="block text-primary">See it clearly in minutes.</span></h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">Add rough numbers, see what to fix first, then plan goals, track the budget and protect what matters.</p>
              <div className="mt-8 flex flex-wrap items-start gap-3">
                <Button asChild size="lg"><Link href="/auth/signin?mode=signup">Check my money <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <DemoButton size="lg" label="See a sample family" />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5"><UserRound className="h-4 w-4" />Sample needs no sign-up</li>
                <li className="flex items-center gap-1.5"><Lock className="h-4 w-4" />Vault encrypted on your device</li>
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end"><HeroScoreCard /></div>
          </div>
        </section>

        <SampleSimulator />

        <section aria-labelledby="how" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="how" className="text-2xl font-semibold tracking-tight">How does it work?</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">{STEPS.map(({ icon: Icon, n, title, text }) => (
              <li key={n} className="surface-card p-4 sm:p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{n}</span><Icon className="h-4 w-4" /></div><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></li>))}</ol>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="text-sm font-medium text-primary">Everything in one place</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Every penny, tracked and explained.</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">Each module does one job and they update each other, so one transaction shows up everywhere it should.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MODULES.map(({ icon: Icon, name, text }) => (
              <li key={name} className="surface-card p-4 sm:p-5 transition-colors hover:border-primary/40"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-[18px] w-[18px]" /></span><h3 className="mt-3 font-semibold">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></li>))}</ul>
          </div>
        </section>

        <section id="calculators" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="text-sm font-medium text-primary">Free, no sign-up</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Quick calculators</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">Basic what-if tools you can use right now. Sign in to get planners prefilled with your own accounts and loans.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{CALCS.map(({ name, text }) => (
              <li key={name}><Link href="/tools" className="surface-card flex h-full items-start gap-3 p-4 transition-colors hover:border-primary/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Calculator className="h-[18px] w-[18px]" /></span><span><span className="block font-semibold">{name}</span><span className="mt-1 block text-sm text-muted-foreground">{text}</span></span></Link></li>))}</ul>
            <p className="mt-6 text-sm text-muted-foreground">After sign-in: <strong className="font-medium text-foreground">Planning tools</strong> for emergency fund runway, loan payoff order, insurance cover and retirement, using your own numbers.</p>
            <Button asChild variant="outline" size="lg" className="mt-4"><Link href="/tools">Open all calculators <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>

        <section id="privacy" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Private by design</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">{PRIVACY.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-[18px] w-[18px]" /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></li>))}</ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Clear about the limits</h2>
            <ul className="mt-6 grid gap-x-10 gap-y-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Balances come from what you enter or choose to sync. Nothing refreshes from your bank automatically.</li>
              <li>Your records live in this browser. Moving devices means exporting and importing a backup.</li>
              <li>It is a record and planning tool. It does not give investment, tax or insurance advice, and AI only explains figures the app calculated.</li>
              <li>Missing months stay empty. There is no streak to keep up.</li>
            </ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-2xl font-semibold tracking-tight">Ready when you are</h2><p className="mt-1 text-muted-foreground">Start with the sample family or add your own numbers.</p></div>
            <div className="flex flex-wrap items-start gap-3"><Button asChild size="lg"><Link href="/auth/signin?mode=signup">Check my money</Link></Button><DemoButton size="lg" label="See a sample family" /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border"><div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-xs text-muted-foreground sm:px-6">
        <p>Mintmind is a personal record-keeping and planning tool, not financial, tax, insurance or legal advice. AI answers are educational. Digital Legacy notifies people you trust; it does not replace a will, nominations or inheritance law, and inactivity is not proof of death or incapacity.</p>
        <p>© {new Date().getFullYear()} Mintmind</p></div></footer>
    </div>
  )
}
