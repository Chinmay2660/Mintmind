import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color?: string
  className?: string
}

export function TagBadge({ name, color = '#6366f1', className }: TagBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      #{name}
    </span>
  )
}
