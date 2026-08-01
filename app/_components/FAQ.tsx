'use client'
import React, { useState } from 'react'
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LiquidBackground from './LiquidBackground'
import { ContactLink } from './Contact'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'What is Mintmind?',
      answer: 'A personal finance app to track expenses, accounts, investments, and budgets — with offline support.',
    },
    {
      question: 'Is it free?',
      answer: 'Yes. Mintmind is free with no limits on expenses, accounts, or investments.',
    },
    {
      question: 'How secure is my data?',
      answer: 'We use encryption and Google OAuth sign-in. Your financial data is never shared with third parties.',
    },
    {
      question: 'Does it work offline?',
      answer: 'Yes. Log transactions and view dashboards offline; changes sync when you reconnect.',
    },
    {
      question: 'How do I get started?',
      answer: 'Click "Get Started", sign in with Google, and add your first account or transaction.',
    },
  ]

  return (
    <section id="faq" className="relative py-16 sm:py-20 overflow-hidden">
      <LiquidBackground className="opacity-20" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8"
        >
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl liquid-glass mb-4"
          >
            <HelpCircle className="w-6 h-6 text-primary" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            FAQ
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Quick answers about Mintmind.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                layout
              >
                <motion.div
                  layout
                  className={`rounded-2xl overflow-hidden transition-shadow duration-300 ${
                    isOpen
                      ? 'liquid-glass-border liquid-glass shadow-lg shadow-primary/10'
                      : 'liquid-glass hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isOpen
                          ? 'liquid-gradient-bg text-white'
                          : 'bg-white/30 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-0">
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <MessageCircle className="inline w-4 h-4 text-primary mr-1 align-text-bottom" />
          More questions?{' '}
          <ContactLink className="text-primary font-medium hover:underline">
            Contact us
          </ContactLink>
        </p>
      </div>
    </section>
  )
}

export default FAQ
