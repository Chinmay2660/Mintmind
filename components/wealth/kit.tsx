'use client'

import { useId, useRef, useState, type FormEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatPct } from '@/lib/wealth/format'
import { Money } from './Money'
import { FormGrid } from '@/components/ui/layout'

/** Chart colours come from CSS variables, so every chart follows the active theme. */
export const chartColor = (n: 1 | 2 | 3 | 4 | 5 | 6) => `hsl(var(--chart-${n}))`
export const CHART_PALETTE = [1, 2, 3, 4, 6, 5].map((n) => chartColor(n as 1))
export const chartGrid = 'hsl(var(--chart-grid))'
export const chartAxis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 12, tickLine: false, axisLine: false } as const
export const chartTooltipStyle = {
  wrapperStyle: { zIndex: 50, outline: 'none' },
  contentStyle: {
    background: 'hsl(var(--popover))',
    opacity: 1,
    boxShadow: 'var(--shadow-elevated)',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
  itemStyle: { color: 'hsl(var(--popover-foreground))' },
} as const

export function PageHeader({ title, description, actions }: { title?: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('surface-card min-w-0', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5', title && 'pt-3', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('surface-card px-4 py-3.5', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight">{value}</p>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function Delta({ amount, pct, className }: { amount?: number | null; pct?: number | null; className?: string }) {
  if (amount == null && pct == null) return <span className="text-xs text-muted-foreground">—</span>
  const v = amount ?? pct ?? 0
  const up = v >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-success' : 'text-destructive', className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {amount != null && <Money value={Math.abs(amount)} compact />}
      {pct != null && <span>({formatPct(pct, 1)})</span>}
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RangeTabs({ value, onChange, options, label = 'Range' }: { value: string; onChange: (v: any) => void; options: readonly string[]; label?: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Progress({ value, tone = 'primary', label }: { value: number; tone?: 'primary' | 'warning' | 'danger'; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', tone === 'primary' && 'bg-primary', tone === 'warning' && 'bg-warning', tone === 'danger' && 'bg-destructive')} style={{ width: `${v}%` }} />
    </div>
  )
}

export const toneForPct = (p: number) => (p >= 90 ? 'danger' : p >= 70 ? 'warning' : 'primary')

interface FormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  onSubmit: () => Promise<void> | void
  children: ReactNode
  wide?: boolean
}

/** Standard create/edit modal: native validation, busy state, error toast. */
export function FormDialog({ open, onOpenChange, title, description, submitLabel = 'Save', onSubmit, children, wide }: FormDialogProps) {
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : 'sr-only'}>{description || title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormGrid>{children}</FormGrid>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export interface FormStep { title: string; description?: string; content: ReactNode }

/**
 * A long form split into short steps. One step is on screen at a time, "Next" checks that step's fields first,
 * and the last step saves. State stays in the parent form, so going Back never loses what was typed.
 * Use instead of FormDialog when a form has more than about 6 fields.
 */
export function StepFormDialog({ open, onOpenChange, title, steps, submitLabel = 'Save', onSubmit, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; steps: FormStep[]; submitLabel?: string; onSubmit: () => Promise<void>; wide?: boolean
}) {
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const last = i === steps.length - 1
  const cur = steps[i]

  const stepValid = () => {
    const bad = Array.from(body.current?.querySelectorAll<HTMLInputElement>('input, select, textarea') ?? []).find((el) => !el.checkValidity())
    if (bad) { bad.reportValidity(); return false }
    return true
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stepValid()) return
    if (!last) return setI(i + 1)
    setBusy(true)
    try { await onSubmit(); onOpenChange(false) } catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong') } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Step {i + 1} of {steps.length}: {cur.title}</DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-2" aria-label="Progress">
          {steps.map((st, n) => (
            <li key={st.title} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none" aria-current={n === i ? 'step' : undefined}>
              <button type="button" disabled={n > i} onClick={() => setI(n)} aria-label={`Step ${n + 1}: ${st.title}`}
                className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  n < i ? 'border-primary bg-primary text-primary-foreground' : n === i ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>
                {n < i ? <Check className="h-3.5 w-3.5" /> : n + 1}
              </button>
              {n < steps.length - 1 && <span aria-hidden className={cn('h-0.5 flex-1 rounded-full', n < i ? 'bg-primary' : 'bg-border')} />}
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="space-y-4">
          <div><p className="text-xs text-muted-foreground">Step {i + 1} of {steps.length}</p><h3 className="text-base font-semibold">{cur.title}</h3>{cur.description && <p className="mt-0.5 text-sm text-muted-foreground">{cur.description}</p>}</div>
          <div ref={body}><FormGrid>{cur.content}</FormGrid></div>
          <DialogFooter className="gap-2 sm:justify-between sm:gap-0 sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => (i === 0 ? onOpenChange(false) : setI(i - 1))}>{i === 0 ? 'Cancel' : 'Back'}</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{last ? submitLabel : 'Next'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function LoadingBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className ?? 'h-32')} aria-busy="true" aria-label="Loading" />
}

export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
