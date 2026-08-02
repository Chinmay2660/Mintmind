'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check, Sparkles, TrendingUp, Wallet, PieChart, LayoutDashboard, Receipt, Target } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import LiquidBackground from './LiquidBackground'
import { useGetStartedHref } from '@/lib/hooks/useGetStartedHref'

function DashboardMock() {
  const bars = [
    { label: 'Food', h: '65%', color: 'from-blue-500 to-blue-400' },
    { label: 'Travel', h: '45%', color: 'from-cyan-500 to-cyan-400' },
    { label: 'Bills', h: '80%', color: 'from-fuchsia-500 to-fuchsia-400' },
    { label: 'Shop', h: '35%', color: 'from-indigo-500 to-indigo-400' },
    { label: 'Other', h: '55%', color: 'from-blue-400 to-indigo-400' },
  ]

  const budgets = [
    { name: 'Groceries', spent: 72, color: 'from-emerald-500 to-cyan-500' },
    { name: 'Entertainment', spent: 45, color: 'from-blue-500 to-indigo-500' },
    { name: 'Transport', spent: 88, color: 'from-amber-500 to-fuchsia-500' },
  ]

  const innerCard = 'rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/60'

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-5 min-h-[320px] sm:min-h-[380px]">
      <div className="flex gap-3 h-full">
        <div className="hidden sm:flex flex-col gap-2 w-12 shrink-0">
          {[LayoutDashboard, Receipt, Target, Wallet].map((Icon, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                i === 0
                  ? 'liquid-gradient-bg text-white shadow-md'
                  : `${innerCard} text-gray-400`
              }`}
            >
              <Icon className="w-4 h-4" />
            </motion.div>
          ))}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Good morning</p>
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Your finances</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              On track
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Balance', value: '₹1.2L', icon: Wallet },
              { label: 'Spent', value: '₹24K', icon: Receipt },
              { label: 'Saved', value: '₹8.5K', icon: TrendingUp },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`${innerCard} p-2.5 sm:p-3`}
              >
                <card.icon className="w-3.5 h-3.5 text-primary mb-1" />
                <p className="text-[10px] text-gray-500">{card.label}</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{card.value}</p>
              </motion.div>
            ))}
          </div>

          <div className={`${innerCard} p-3`}>
            <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">Monthly spending</p>
            <div className="flex items-end justify-between gap-1.5 h-24">
              {bars.map((bar, i) => (
                <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: bar.h }}
                    transition={{ delay: 0.8 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-full rounded-t-md bg-gradient-to-t ${bar.color}`}
                  />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${innerCard} p-3 space-y-2.5`}>
            {budgets.map((b, i) => (
              <div key={b.name}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{b.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{b.spent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.spent}%` }}
                    transition={{ delay: 1.2 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-full rounded-full bg-gradient-to-r ${b.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const insightStats = [
  { icon: TrendingUp, label: '+12.4%', sub: 'Portfolio growth' },
  { icon: Wallet, label: '₹2.4L', sub: 'Monthly savings' },
  { icon: PieChart, label: '8 categories', sub: 'Auto-tracked' },
]

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const numeric = parseInt(value.replace(/\D/g, ''), 10)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const duration = 2000
        const startTime = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * numeric))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [numeric])

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}

const headlineWords = ['Your', 'money,']

const Hero = () => {
  const getStartedHref = useGetStartedHref()
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  const stats = [
    { value: '10K', suffix: '+', label: 'Active Users' },
    { value: '50K', suffix: '+', label: 'Transactions' },
    { value: '95', suffix: '%', label: 'Satisfaction' },
  ]

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-40" />
      <LiquidBackground />

      <motion.div style={{ y, opacity, scale }} className="relative w-full pt-below-header pb-16 sm:pb-20">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-pill text-primary text-sm font-medium mb-8"
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <span>Personal finance, reimagined for 2026</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1] mb-6">
                {headlineWords.map((word, i) => (
                  <motion.span
                    key={word}
                    initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block mr-3"
                  >
                    {word}
                  </motion.span>
                ))}
                <motion.span
                  initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="block mt-1 liquid-gradient-text"
                >
                  crystal clear.
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-lg"
              >
                Track expenses, manage accounts, monitor investments, and build wealth — all in one beautifully designed app that works offline.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link href={getStartedHref}>
                  <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 rounded-full liquid-btn border-0 text-white group">
                    Start Free Today
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 rounded-full liquid-glass border-white/30 hover:bg-white/20 dark:hover:bg-white/5">
                    View Demo
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.65 }}
                className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400"
              >
                {['Free forever', 'No credit card', 'Works offline'].map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span>{f}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.75 }}
                className="mt-12 grid grid-cols-3 gap-4 max-w-md"
              >
                {stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4 }}
                    className="liquid-glass rounded-2xl p-3 sm:p-4 text-center sm:text-left"
                  >
                    <div className="text-2xl sm:text-3xl font-bold liquid-gradient-text">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              <div className="liquid-glass-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <div className="p-2.5 bg-gray-200/80 dark:bg-gray-800/80 flex gap-2 items-center border-b border-gray-300/50 dark:border-gray-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 mx-4 h-6 rounded-md bg-white/60 dark:bg-gray-900/60 text-[10px] text-gray-400 flex items-center justify-center">
                    app.mintmind.com/dashboard
                  </div>
                </div>
                <DashboardMock />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {insightStats.map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      className="flex items-center gap-2 sm:gap-3 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/60 px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg liquid-gradient-bg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{stat.label}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{stat.sub}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default Hero
