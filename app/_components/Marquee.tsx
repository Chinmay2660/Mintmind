'use client'
import React from 'react'
import { motion } from 'framer-motion'

const items = [
  'Expense Tracking',
  'Budget Planning',
  'Investment Portfolio',
  'Offline Mode',
  'Multi-Account',
  'Visual Analytics',
  'Category Management',
  'Family Sharing',
  'Recurring Bills',
  'PWA Ready',
]

const Marquee = () => {
  const doubled = [...items, ...items]

  return (
    <section className="relative py-6 overflow-hidden border-y border-border bg-muted/30">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/40 dark:from-gray-950/40 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/40 dark:from-gray-950/40 to-transparent z-10" />
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="mx-6 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-6"
          >
            {item}
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-cyan-500"
            />
          </span>
        ))}
      </div>
    </section>
  )
}

export default Marquee
