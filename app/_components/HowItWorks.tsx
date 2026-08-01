'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { UserPlus, LayoutDashboard, TrendingUp } from 'lucide-react'
import LiquidBackground from './LiquidBackground'

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Sign up in seconds',
    description: 'Create your free account with Google. No credit card, no hassle — you\'re in within 30 seconds.',
  },
  {
    icon: LayoutDashboard,
    step: '02',
    title: 'Set up your finances',
    description: 'Add bank accounts, create categories, and import your first transactions. Our guided setup makes it effortless.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Watch your wealth grow',
    description: 'Track spending, hit budget goals, and monitor investments with real-time dashboards and insights.',
  },
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 overflow-hidden">
      <LiquidBackground className="opacity-30" />
      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-5">
            Three steps to{' '}
            <span className="liquid-gradient-text">financial clarity</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Getting started with Mintmind is simple. You&apos;ll be tracking your finances in under a minute.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 50, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: index * 0.15 }}
                className="relative text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 2 }}
                  className="relative mx-auto w-20 h-20 rounded-2xl liquid-gradient-bg flex items-center justify-center shadow-xl shadow-primary/30 mb-6"
                >
                  <Icon className="w-9 h-9 text-white" />
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.15, type: 'spring' }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full liquid-glass text-primary text-xs font-bold flex items-center justify-center"
                  >
                    {item.step}
                  </motion.span>
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
