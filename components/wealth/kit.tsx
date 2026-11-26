'use client'

import { useBackToClose } from '@/lib/hooks/useBackToClose'
import { toastProblem } from '@/lib/notify'
import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Info, Loader2, Minus, Plus } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { usePageInfo } from '@/components/shell/DetailCrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatPct } from '@/lib/wealth/format'
import { metricTone } from '@/lib/wealth/tone'
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

export function PageHeader({ title, description, actions, primaryAction, secondaryAction }: { title?: string; description?: string; actions?: ReactNode; primaryAction?: PrimaryAction; /** a second floating button, stacked above the first */ secondaryAction?: PrimaryAction }) {
  // with no title here, the explanation goes to the top bar (beside the page name) instead of taking a row of its own
  usePageInfo(!title ? description : undefined)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <>
      {/* a header with only floating buttons has no row to draw: the buttons go to the page body, so they leave no empty gap in the page's spacing */}
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
        {title && (
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="retro-title text-xl font-semibold tracking-tight paper:text-[1.75rem] paper:font-bold paper:leading-tight">{title}</h2>
            {description && <InfoTip label={title}>{description}</InfoTip>}
          </div>
        )}
        {/* The explanation lives behind an "i", so it takes no row of its own. With no title it sits beside the actions. */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:[&>*]:flex-1 md:ml-auto">
            {actions}
          </div>
        )}
        </div>
      )}
      {mounted && createPortal(
        <>
          {secondaryAction && (
            <button type="button" onClick={secondaryAction.onClick} disabled={secondaryAction.disabled} aria-label={secondaryAction.label}
              className="fab fixed bottom-[calc(var(--mobile-fab-bottom)+8.5rem)] right-4 z-30 flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 outline-none transition-transform hover:bg-primary/90 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:bottom-[8.75rem] md:px-5 paper:border paper:border-[hsl(var(--edge))] paper:shadow-[1.5px_3px_0_0_hsl(var(--drop))] print:hidden">
              <Plus className="h-4 w-4" /><span>{secondaryAction.label}</span>
            </button>
          )}
          {primaryAction && (
            <button type="button" onClick={primaryAction.onClick} disabled={primaryAction.disabled} aria-label={primaryAction.label}
              className="fab fixed bottom-[calc(var(--mobile-fab-bottom)+4.25rem)] right-4 z-30 flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 outline-none transition-transform hover:bg-primary/90 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:bottom-[5.25rem] md:px-5 paper:border paper:border-[hsl(var(--edge))] paper:shadow-[1.5px_3px_0_0_hsl(var(--drop))] print:hidden">
              <Plus className="h-4 w-4" /><span>{primaryAction.label}</span>
            </button>
          )}
        </>,
        document.body,
      )}
    </>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flat = false,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** No box, just a heading and a line. For minor sections such as groups of settings; the main content sections keep their card. */
  flat?: boolean
}) {
  const card = !flat
  return (
    <section className={cn('min-w-0', card && 'surface-card', className)}>
      {(title || action) && (
        <header className={cn('flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1', card ? 'px-5 pt-4' : 'border-b border-border pb-2.5')}>
          <div className="flex min-w-0 items-center gap-1.5">
            {title && <h3 className="flex items-center gap-2 text-base font-semibold">{title}</h3>}
            {title && description && <InfoTip label={typeof title === 'string' ? title : 'this section'}>{description}</InfoTip>}
          </div>
          {action && <div className="min-w-0 max-w-full shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(card ? 'p-5' : title ? 'pt-3.5' : '', card && title && 'pt-3', bodyClassName)}>{children}</div>
    </section>
  )
}

/** A small "i" with a short explanation. It opens on hover, and on tap, click or Enter. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 120) }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" aria-label={`About ${label}`} onPointerEnter={(e) => { if (e.pointerType === 'mouse') show() }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') hide() }}
          className="relative inline-flex h-5 w-5 shrink-0 translate-y-px [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-3 [@media(pointer:coarse)]:before:content-[''] paper:-translate-y-0.5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Info className="h-3.5 w-3.5" /></button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content side="bottom" align="end" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()} onPointerEnter={show} onPointerLeave={hide}
          className="z-[70] max-w-[16rem] rounded-xl border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-elevated outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">{children}</PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** A note kept out of the way: a small "i" on its own line, with the text on hover, focus or tap. */
export function FootNote({ children, className, label = 'Note' }: { children: ReactNode; className?: string; label?: string }) {
  return <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}><InfoTip label={label}>{children}</InfoTip><span>{label}</span></div>
}

/** A figure with a label. Extra explanation goes in `info` (behind an "i"), so every card stays the same height and shape. */
export function Stat({ label, value, hint, info, className }: { label: string; value: ReactNode; hint?: ReactNode; info?: ReactNode; className?: string }) {
  return (
    <div className={cn('surface-card flex min-w-0 flex-col px-4 py-3.5', className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-muted-foreground paper:text-[11px] paper:tracking-[0.08em]">{label}</p>
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <div className="mt-1 flex min-h-7 items-center truncate text-lg font-semibold leading-7 sm:text-xl tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/**
 * One way to show any change or return (gain, percentage, day change).
 * Direction is always shown three ways: a sign, an arrow and a tone, so it never depends on colour alone.
 * - positive: up arrow, lime/green; negative: down arrow, red; zero: flat dash, muted
 * - invertGood: for things where lower is better (liabilities, fees), so a fall reads as good news
 * - missing: pass null/undefined with a `hint` such as "Needs a previous NAV"
 */
export function Metric({ amount, pct, invertGood, hint, pill, compact = true, decimals, digits = 1, arrow = true, className }: {
  amount?: number | null; pct?: number | null; invertGood?: boolean; hint?: string; pill?: boolean; compact?: boolean; decimals?: boolean; digits?: number; arrow?: boolean; className?: string
}) {
  const v = amount ?? pct
  const t = metricTone({ amount, pct, invertGood })
  if (t.state === 'none' || v == null) {
    return <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)} title={hint}><Minus className="h-3.5 w-3.5" />{hint ? <span className="sr-only">{hint}</span> : <span className="sr-only">Not available</span>}</span>
  }
  const flat = t.state === 'flat'
  const good = t.state === 'good'
  const Icon = flat ? Minus : t.dir > 0 ? ArrowUp : ArrowDown
  const tone = flat
    ? pill ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'
    : good
      ? pill ? 'border border-success/40 bg-success/10 text-success' : 'text-success'
      : pill ? 'border border-destructive/40 bg-destructive/10 text-destructive' : 'text-destructive'
  const sign = t.sign
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium leading-none tabular-nums', pill && 'rounded-full px-2 py-0.5 font-semibold', tone, className)} title={hint}>
      {amount != null && <span>{sign}<Money value={Math.abs(amount)} compact={compact} decimals={decimals} /></span>}
      {pct != null && <span>{amount != null ? '(' : sign}{amount != null ? formatPct(pct, digits) : `${Math.abs(pct).toFixed(digits)}%`}{amount != null ? ')' : ''}</span>}
      {arrow && <Icon className="h-[1.05em] w-[1.05em] shrink-0" strokeWidth={2.5} aria-hidden />}
    </span>
  )
}

/** Kept for existing callers: same as Metric. */
export function Delta(props: Parameters<typeof Metric>[0]) { return <Metric {...props} /> }

export function RangeTabs({ value, onChange, options, label = 'Range' }: { value: string; onChange: (v: any) => void; options: readonly string[]; label?: string }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-10 max-md:px-3.5',
            value === o ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string; optional?: boolean }) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      {/* the help text sits behind an "i" beside the label, so fields in a row always line up */}
      <div className="flex h-5 items-center gap-1.5">
        <label htmlFor={id} className="min-w-0 truncate text-sm font-medium" title={label}>{label}</label>
        {hint && <span className="shrink-0"><InfoTip label={label}>{hint}</InfoTip></span>}
      </div>
      {children(id)}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// Custom (non-native) dropdown and date picker; same props as <select> / <input type="date">.
export { Select, DateInput } from '@/components/ui/pickers'
import { FIELD_EVENT } from '@/components/ui/pickers'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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

/** Bar colour for a budget or other limit that should not be passed: amber from 70%, red from 90%. */
export const toneForPct = (p: number) => (p >= 90 ? 'danger' : p >= 70 ? 'warning' : 'primary')
/** Bar colour for credit-card utilisation. Same bands as <UsagePct> (30% and 50%), so the bar and the number always agree. */
export const toneForCredit = (p: number) => (p > 50 ? 'danger' : p > 30 ? 'warning' : 'primary')

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
// every Field inside the children, looking through fragments
/** The fields of a form, all in view. */
export function FormFields({ children }: { children: ReactNode }) {
  return <FormGrid>{children}</FormGrid>
}

/**
 * Closing a form that has unsaved changes asks first. Every way out goes through it: Cancel, tapping outside, Esc, a swipe down and the
 * browser's Back. Typing marks the form as changed, and so does picking a value in one of the app's pickers.
 */
function useDiscardGuard(open: boolean, onOpenChange: (o: boolean) => void) {
  const [dirty, setDirty] = useState(false)
  const [ask, setAsk] = useState(false)
  useEffect(() => {
    if (!open) { setDirty(false); setAsk(false); return }
    const on = () => setDirty(true)
    window.addEventListener(FIELD_EVENT, on)
    return () => window.removeEventListener(FIELD_EVENT, on)
  }, [open])
  const request = (o: boolean) => { if (!o && dirty) setAsk(true); else onOpenChange(o) }
  const bind = { onInputCapture: () => setDirty(true), onChangeCapture: () => setDirty(true) }
  const confirm = <ConfirmDialog open={ask} onOpenChange={setAsk} title="Discard your changes?" description="What you entered here has not been saved." confirmLabel="Discard" variant="destructive" onConfirm={() => { setAsk(false); onOpenChange(false) }} />
  return { request, bind, confirm }
}

export function FormDialog({ open, onOpenChange, title, description, submitLabel = 'Save', onSubmit, children, wide }: FormDialogProps) {
  const guard = useDiscardGuard(open, onOpenChange)
  useBackToClose(open, () => guard.request(false))
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit()
      onOpenChange(false)
    } catch (err) {
      toastProblem(err, 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  return (
    <><Dialog open={open} onOpenChange={guard.request}>
      <DialogContent className={wide ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          {/* the explanation sits behind an "i" beside the title; screen readers still get it as the description */}
          <div className="flex items-center gap-2"><DialogTitle>{title}</DialogTitle>{description && <InfoTip label={title}>{description}</InfoTip>}</div>
          <DialogDescription className="sr-only">{description || title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" {...guard.bind}>
          <FormFields>{children}</FormFields>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => guard.request(false)}>
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
    {guard.confirm}</>
  )
}

export interface FormStep { title: string; description?: string; content: ReactNode }

/**
 * A long form split into short steps. One step is on screen at a time, "Next" checks that step's fields first,
 * and the last step saves. State stays in the parent form, so going Back never loses what was typed.
 * Use instead of FormDialog when a form has more than about 6 fields.
 */
export function StepFormDialog({ open, onOpenChange, title, description, steps, submitLabel = 'Save', onSubmit, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; steps: FormStep[]; submitLabel?: string; onSubmit: () => Promise<void>; wide?: boolean
}) {
  const guard = useDiscardGuard(open, onOpenChange)
  useBackToClose(open, () => guard.request(false))
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
    try { await onSubmit(); onOpenChange(false) } catch (err) { toastProblem(err, 'Something went wrong') } finally { setBusy(false) }
  }

  return (
    <><Dialog open={open} onOpenChange={guard.request}>
      <DialogContent className={wide ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <div className="flex items-center gap-2"><DialogTitle>{title}</DialogTitle>{description && <InfoTip label={title}>{description}</InfoTip>}</div>
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

        <form onSubmit={submit} className="space-y-4" {...guard.bind}>
          <div><p className="text-xs text-muted-foreground">Step {i + 1} of {steps.length}</p><div className="flex items-center gap-2"><h3 className="text-base font-semibold">{cur.title}</h3>{cur.description && <InfoTip label={cur.title}>{cur.description}</InfoTip>}</div></div>
          <div ref={body}><FormFields key={i}>{cur.content}</FormFields></div>
          <DialogFooter className="gap-2 sm:justify-between sm:gap-0 sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => (i === 0 ? guard.request(false) : setI(i - 1))}>{i === 0 ? 'Cancel' : 'Back'}</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{last ? submitLabel : 'Next'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {guard.confirm}</>
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
