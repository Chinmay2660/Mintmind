'use client'

import { useId, useMemo, useState } from 'react'
import { Area, AreaChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

export interface GrowwPoint {
  /** what the point is called when it is touched: a date, a month, "Yr 5" */
  x: string
  /** null for a stretch with no value yet (the rest of the month): the line stops there */
  y: number | null
  /** an optional second line, drawn dashed (what you put in, against what it is worth) */
  y2?: number
}

const UP = 'hsl(var(--chart-up, var(--success)))'
const DOWN = 'hsl(var(--destructive))'

/**
 * The one chart style for a value over time, after an investing app: a single smooth line with a soft fill, no axes or grid,
 * an end marker, and a readout when you touch or hover. Green when it ends higher than it began, red when lower.
 * Wherever a figure is plotted over time, this is what draws it.
 */
export function GrowwChartImpl({ data, format, height = 160, tone = 'auto', zero = false, secondLabel, ariaLabel, onHover, readout = true, className }: {
  data: GrowwPoint[]
  /** how a value reads, e.g. as rupees; it should hide the figure when balances are hidden */
  format: (v: number) => string
  height?: number
  /** 'auto' follows the direction; 'neutral' keeps one colour (a projection is not good or bad) */
  tone?: 'auto' | 'neutral'
  /** draw a dashed line at zero (a balance that could go negative) */
  zero?: boolean
  secondLabel?: string
  ariaLabel: string
  /** told about the touched point (or null), for pages that show their own readout above the chart */
  onHover?: (p: GrowwPoint | null) => void
  /** the small readout drawn inside the chart while touching; turn off when the page shows its own */
  readout?: boolean
  className?: string
}) {
  const gid = 'gc' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState<GrowwPoint | null>(null)

  const { color, domain } = useMemo(() => {
    const ys = data.flatMap((d) => [...(d.y != null ? [d.y] : []), ...(d.y2 != null ? [d.y2] : [])])
    const lo = Math.min(...ys, zero ? 0 : Infinity), hi = Math.max(...ys, zero ? 0 : -Infinity)
    const pad = Math.max(1, (hi - lo) * 0.12)
    const have = data.filter((d) => d.y != null) as { y: number }[]
    const up = have.length < 2 || have[have.length - 1].y >= have[0].y
    return { color: tone === 'neutral' ? 'hsl(var(--primary))' : up ? UP : DOWN, domain: [lo - pad, hi + pad] as [number, number] }
  }, [data, tone, zero])

  if (data.length < 2) return <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>Not enough history yet.</p>
  const last = data.reduce((n, d, i) => (d.y != null ? i : n), 0)
  // the chart library reports which point is under the finger as an index (it no longer hands over the point itself)
  const track = (st: any) => { const i = Number(st?.activeTooltipIndex); const pt = Number.isInteger(i) ? data[i] : undefined; if (pt) move(pt) }
  const move = (pt: GrowwPoint | null) => { setHover((cur) => (cur?.x === pt?.x ? cur : pt)); onHover?.(pt) }

  return (
    <div className={cn('relative select-none', className)} style={{ height }} role="img" aria-label={ariaLabel}>
      {readout && hover && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 rounded-md bg-card/90 px-2 py-1 text-xs shadow-card backdrop-blur" aria-live="polite">
          <span className="text-muted-foreground">{hover.x}</span> {hover.y != null && <span className="font-semibold tabular-nums">{format(hover.y)}</span>}
          {hover.y2 != null && secondLabel && <span className="ml-2 text-muted-foreground">{secondLabel} <span className="tabular-nums">{format(hover.y2)}</span></span>}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 6 }}
          onMouseMove={track} onTouchMove={track} onMouseLeave={() => move(null)} onTouchEnd={() => move(null)}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.22} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="x" hide />
          <YAxis hide domain={domain} />
          <Tooltip content={() => null} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.6 }} />
          {zero && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeOpacity={0.7} />}
          {data.some((d) => d.y2 != null) && <Line type="monotone" dataKey="y2" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />}
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" fill={`url(#${gid})`} isAnimationActive={false}
            dot={(dp: any) => (dp.index === last && !hover
              ? <g key="end"><circle cx={dp.cx} cy={dp.cy} r={7} fill={color} fillOpacity={0.18} /><circle cx={dp.cx} cy={dp.cy} r={3.5} fill={color} stroke="hsl(var(--card))" strokeWidth={1.5} /></g>
              : <g key={dp.index} />)}
            activeDot={{ r: 4.5, fill: color, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
