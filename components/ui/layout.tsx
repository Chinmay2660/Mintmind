import type { FieldsetHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Layout primitives for the Mintmind design system. Use these instead of ad-hoc spacing classes.
 * Spacing scale (Tailwind units): 2 tight · 3 related items · 4 default · 5 page sections · 6 dialogs/large cards.
 * See docs/design-system.md.
 */

const GAP = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6' } as const
const SPACE = { 2: 'space-y-2', 3: 'space-y-3', 4: 'space-y-4', 5: 'space-y-5', 6: 'space-y-6' } as const
type Step = keyof typeof GAP

/** Vertical rhythm. Pages use gap 5, forms and card contents use 4, tight groups 2 to 3. */
export function Stack({ gap = 4, className, ...p }: { gap?: Step } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(SPACE[gap], className)} {...p} />
}

/** Responsive grid. `min` columns at small, `cols` from the sm/lg breakpoint. Children never overflow their cell. */
export function Grid({ cols = 2, gap = 4, className, ...p }: { cols?: 1 | 2 | 3 | 4; gap?: Step } & HTMLAttributes<HTMLDivElement>) {
  const c = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols]
  return <div className={cn('grid [&>*]:min-w-0', GAP[gap], c, className)} {...p} />
}

/** The standard card surface with one consistent padding scale. */
export function Card({ pad = 'md', className, ...p }: { pad?: 'none' | 'sm' | 'md' | 'lg' } & HTMLAttributes<HTMLDivElement>) {
  const padding = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' }[pad]
  return <div className={cn('surface-card min-w-0', padding, className)} {...p} />
}

/** Two-column form layout (one column on phones). Add className="full" to a child to span both columns. */
export function FormGrid({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&>.full]:sm:col-span-2', className)} {...p} />
}

/** Group of related controls with a heading. Always shrinks to its container (a bare fieldset does not). */
export function FieldSet({ legend, hint, className, children, ...p }: { legend: ReactNode; hint?: ReactNode } & Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> & { children: ReactNode }) {
  return (
    <fieldset className={cn('min-w-0 space-y-2', className)} {...p}>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** Bordered, scrollable list. Rows are `<ScrollListItem>`; the box stays inside its container and scrolls on its own. */
export function ScrollList({ maxHeight = 'max-h-56', className, ...p }: { maxHeight?: string } & HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('min-w-0 divide-y divide-border overflow-y-auto overflow-x-hidden rounded-lg border border-border', maxHeight, className)} {...p} />
}
export function ScrollListItem({ className, ...p }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('flex items-center gap-3 px-3 py-2.5 text-sm', className)} {...p} />
}
