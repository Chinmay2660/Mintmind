'use client'

import type { LucideIcon } from 'lucide-react'
import { Edit, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type IconButtonVariant = 'default' | 'destructive' | 'primary'

interface IconButtonProps {
  icon?: LucideIcon
  onClick?: () => void
  variant?: IconButtonVariant
  className?: string
  disabled?: boolean
  tooltip?: string
}

const variants: Record<IconButtonVariant, string> = {
  default:
    'rounded-xl p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  destructive:
    'rounded-xl p-2 text-destructive hover:bg-destructive/10',
  primary: 'rounded-xl p-2 text-primary hover:bg-primary/10',
}

export function IconButton({
  icon: Icon,
  onClick,
  variant = 'default',
  className = '',
  disabled,
  tooltip,
}: IconButtonProps) {
  const label = tooltip

  const button = (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(variants[variant], className)}
      disabled={disabled}
      type="button"
    >
      {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
    </motion.button>
  )

  if (!label) return button

  return (
    <Tooltip content={label} side="top">
      {button}
    </Tooltip>
  )
}

export function EditButton({
  onClick,
  className = '',
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <IconButton
      icon={Edit}
      onClick={onClick}
      variant="default"
      className={className}
      tooltip="Edit"
    />
  )
}

export function DeleteButton({
  onClick,
  className = '',
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <IconButton
      icon={Trash2}
      onClick={onClick}
      variant="destructive"
      className={className}
      tooltip="Delete"
    />
  )
}
