'use client'

import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface FABProps {
  onClick: () => void
  label: string
  className?: string
}

export function FAB({ onClick, label, className = '' }: FABProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      className={`md:hidden fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center ${className}`}
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  )
}
