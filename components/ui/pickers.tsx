'use client'

import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

/*
 * Mintmind pickers: replacements for the browser's built-in <select> and <input type="date">.
 * Same props as the native controls (value, onChange(e) with e.target.value, <option> children, min/max, required),
 * so forms use them without changes. On phones they open as a bottom sheet; on larger screens as a popover.
 */

const triggerBase =
  'group relative flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring/30'

/** A popover on desktop, a bottom sheet on phones. */
function Surface({ open, onOpenChange, title, trigger, children, width = 'trigger', fixedParts }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; trigger: ReactNode; children: ReactNode; width?: 'trigger' | 'auto'; fixedParts?: boolean }) {
  const mobile = useIsMobile()
  if (mobile) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[80dvh] flex-col rounded-t-3xl border border-b-0 border-border bg-popover text-popover-foreground shadow-elevated outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></DialogPrimitive.Close>
            </div>
            <div className={cn('min-h-0 flex-1 overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]', fixedParts ? 'flex flex-col overflow-hidden' : 'overflow-y-auto')}>{children}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label={title}
          // Inside a modal dialog the page's scroll lock would swallow wheel/touch scrolling in this layer.
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className={cn(
            cn('z-[70] max-h-[min(22rem,var(--radix-popover-content-available-height))] overscroll-contain rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-elevated outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            fixedParts ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
            width === 'trigger' ? 'w-[max(var(--radix-popover-trigger-width),12rem)]' : 'w-auto'
          ))}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/* ───────────── Select ───────────── */

interface Opt { value: string; label: string; disabled?: boolean }

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

function collect(children: ReactNode, out: Opt[] = []): Opt[] {
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) return
    const p = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean }
    if (child.type === 'option') {
      const label = textOf(p.children)
      out.push({ value: p.value !== undefined ? String(p.value) : label, label, disabled: p.disabled })
    } else if (child.type === Fragment || p.children) collect(p.children, out)
  })
  return out
}

/** Fires onChange the way a native control would, so existing `e.target.value` handlers keep working. */
const fakeEvent = <T extends HTMLElement>(value: string) => ({ target: { value }, currentTarget: { value } }) as unknown as ChangeEvent<T>

/** Invisible field that keeps the browser's `required` validation working for a custom control. */
function RequiredProbe({ value }: { value: string }) {
  return <input tabIndex={-1} aria-hidden required value={value} onChange={() => {}} className="pointer-events-none absolute inset-x-2 bottom-0 h-px opacity-0" />
}

export interface SelectProps {
  id?: string
  value?: string | number
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  className?: string
  disabled?: boolean
  required?: boolean
  name?: string
  children?: ReactNode
  'aria-label'?: string
  placeholder?: string
}

export function Select({ id, value, onChange, className, disabled, required, children, placeholder, 'aria-label': ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const options = useMemo(() => collect(children), [children])
  const current = String(value ?? '')
  const selected = options.find((o) => o.value === current)
  const searchable = options.length > 8
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options
  const listRef = useRef<HTMLDivElement>(null)
  const title = ariaLabel || 'Choose an option'

  useEffect(() => { if (!open) setQ('') }, [open])
  // Bring the chosen option into view when the list opens.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }), 30)
    return () => clearTimeout(t)
  }, [open])

  const pick = (v: string) => { onChange?.(fakeEvent<HTMLSelectElement>(v)); setOpen(false) }
  const move = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([disabled])') ?? [])
    if (!items.length) return
    e.preventDefault()
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus()
  }

  const showsPlaceholder = !selected || (selected.value === '' && !selected.label.trim())
  return (
    <div className="relative">
      <Surface
        open={open}
        onOpenChange={setOpen}
        title={title}
        trigger={
          <button type="button" id={id} disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id ?? title.replace(/\W+/g, "-")}-list`} aria-label={ariaLabel} className={cn(triggerBase, className)}>
            <span className={cn('min-w-0 flex-1 truncate', (showsPlaceholder || selected?.value === '') && 'text-muted-foreground')}>{selected && selected.label.trim() ? selected.label : placeholder || 'Select…'}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
          </button>
        }
      >
        {searchable && (
          <div className="shrink-0 border-b border-border p-2">
            <div className="flex h-9 items-center gap-2 rounded-lg bg-muted px-2.5">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search options" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={listRef} role="listbox" id={`${id ?? title.replace(/W+/g, "-")}-list`} aria-label={title} onKeyDown={move} className="flex flex-col gap-0.5">
          {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</p>}
          {shown.map((o, i) => {
            const on = o.value === current
            return (
              <button key={`${o.value}-${i}`} type="button" role="option" aria-selected={on} disabled={o.disabled} onClick={() => pick(o.value)}
                className={cn('flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-40', on && 'bg-accent font-semibold text-accent-foreground')}>
                <span className="min-w-0 flex-1">{o.label.trim() || <span className="text-muted-foreground">None</span>}</span>
                {on && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            )
          })}
        </div>
      </Surface>
      {required && <RequiredProbe value={current} />}
    </div>
  )
}

/* ───────────── Date ───────────── */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()) }
const shiftDay = (s: string, by: number) => { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d + by); return iso(t.getFullYear(), t.getMonth(), t.getDate()) }
function parts(s: string) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null }
export const formatPickedDate = (s: string) => { const p = parts(s); return p ? `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}` : '' }

export interface DateInputProps {
  id?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
}

export function DateInput({ id, value = '', onChange, min, max, required, disabled, className, placeholder, 'aria-label': ariaLabel }: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'days' | 'months'>('days')
  const seed = parts(value) ?? parts(todayIso())!
  const [view, setView] = useState({ y: seed.y, m: seed.m })

  useEffect(() => {
    if (open) { const p = parts(value) ?? parts(max && max < todayIso() ? max : todayIso())!; setView({ y: p.y, m: p.m }); setMode('days') }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const blocked = (s: string) => (!!min && s < min) || (!!max && s > max)
  const pick = (s: string) => { if (blocked(s)) return; onChange?.(fakeEvent<HTMLInputElement>(s)); setOpen(false) }
  const go = (by: number) => setView((v) => { const t = new Date(v.y, v.m + by, 1); return { y: t.getFullYear(), m: t.getMonth() } })

  // Monday-first grid with leading blanks.
  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const today = todayIso()
  const quick = [{ l: 'Today', v: today }, { l: 'Yesterday', v: shiftDay(today, -1) }].filter((q) => !blocked(q.v))

  return (
    <div className="relative">
      <Surface
        open={open}
        onOpenChange={setOpen}
        title={ariaLabel || 'Choose a date'}
        width="auto"
        trigger={
          <button type="button" id={id} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel} className={cn(triggerBase, className)}>
            <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>{value ? formatPickedDate(value) : placeholder || 'Select date'}</span>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        }
      >
        <div className="w-full select-none p-1.5 sm:w-72">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => (mode === 'days' ? go(-1) : setView((v) => ({ ...v, y: v.y - 1 })))} aria-label={mode === 'days' ? 'Previous month' : 'Previous year'} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMode(mode === 'days' ? 'months' : 'days')} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-muted">{mode === 'days' ? `${MONTHS[view.m]} ${view.y}` : view.y}</button>
            <button type="button" onClick={() => (mode === 'days' ? go(1) : setView((v) => ({ ...v, y: v.y + 1 })))} aria-label={mode === 'days' ? 'Next month' : 'Next year'} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
          </div>

          {mode === 'months' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((n, i) => (
                <button key={n} type="button" onClick={() => { setView((v) => ({ ...v, m: i })); setMode('days') }} className={cn('h-11 rounded-lg text-sm hover:bg-muted', i === view.m && 'bg-accent font-semibold text-accent-foreground')}>{n.slice(0, 3)}</button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
              <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
                {cells.map((d, i) => {
                  if (d === null) return <span key={`b${i}`} />
                  const s = iso(view.y, view.m, d)
                  const sel = s === value, isToday = s === today, off = blocked(s)
                  return (
                    <button key={s} type="button" disabled={off} onClick={() => pick(s)} aria-pressed={sel} aria-label={formatPickedDate(s)} aria-current={isToday ? 'date' : undefined}
                      className={cn('mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', sel ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-muted', isToday && !sel && 'font-semibold text-primary ring-1 ring-primary/40', off && 'pointer-events-none opacity-30')}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            {quick.map((q) => <button key={q.l} type="button" onClick={() => pick(q.v)} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted">{q.l}</button>)}
            {!required && value && <button type="button" onClick={() => { onChange?.(fakeEvent<HTMLInputElement>('')); setOpen(false) }} className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Clear</button>}
          </div>
        </div>
      </Surface>
      {required && <RequiredProbe value={value} />}
    </div>
  )
}

/* ───────────── Multi-select ───────────── */

export interface MultiOption { value: string; label: string; hint?: string }

/** Dropdown that picks several options. The trigger summarises what is chosen; the list has custom checkboxes. */
export function MultiSelect({ id, options, selected, onToggle, placeholder = 'Choose', summaryLabel = 'selected', className, 'aria-label': ariaLabel }: {
  id?: string
  options: MultiOption[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder?: string
  summaryLabel?: string
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => { if (!open) setQ('') }, [open])
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options
  const chosen = options.filter((o) => selected.includes(o.value))
  const title = ariaLabel || 'Choose options'

  return (
    <Surface
      fixedParts
      open={open}
      onOpenChange={setOpen}
      title={title}
      trigger={
        <button type="button" id={id} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id ?? title.replace(/\W+/g, "-")}-list`} aria-label={ariaLabel} className={cn(triggerBase, 'h-auto min-h-10 py-2', className)}>
          <span className={cn('min-w-0 flex-1 truncate', chosen.length === 0 && 'text-muted-foreground')}>
            {chosen.length === 0 ? placeholder : chosen.length <= 2 ? chosen.map((c) => c.label).join(', ') : `${chosen.length} ${summaryLabel}`}
          </span>
          {chosen.length > 0 && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{chosen.length}</span>}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </button>
      }
    >
      {options.length > 8 && (
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1 border-b border-border bg-popover p-2">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-muted px-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search options" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
      )}
      <div role="listbox" id={`${id ?? title.replace(/W+/g, "-")}-list`} aria-multiselectable="true" aria-label={title} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain py-1">
        {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</p>}
        {shown.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => onToggle(o.value)}
              className={cn('flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted', on && 'bg-primary/10 font-medium')}>
              <span aria-hidden className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60 bg-transparent')}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2 break-words">{o.label}</span>{o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}</span>
            </button>
          )
        })}
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <button type="button" onClick={() => setOpen(false)} className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{chosen.length ? `Done, ${chosen.length} ${summaryLabel}` : 'Done'}</button>
      </div>
    </Surface>
  )
}

/* ───────────── Month ───────────── */

/** Tap the month name to jump to any month. value is YYYY-MM; months after `max` are disabled. */
export function MonthPicker({ value, onChange, max, className, 'aria-label': ariaLabel = 'Choose month' }: { value: string; onChange: (ym: string) => void; max?: string; className?: string; 'aria-label'?: string }) {
  const [open, setOpen] = useState(false)
  const [y, m] = value.split('-').map(Number)
  const [year, setYear] = useState(y)
  useEffect(() => { if (open) setYear(y) }, [open, y])
  const maxYear = max ? Number(max.slice(0, 4)) : Infinity
  const key = (i: number) => `${year}-${pad(i + 1)}`
  return (
    <Surface
      open={open}
      onOpenChange={setOpen}
      title={ariaLabel}
      width="auto"
      trigger={
        <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={`${ariaLabel}: ${MONTHS[m - 1]} ${y}`} className={cn('inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', className)}>
          {MONTHS[m - 1]} {y}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      }
    >
      <div className="w-full select-none p-1.5 sm:w-64">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setYear((v) => v - 1)} aria-label="Previous year" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <button type="button" onClick={() => setYear((v) => v + 1)} disabled={year >= maxYear} aria-label="Next year" className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((n, i) => {
            const k = key(i)
            const off = !!max && k > max
            const on = k === value
            return <button key={n} type="button" disabled={off} onClick={() => { onChange(k); setOpen(false) }} aria-pressed={on} className={cn('h-11 rounded-lg text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30', on && 'bg-primary font-semibold text-primary-foreground hover:bg-primary')}>{n.slice(0, 3)}</button>
          })}
        </div>
      </div>
    </Surface>
  )
}
