'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

/** Mintmind slider: replaces the browser's range input. Drag, tap the track, or use arrow / Home / End / Page keys. */
export function Slider({ id, value, min, max, step = 1, onChange, className, 'aria-label': ariaLabel, valueText }: {
  id?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
  valueText?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min)
  const pct = max === min ? 0 : ((clamp(value) - min) / (max - min)) * 100

  const fromPointer = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const next = snap(min + ((e.clientX - r.left) / r.width) * (max - min))
    if (next !== value) onChange(Number(next.toFixed(6)))
  }
  const onKey = (e: KeyboardEvent) => {
    const big = Math.max(step, (max - min) / 10)
    const map: Record<string, number> = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, PageUp: value + big, PageDown: value - big, Home: min, End: max }
    if (!(e.key in map)) return
    e.preventDefault()
    onChange(Number(snap(map[e.key]).toFixed(6)))
  }

  return (
    <div
      ref={track}
      className={cn('relative flex h-8 w-full touch-none cursor-pointer select-none items-center', className)}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e) }}
    >
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div
        id={id}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        onKeyDown={onKey}
        className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-card outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-ring/30"
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}
