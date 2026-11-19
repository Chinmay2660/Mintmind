'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ElementType, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/*
 * Landing page effects, inspired by Magic UI, Aceternity UI, shadcn/ui and HeroUI.
 * Everything is plain Tailwind plus small hooks. All motion switches off for prefers-reduced-motion.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True once the element has scrolled into view (and stays true). */
function useInView<T extends HTMLElement>(margin = '-8% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (reduced() || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, margin])
  return { ref, seen }
}

/** Fades, rises and un-blurs its content when it scrolls into view (Magic UI "blur fade"). */
export function Reveal({ children, delay = 0, className, as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: ElementType }) {
  const { ref, seen } = useInView<HTMLElement>()
  return (
    <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={cn('transition-all duration-700 ease-out motion-reduce:transition-none', seen ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-sm motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0', className)}>
      {children}
    </Tag>
  )
}

/** A list or grid whose direct children rise in one after another, with a pointer-following glow on each card. */
export function StaggerList({ children, className, as: Tag = 'ul', step = 70 }: { children: ReactNode; className?: string; as?: ElementType; step?: number }) {
  const { ref, seen } = useInView<HTMLElement>()
  useEffect(() => {
    const kids = Array.from(ref.current?.children ?? []) as HTMLElement[]
    kids.forEach((k, i) => {
      k.classList.add('fx-spot', 'transition-all', 'duration-700', 'ease-out', 'motion-reduce:transition-none')
      k.style.transitionDelay = `${Math.min(i, 9) * step}ms`
      if (!seen && !reduced()) k.classList.add('translate-y-5', 'opacity-0')
      else k.classList.remove('translate-y-5', 'opacity-0')
    })
  }, [seen, ref, step, children])
  const glow = (e: PointerEvent<HTMLElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.fx-spot')
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--x', `${e.clientX - r.left}px`)
    card.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return <Tag ref={ref} onPointerMove={glow} className={className}>{children}</Tag>
}

/** Counts up to `value` the first time it is visible (Magic UI "number ticker"). */
export function NumberTicker({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>()
  const [n, setN] = useState(reduced() ? value : 0)
  useEffect(() => {
    if (!seen || reduced()) { if (seen) setN(value); return }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 1100, 1)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, value])
  return <span ref={ref} className={cn('tabular-nums', className)}>{n}{suffix}</span>
}

/** Endless sideways strip that pauses on hover or focus (Magic UI "marquee"). The copy is hidden from screen readers. */
export function Marquee({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div role="region" aria-label={label} className={cn('group relative flex overflow-hidden', className)}>
      <div className="flex shrink-0 animate-marquee items-center gap-3 pr-3 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">{children}</div>
      <div aria-hidden className="flex shrink-0 animate-marquee items-center gap-3 pr-3 group-hover:[animation-play-state:paused] motion-reduce:hidden">{children}</div>
    </div>
  )
}

/** Soft drifting colour behind the hero (Aceternity "aurora"). Purely decorative. */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <span className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-primary/25 blur-3xl motion-reduce:animate-none" />
      <span className="absolute -right-20 top-10 h-80 w-80 animate-blob rounded-full bg-highlight/25 blur-3xl [animation-delay:2s] motion-reduce:animate-none" />
      <span className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-chart-4/20 blur-3xl [animation-delay:4s] motion-reduce:animate-none" />
    </div>
  )
}

/** Emphasised text in the brand colour. */
export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-primary', className)}>{children}</span>
}

/** A light that travels around a card's edge (Magic UI "border beam"). */
export function BorderBeam({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl p-px', className)}>
      <span aria-hidden className="absolute -inset-[150%] animate-beam bg-[conic-gradient(from_0deg,transparent_0_290deg,hsl(var(--highlight))_330deg,hsl(var(--primary))_360deg)] motion-reduce:hidden" />
      <div className="relative rounded-[calc(1.5rem-1px)] bg-card">{children}</div>
    </div>
  )
}

/** Primary call to action with a sheen that sweeps across it (Magic UI "shimmer button"). */
export function ShimmerCta({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]', className)}>
      <span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 animate-sheen bg-white/25 motion-reduce:hidden" />
      <span className="relative inline-flex items-center">{children}</span>
    </Link>
  )
}
