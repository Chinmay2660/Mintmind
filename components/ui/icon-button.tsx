'use client'

import type { LucideIcon } from 'lucide-react'
import { Edit, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type IconButtonVariant = 'default' | 'destructive' | 'primary'

interface IconButtonProps {
  icon?: LucideIcon
  onClick?: () => void
  variant?: IconButtonVariant
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

const variants: Record<IconButtonVariant, string> = {
  default: 'p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 text-muted-foreground',
  destructive: 'p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400',
  primary: 'p-2 rounded-lg hover:bg-primary/10 text-primary',
}

export function IconButton({
  icon: Icon,
  onClick,
  variant = 'default',
  className = '',
  disabled,
  'aria-label': ariaLabel,
}: IconButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(variants[variant], className)}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
    >
      {Icon && <Icon className="w-4 h-4" />}
    </motion.button>
  )
}

export function EditButton({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  return <IconButton icon={Edit} onClick={onClick} variant="default" className={className} />
}

export function DeleteButton({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  return <IconButton icon={Trash2} onClick={onClick} variant="destructive" className={className} />
}
