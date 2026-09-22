'use client'

import { cn } from '@/lib/utils'

interface AllocationSegment {
  label: string
  value: number
  color: string
}

interface AllocationBarProps {
  segments: AllocationSegment[]
  className?: string
  showLegend?: boolean
}

export function AllocationBar({
  segments,
  className,
  showLegend = true,
}: AllocationBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  if (total <= 0) {
    return (
      <div className={cn('h-2 w-full rounded-full bg-muted/60', className)} />
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
        {segments.map((seg) => {
          const pct = (Math.max(0, seg.value) / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={seg.label}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${pct.toFixed(0)}%`}
            />
          )
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span>{seg.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
