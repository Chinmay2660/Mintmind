'use client'
import React from 'react'
import {
  TrendingUp, Lock, UserCheck, FileText, Shield, CreditCard, ArrowRight, ReceiptText, PiggyBank
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import LiquidBackground from './LiquidBackground'
import { useGetStartedHref } from '@/lib/hooks/useGetStartedHref'

const features = [
  {
    icon: TrendingUp,
    title: 'Net Worth Dashboard',
    description: 'See net worth in one place — accounts, investments, loans, and credit cards.',
    className: 'lg:col-span-2 lg:row-span-2',
    gradient: 'from-primary/15 via-blue-500/10 to-transparent',
    large: true,
  },
  {
    icon: ReceiptText,
    title: 'Expense Tracking',
    description: 'Log income and spending, categorize transactions, and see where your money goes.',
    className: 'lg:col-span-1',
    gradient: 'from-amber-500/15 to-transparent',
  },
  {
    icon: PiggyBank,
    title: 'Budgets & Recurring',
    description: 'Set monthly budgets, track subscriptions, and manage salary and recurring bills.',
    className: 'lg:col-span-1',
    gradient: 'from-emerald-500/15 to-transparent',
  },
  {
    icon: Lock,
    title: 'Secure Vault',
    description: 'Store bank passwords and encrypted credentials in one protected place.',
    className: 'lg:col-span-1',
    gradient: 'from-cyan-500/15 to-transparent',
  },
  {
    icon: FileText,
    title: 'Identity Documents',
    description: 'Upload Aadhar, PAN, insurance policies, and loan documents.',
    className: 'lg:col-span-1',
    gradient: 'from-fuchsia-500/15 to-transparent',
  },
  {
    icon: UserCheck,
    title: 'Nominee Access',
    description: 'Designate someone who receives a controlled release of your vault.',
    className: 'lg:col-span-1',
    gradient: 'from-indigo-500/15 to-transparent',
  },
  {
    icon: Shield,
    title: 'Legacy Handoff',
    description: 'Auto-release after inactivity or trigger manually when the time comes.',
    className: 'lg:col-span-1',
    gradient: 'from-primary/15 to-transparent',
    highlight: true,
  },
  {
    icon: CreditCard,
    title: 'Full Picture',
    description: 'Liabilities included — loans and credit card dues subtract from net worth.',
    className: 'lg:col-span-2',
    gradient: 'from-cyan-500/15 via-primary/10 to-transparent',
  },
]

const CTA = () => {
  const getStartedHref = useGetStartedHref()

  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      <LiquidBackground className="opacity-40" />
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-5">
            Net worth first.{' '}
            <span className="liquid-gradient-text">Expenses under control.</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Start with a living net worth dashboard and expense management. Add your vault and nominee when you are ready.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                className={`group relative liquid-glass liquid-glass-shine rounded-2xl p-6 sm:p-8 overflow-hidden ${feature.className}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    className="w-12 h-12 rounded-xl liquid-gradient-bg flex items-center justify-center mb-5 text-white shadow-lg shadow-primary/20"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${feature.large ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-gray-600 dark:text-gray-400 leading-relaxed ${feature.large ? 'text-base' : 'text-sm'}`}>
                    {feature.description}
                  </p>
                  {feature.highlight && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 liquid-pill px-3 py-1 rounded-full">
                      <Shield className="w-3 h-3" />
                      Auditable release
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-20"
        >
          <div className="relative liquid-glass-border rounded-3xl overflow-hidden liquid-glass-shine">
            <div className="absolute inset-0 liquid-gradient-bg opacity-90" />
            <div className="relative z-10 px-8 py-16 sm:px-16 sm:py-20 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-4xl font-bold text-white mb-4"
              >
                Your family should know where everything is.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-white/80 mb-8 max-w-xl mx-auto text-lg"
              >
                Start with net worth and expense tracking. Add your vault and nominee when you need them. Free to start.
              </motion.p>
              <Link href={getStartedHref}>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 py-6 bg-white text-gray-900 hover:bg-gray-100 shadow-xl font-semibold border-0 backdrop-blur-none group"
                >
                  Start Free Today
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA
