import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Wallet, LayoutDashboard, TrendingUp, Landmark, PieChart, CreditCard, Shield, Users, KeyRound, FileText, HeartHandshake,
  Lock, Cloud, Eye, ShieldCheck, UserRound, Calculator, Sparkles, ListChecks, type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DemoButton } from '@/components/landing/DemoButton'
import { IsometricHero } from '@/components/landing/IsometricHero'
const SampleSimulator = dynamic(() => import('@/components/landing/SampleSimulator').then((m) => m.SampleSimulator), { loading: () => <div className="h-96" aria-hidden /> })
import dynamic from 'next/dynamic'

// below the first screen: loaded after the hero has painted
const BentoGrid = dynamic(() => import('@/components/landing/BentoGrid').then((m) => m.BentoGrid), { loading: () => <div className="h-96" aria-hidden /> })
import { ProductMockups } from '@/components/landing/ProductMockups'
import { CookieSettingsButton } from '@/components/landing/CookieSettingsButton'
import { AppEntryButton } from '@/components/landing/AppEntryButton'
import { GradientText, Marquee, NumberTicker, Reveal, ShimmerCta, StaggerList } from '@/components/landing/fx'
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

const FAQ: [string, string][] = [
  ['Where is my data stored?', 'When you sign in, your records are saved on our server so every device you sign in on stays in step, and a copy is kept on each device so the app also works offline. Your Vault (passwords and secrets) is encrypted on your device before it is sent, so we cannot read it; if you lose both the master password and the recovery key, it cannot be recovered. Other records are not end-to-end encrypted. The sample family never leaves your browser. Documents go to your own Google Drive only if you connect it, and Mintmind does not encrypt those files. Settings has an export for your own backup.'],
  ['Does it connect to my bank?', 'No. Balances come from what you enter or import from a statement. Nothing refreshes from your bank automatically.'],
  ['Can a family use it together?', 'Yes, in part. A Family Circle shows each member\'s net worth when they choose to share it, and you can track goals and insurance for the household. Budgets and expenses are kept per person; a shared household budget is not available yet.'],
  ['What cookies does it use?', 'Only essential ones to keep you signed in, plus optional storage to remember your theme and layout if you allow it. There are no advertising or analytics cookies. The cookie notice lists every item.'],
  ['Does it work offline?', 'Yes. The app and your data are on your device, so you can keep using it without a connection once it has loaded.'],
  ['Is this financial advice?', 'No. It is a record and planning tool. Figures describe your own entries, and the AI assistant only explains what the app has calculated.'],
]

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
      <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <header className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-3 shadow-card backdrop-blur sm:px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Mintmind home"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span><span className="font-semibold tracking-tight">Mintmind</span></Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a><a href="#calculators" className="hover:text-foreground">Calculators</a><a href="#privacy" className="hover:text-foreground">Privacy</a>
          </nav>
          <div className="flex items-center gap-1.5"><ThemeToggle /><Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex"><Link href="/auth/signin?mode=signup">Sign up</Link></Button><AppEntryButton /></div>
        </header>
      </div>

      <main id="content" tabIndex={-1} className="outline-none">
        <section className="dot-grid relative overflow-hidden">
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Your entire financial world.<GradientText className="block">One clear picture.</GradientText></h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">Track your net worth, manage investments, understand your spending, and build a clearer picture of your financial future.</p>
              <div className="mt-8 flex flex-wrap items-start gap-3">
                <ShimmerCta href="/auth/signin">Get started <ArrowRight className="ml-2 h-4 w-4" /></ShimmerCta>
                <Button asChild size="lg" variant="outline" className="rounded-full"><a href="#features">Explore features</a></Button>
                <DemoButton size="lg" variant="secondary" label="See a sample family" />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5"><UserRound className="h-4 w-4" />Sample needs no sign-up</li>
                <li className="flex items-center gap-1.5"><Lock className="h-4 w-4" />Vault encrypted on your device</li>
              </ul>
            </div>
            <Reveal delay={150} className="flex justify-center lg:justify-end"><IsometricHero /></Reveal>
          </div>
        </section>

        <section aria-label="At a glance" className="border-y border-border bg-card/40 py-6">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-4 text-center sm:px-6">
            {[[MODULES.length, 'modules in one app'], [CALCS.length, 'free calculators'], [STEPS.length, 'steps to your first score']].map(([n, l]) => (
              <div key={l as string}><p className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl"><NumberTicker value={n as number} /></p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{l}</p></div>
            ))}
          </div>
          <Marquee className="mt-6" label="Modules">
            {MODULES.map(({ icon: Icon, name }) => <span key={name} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"><Icon className="h-4 w-4 text-primary" aria-hidden />{name}</span>)}
          </Marquee>
        </section>

        <SampleSimulator />

        <section id="preview" aria-labelledby="preview-title" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <Reveal>
              <h2 id="preview-title" className="text-2xl font-semibold tracking-tight">See it before you sign up</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Net worth, spending, investments and goals, on a desktop window and on a phone. Switch the tab to look around. The figures are a sample.</p>
            </Reveal>
            <Reveal delay={100} className="mt-8"><ProductMockups /></Reveal>
          </div>
        </section>

        <section id="explore" aria-labelledby="explore-title" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <Reveal>
              <h2 id="explore-title" className="text-2xl font-semibold tracking-tight">Try it before you sign up</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Every tile below is interactive. The numbers are made up so you can play: drag, tap and switch things to see how the app behaves.</p>
            </Reveal>
            <Reveal delay={100} className="mt-8"><BentoGrid /></Reveal>
          </div>
        </section>

        <section aria-labelledby="how" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="how" className="text-2xl font-semibold tracking-tight">How does it work?</h2>
            <StaggerList as="ol" className="mt-8 grid gap-4 md:grid-cols-3">{STEPS.map(({ icon: Icon, n, title, text }) => (
              <li key={n} className="surface-card p-4 sm:p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{n}</span><Icon className="h-4 w-4" /></div><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></li>))}</StaggerList>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="text-sm font-medium text-primary">Everything in one place</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Every penny, tracked and explained.</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">Each module does one job and they update each other, so one transaction shows up everywhere it should.</p>
            <StaggerList className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MODULES.map(({ icon: Icon, name, text }) => (
              <li key={name} className="surface-card p-4 sm:p-5 transition-colors hover:border-primary/40"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" /></span><h3 className="mt-3 font-semibold">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></li>))}</StaggerList>
          </div>
        </section>

        <section id="calculators" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <p className="text-sm font-medium text-primary">Free, no sign-up</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Quick calculators</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">Basic what-if tools you can use right now. Sign in to get planners prefilled with your own accounts and loans.</p>
            <StaggerList className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{CALCS.map(({ name, text }) => (
              <li key={name}><Link href="/tools" className="surface-card flex h-full items-start gap-3 p-4 transition-colors hover:border-primary/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Calculator className="h-[18px] w-[18px]" /></span><span><span className="block font-semibold">{name}</span><span className="mt-1 block text-sm text-muted-foreground">{text}</span></span></Link></li>))}</StaggerList>
            <p className="mt-6 text-sm text-muted-foreground">After sign-in: <strong className="font-medium text-foreground">Planning tools</strong> for emergency fund runway, loan payoff order, insurance cover and retirement, using your own numbers.</p>
            <Button asChild variant="outline" size="lg" className="mt-4"><Link href="/tools">Open all calculators <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>

        <section id="privacy" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Private by design</h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">{PRIVACY.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></li>))}</ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Clear about the limits</h2>
            <ul className="mt-6 grid gap-x-10 gap-y-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Balances come from what you enter or choose to sync. Nothing refreshes from your bank automatically.</li>
              <li>Your records are saved to your account, so the same data shows up on your phone and your laptop.</li>
              <li>It is a record and planning tool. It does not give investment, tax or insurance advice, and AI only explains figures the app calculated.</li>
              <li>Missing months stay empty. There is no streak to keep up.</li>
            </ul>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">Questions people ask</h2>
            <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring">{q}<span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span></summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-2xl font-semibold tracking-tight">Make your money easier to understand.</h2><p className="mt-1 text-muted-foreground">Start with the sample family or add your own numbers.</p></div>
            <div className="flex flex-wrap items-start gap-3"><Button asChild size="lg"><Link href="/auth/signin">Get started</Link></Button><DemoButton size="lg" label="See a sample family" /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div><p className="flex items-center gap-2 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span>Mintmind</p><p className="mt-3 max-w-sm text-xs text-muted-foreground">Track net worth, investments, spending and goals in one place. Your records stay on your device.</p></div>
          <nav aria-label="Product"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Product</p><ul className="mt-3 space-y-2"><li><a className="hover:underline" href="#explore">Try it</a></li><li><a className="hover:underline" href="#features">Features</a></li><li><a className="hover:underline" href="#calculators">Calculators</a></li><li><a className="hover:underline" href="#privacy">Privacy</a></li><li><a className="hover:underline" href="#faq">Questions</a></li></ul></nav>
          <nav aria-label="Get started"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Get started</p><ul className="mt-3 space-y-2"><li><Link className="hover:underline" href="/auth/signin?mode=signup">Create an account</Link></li><li><Link className="hover:underline" href="/auth/signin">Sign in</Link></li></ul></nav>
        </div>
        <div className="border-t border-border"><div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>Mintmind is a personal record-keeping and planning tool, not financial, tax, insurance or legal advice. AI answers are educational. Digital Legacy notifies people you trust; it does not replace a will, nominations or inheritance law, and inactivity is not proof of death or incapacity.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1"><span>© {new Date().getFullYear()} Mintmind</span><Link className="hover:underline" href="/terms">Terms of use</Link><Link className="hover:underline" href="/cookies">Cookies</Link><CookieSettingsButton className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" /><Link className="hover:underline" href="/contact">Contact</Link></p></div></div>
      </footer>
    </div>
  )
}
