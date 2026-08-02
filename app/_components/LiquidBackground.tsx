'use client'
import { motion } from 'framer-motion'

export default function LiquidBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="liquid-orb liquid-orb-blue -top-40 -left-40 w-[420px] h-[420px]"
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="liquid-orb liquid-orb-cyan top-1/3 -right-32 w-[360px] h-[360px]"
      />
    </div>
  )
}
