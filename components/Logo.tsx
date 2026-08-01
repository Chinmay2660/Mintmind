'use client'

import { Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

interface LogoProps {
  className?: string
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <motion.div
      className={`flex items-center gap-2.5 ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
        <Wallet className="w-5 h-5 text-white" strokeWidth={2.25} />
      </div>
      <span className="text-xl font-bold text-primary">
        Mintmind
      </span>
    </motion.div>
  )
}
