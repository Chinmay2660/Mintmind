'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import LiquidBackground from './LiquidBackground'

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Software Engineer',
    avatar: 'PS',
    content: 'Mintmind completely changed how I track my expenses. The offline mode is a game-changer — I can log transactions on my commute and they sync when I get home.',
    rating: 5,
  },
  {
    name: 'Rahul Mehta',
    role: 'Freelance Designer',
    avatar: 'RM',
    content: 'Finally, a finance app that doesn\'t feel like a spreadsheet. The investment tracking for my FDs and mutual funds is exactly what I needed.',
    rating: 5,
  },
  {
    name: 'Ananya Patel',
    role: 'Marketing Manager',
    avatar: 'AP',
    content: 'We use Mintmind as a family to manage our household budget. The category breakdowns helped us cut unnecessary spending by 20% in two months.',
    rating: 5,
  },
  {
    name: 'Vikram Singh',
    role: 'Startup Founder',
    avatar: 'VS',
    content: 'Clean UI, fast, and free. I tried three other apps before Mintmind and this is the only one I stuck with. The dashboard gives me clarity every morning.',
    rating: 5,
  },
]

const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32 overflow-hidden">
      <LiquidBackground className="opacity-25" />
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-5">
            Loved by{' '}
            <span className="liquid-gradient-text">thousands</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            See what our users have to say about managing their finances with Mintmind.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative flex h-full flex-col liquid-glass liquid-glass-shine rounded-2xl p-6 sm:p-8"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                  >
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </motion.div>
                ))}
              </div>
              <p className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed mb-6 relative z-10">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="mt-auto flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 shrink-0 rounded-full liquid-gradient-bg flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary/20">
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{t.name}</div>
                  <div className="text-xs text-gray-500 leading-tight mt-0.5">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
