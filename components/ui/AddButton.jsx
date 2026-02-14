'use client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function AddButton({ children, onClick, className = '', ...props }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={onClick}
        className={`bg-primary hover:bg-primary/90 shadow-lg rounded-full p-3 md:px-4 md:py-2 transition-all ${className}`}
        size="sm"
        {...props}
      >
        <Plus className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
        <span className="hidden md:inline">{children}</span>
      </Button>
    </motion.div>
  )
}

