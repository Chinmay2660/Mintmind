'use client'

import type { FormHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FormFieldSpan = 'default' | 'full' | 'compact' | 'icon' | 'color'

interface FormLayoutProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
  /** Page forms use a card; sheet/modal forms stay flat; embedded fits inside existing cards. */
  variant?: 'page' | 'sheet' | 'embedded'
}

const layoutBodyClass: Record<NonNullable<FormLayoutProps['variant']>, string> = {
  page: 'form-layout-card',
  sheet: 'form-layout-sheet-body',
  embedded: 'form-layout-embedded-body',
}

const layoutClass: Record<NonNullable<FormLayoutProps['variant']>, string> = {
  page: 'form-layout',
  sheet: 'form-layout-sheet',
  embedded: 'form-layout-embedded',
}

export function FormLayout({
  children,
  className,
  variant = 'page',
  ...props
}: FormLayoutProps) {
  return (
    <form
      className={cn(layoutClass[variant], className)}
      {...props}
    >
      <div className={layoutBodyClass[variant]}>
        {children}
      </div>
    </form>
  )
}

/** Grid-only layout for calculator panels inside cards (no form element). */
export function FormGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('form-layout-embedded', className)}><div className="form-layout-embedded-body">{children}</div></div>
}

interface FormSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('form-section-block', className)}>
      {(title || description) && (
        <header className="form-section-header">
          {title && <h3 className="form-section-title">{title}</h3>}
          {description && <p className="form-section-desc">{description}</p>}
        </header>
      )}
      <div className="form-section-grid">{children}</div>
    </section>
  )
}

interface FormFieldProps {
  label?: ReactNode
  hint?: string
  required?: boolean
  span?: FormFieldSpan
  children: ReactNode
  className?: string
}

// compact/icon/color used to cap width inside a half-width cell, which left ragged rows; they now fill the cell.
const spanClass: Record<FormFieldSpan, string> = {
  default: '',
  full: 'form-field-full',
  compact: '',
  icon: '',
  color: '',
}

export function FormField({
  label,
  hint,
  required,
  span = 'default',
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('form-field', spanClass[span], className)}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  )
}

interface FormRowProps {
  children: ReactNode
  className?: string
}

/** Side-by-side fields that always share one grid row on sm+. */
export function FormRow({ children, className }: FormRowProps) {
  return <div className={cn('form-row', className)}>{children}</div>
}

interface FormActionsProps {
  children: ReactNode
  className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return <div className={cn('form-actions-bar', className)}>{children}</div>
}

const SKELETON_FIELDS = 4

/** Mirrors FormLayout's shell for the given variant, so sheets don't get a nested card. */
export function FormSkeleton({
  className,
  variant = 'page',
}: {
  className?: string
  variant?: FormLayoutProps['variant']
}) {
  return (
    <div className={cn(layoutClass[variant], className)} role="status" aria-label="Loading form">
      <div className={layoutBodyClass[variant]}>
        <div className="form-section-grid">
          {Array.from({ length: SKELETON_FIELDS }).map((_, i) => (
            <div key={i} className={cn('form-field', i === 0 && 'form-field-full')}>
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-10 w-full rounded-[var(--radius-lg)]" />
            </div>
          ))}
        </div>
        <div className="form-actions-bar">
          <div className="skeleton h-10 w-full rounded-[var(--radius-lg)] sm:w-24" />
          <div className="skeleton h-10 w-full rounded-[var(--radius-lg)] sm:w-36" />
        </div>
      </div>
    </div>
  )
}
