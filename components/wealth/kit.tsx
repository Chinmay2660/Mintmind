'use client'

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Info, Loader2, Minus, Plus } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
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

/** The page's one main "add" action: a labelled button from tablet width up, a floating round button within thumb reach on phones. */
export interface PrimaryAction { label: string; onClick: () => void; disabled?: boolean }

export function PageHeader({ title, description, actions, primaryAction }: { title?: string; description?: string; actions?: ReactNode; primaryAction?: PrimaryAction }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 empty:hidden">
      {(title || description) && (
        <div className="min-w-0">
          {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:[&>*]:flex-1 md:ml-auto">
          {actions}
        </div>
      )}
      {primaryAction && (
        <button type="button" onClick={primaryAction.onClick} disabled={primaryAction.disabled} aria-label={primaryAction.label}
          className="fixed bottom-[calc(var(--mobile-fab-bottom)+4.25rem)] right-4 z-30 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 outline-none transition-transform hover:bg-primary/90 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:bottom-[5.25rem] md:h-12 md:w-auto md:px-5 md:text-sm md:font-semibold print:hidden">
          <Plus className="h-6 w-6 md:h-4 md:w-4" aria-hidden /><span className="hidden md:inline">{primaryAction.label}</span>
        </button>
      )}
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
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-5 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="min-w-0 max-w-full shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', title && 'pt-3', bodyClassName)}>{children}</div>
    </section>
  )
}

/** A small "i" that opens a short explanation. Works with tap, click and keyboard. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" aria-label={`About ${label}`} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Info className="h-3.5 w-3.5" aria-hidden /></button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content side="bottom" align="end" sideOffset={6} collisionPadding={12} className="z-[70] max-w-[16rem] rounded-xl border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-elevated outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">{children}</PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** A figure with a label. Extra explanation goes in `info` (behind an "i"), so every card stays the same height and shape. */
export function Stat({ label, value, hint, info, className }: { label: string; value: ReactNode; hint?: ReactNode; info?: ReactNode; className?: string }) {
  return (
    <div className={cn('surface-card flex min-w-0 flex-col px-4 py-3.5', className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</p>
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <div className="mt-1 flex min-h-7 items-center truncate text-lg font-semibold leading-7 sm:text-xl tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/**
 * One way to show any change or return (gain, XIRR, percentage, day change).
 * Direction is always shown three ways: a sign, an arrow and a tone, so it never depends on colour alone.
 * - positive: up arrow, lime/green; negative: down arrow, red; zero: flat dash, muted
 * - invertGood: for things where lower is better (liabilities, fees), so a fall reads as good news
 * - missing: pass null/undefined with a `hint` such as "Needs a previous NAV"
 */
export function Metric({ amount, pct, invertGood, hint, pill, compact = true, decimals, digits = 1, className }: {
  amount?: number | null; pct?: number | null; invertGood?: boolean; hint?: string; pill?: boolean; compact?: boolean; decimals?: boolean; digits?: number; className?: string
}) {
  const v = amount ?? pct
  if (v == null || Number.isNaN(v)) {
    return <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)} title={hint}><Minus className="h-3.5 w-3.5" aria-hidden />{hint ? <span className="sr-only">{hint}</span> : <span className="sr-only">Not available</span>}</span>
  }
  const flat = Math.abs(v) < (amount != null ? 0.5 : 0.005)
  const good = invertGood ? v < 0 : v > 0
  const Icon = flat ? Minus : v > 0 ? ArrowUp : ArrowDown
  const tone = flat
    ? pill ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'
    : good
      ? pill ? 'bg-highlight text-highlight-foreground' : 'text-success'
      : pill ? 'bg-destructive text-destructive-foreground' : 'text-destructive'
  const sign = flat ? '' : v > 0 ? '+' : '-'
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium leading-none tabular-nums', pill && 'rounded-full px-2 py-0.5 font-semibold', tone, className)} title={hint}>
      {amount != null && <span>{sign}<Money value={Math.abs(amount)} compact={compact} decimals={decimals} /></span>}
      {pct != null && <span>{amount != null ? '(' : sign}{amount != null ? formatPct(pct, digits) : `${Math.abs(pct).toFixed(digits)}%`}{amount != null ? ')' : ''}</span>}
      <Icon className="h-[1.05em] w-[1.05em] shrink-0" strokeWidth={2.5} aria-hidden />
    </span>
  )
}

/** Kept for existing callers: same as Metric. */
export function Delta(props: Parameters<typeof Metric>[0]) { return <Metric {...props} /> }

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
            'rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-9 max-md:px-3.5',
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

// Custom (non-native) dropdown and date picker; same props as <select> / <input type="date">.
export { Select, DateInput } from '@/components/ui/pickers'

export function Progress({ value, tone = 'primary', label }: { value: number; tone?: 'primary' | 'warning' | 'danger'; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', tone === 'primary' && 'bg-primary', tone === 'warning' && 'bg-warning', tone === 'danger' && 'bg-destructive')} style={{ width: `${v}%` }} />
    </div>
  )
}

/**
 * A "how full is it" percentage (card utilisation, budget used). Colour AND a word, never colour alone.
 * Default bands suit credit utilisation: up to 30% healthy, up to 50% watch, above that high.
 */
export function UsagePct({ value, warnAt = 30, highAt = 50, className }: { value: number; warnAt?: number; highAt?: number; className?: string }) {
  const level = value > highAt ? 'high' : value > warnAt ? 'watch' : 'healthy'
  const tone = level === 'high' ? 'text-destructive' : level === 'watch' ? 'text-warning' : 'text-success'
  return <span className={cn('font-medium tabular-nums', tone, className)}>{value}%<span className="sr-only"> ({level})</span></span>
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
