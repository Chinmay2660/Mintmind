'use client'
import { motion } from 'framer-motion'

export default function LiquidBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="liquid-orb liquid-orb-blue -top-32 -left-32 w-[500px] h-[500px]"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="liquid-orb liquid-orb-cyan top-1/4 -right-40 w-[450px] h-[450px]"
      />
      <motion.div
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 30, 0], scale: [1, 1.05, 0.92, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="liquid-orb liquid-orb-fuchsia bottom-0 left-1/3 w-[400px] h-[400px]"
      />
      <motion.div
        animate={{ x: [0, -25, 25, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="liquid-orb liquid-orb-indigo bottom-1/4 right-1/4 w-[300px] h-[300px] opacity-60"
      />
    </div>
  )
}
