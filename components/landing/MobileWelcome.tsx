'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { IndianRupee, PiggyBank, Shield, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { DemoButton } from '@/components/landing/DemoButton'

// Each ring carries one chip. Radius is a share of the stage, duration is how slowly it travels.
const RINGS: { size: string; seconds: number; chip: LucideIcon; tone: string; start: number }[] = [
  { size: '44%', seconds: 46, chip: TrendingUp, tone: 'text-[hsl(var(--highlight))]', start: 20 },
  { size: '70%', seconds: 62, chip: Shield, tone: 'text-white', start: 140 },
  { size: '96%', seconds: 80, chip: IndianRupee, tone: 'text-white', start: 250 },
]

/** First screen on phones: what the app is, then Create account / Log in / Try the demo. Hidden from tablet width up. */
export function MobileWelcome() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => { axios.get('/api/auth/session').then((r) => setSignedIn(!!r.data?.user)).catch(() => {}) }, [])

  return (
    <section
      aria-label="Welcome to Mintmind"
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0b0414] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white md:hidden"
    >

      <div className="relative flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><Wallet className="h-5 w-5" aria-hidden /></span>
        <span className="text-base font-semibold tracking-tight">Mintmind</span>
      </div>

      {/* Orbit stage */}
      <div className="relative mx-auto my-6 flex w-full max-w-[22rem] flex-1 items-center justify-center" aria-hidden>
        <div className="relative aspect-square w-full">
          {RINGS.map((r) => (
            <div key={r.size} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: r.size, height: r.size }}>
              <div className="mm-ring-pulse absolute inset-0 rounded-full border border-white/15" />
              <div className="mm-orbit absolute inset-0" style={{ ['--mm-orbit-s' as string]: `${r.seconds}s`, transform: `rotate(${r.start}deg)` }}>
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                  <span className="mm-orbit-rev flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg" style={{ ['--mm-orbit-s' as string]: `${r.seconds}s` }}>
                    <r.chip className={`h-5 w-5 ${r.tone === 'text-white' ? 'text-primary' : 'text-[hsl(85_55%_20%)]'}`} />
                  </span>
                </span>
              </div>
            </div>
          ))}
          <span className="absolute left-[8%] top-[58%] h-3.5 w-3.5 rounded-full bg-[hsl(var(--highlight))]" />
          <span className="absolute right-[6%] top-[22%] h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="absolute bottom-[10%] left-[22%] h-2 w-2 rounded-full bg-white/40" />
          <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-primary shadow-[0_0_60px_rgba(157,0,255,0.6)]">
            <PiggyBank className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="relative">
        <h1 className="text-center text-[2rem] font-semibold leading-tight tracking-tight">Take control of<br />your wealth</h1>
        <p className="mx-auto mt-3 max-w-[20rem] text-center text-sm leading-relaxed text-white/75">Net worth, expenses, investments and family, all in one private place.</p>

        <div className="mt-6 space-y-3">
          {signedIn ? (
            <Link href="/dashboard" className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0414]">Go to dashboard</Link>
          ) : (
            <>
              <Link href="/auth/signin?mode=signup" className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0414]">Create an account</Link>
              <Link href="/auth/signin" className="flex h-12 w-full items-center justify-center rounded-full border border-white/40 text-base font-semibold text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">Log in</Link>
              <div className="flex justify-center text-sm [&_button]:text-white/90"><DemoButton /></div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-white/60">Scroll to see what is inside</p>
      </div>
    </section>
  )
}
