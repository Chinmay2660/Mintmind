'use client'
import React from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import LiquidBackground from './LiquidBackground'
import { ContactLink } from './Contact'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Support: [
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ],
}

const Footer = () => {
  return (
    <footer className="relative text-gray-400 overflow-hidden">
      <div className="absolute inset-0 bg-gray-950" />
      <LiquidBackground className="opacity-30" />
      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="py-16 grid grid-cols-2 md:grid-cols-3 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              The modern way to track, plan, and grow your personal finances. Free forever.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { icon: Mail, href: 'mailto:chinmaybhoir.dev@gmail.com', label: 'Email' },
              ].map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl liquid-glass flex items-center justify-center transition-colors hover:text-white"
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href === '#contact' ? (
                      <ContactLink className="text-sm hover:text-white transition-colors hover:translate-x-1 inline-block">
                        {link.label}
                      </ContactLink>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm hover:text-white transition-colors hover:translate-x-1 inline-block"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Mintmind. All rights reserved.
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm text-gray-500"
          >
            Built with care for your financial future.
          </motion.p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
