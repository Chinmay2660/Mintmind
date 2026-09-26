'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  isLoading?: boolean
}

export function SubmitButton({
  children,
  isLoading = false,
  type = 'submit',
  className = '',
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      className={cn('min-w-[9rem] bg-primary hover:bg-primary/90', className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? 'Saving...' : children}
    </Button>
  )
}

interface CancelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void
  children?: ReactNode
}

export function CancelButton({
  onClick,
  children = 'Cancel',
  className = '',
  ...props
}: CancelButtonProps) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={className} {...props}>
      {children}
    </Button>
  )
}

interface FormButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  submitLabel: string
  cancelLabel?: string
  onCancel?: () => void
  isLoading?: boolean
  submitClassName?: string
  cancelClassName?: string
}

export type FormVariant = 'page' | 'sheet'

interface FormSubmitBarProps {
  variant?: FormVariant
  submitLabel: string
  cancelLabel?: string
  onCancel?: () => void
  isLoading?: boolean
}

/** Page forms use FormActions; sheet/modal forms use FormButtonGroup. */
export function FormSubmitBar({
  variant = 'page',
  submitLabel,
  cancelLabel,
  onCancel,
  isLoading = false,
}: FormSubmitBarProps) {
  if (variant === 'sheet') {
    return (
      <FormButtonGroup
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        onCancel={onCancel}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className="form-actions-bar">
      <SubmitButton isLoading={isLoading}>{submitLabel}</SubmitButton>
    </div>
  )
}

export function FormButtonGroup({
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  isLoading = false,
  submitClassName = '',
  cancelClassName = '',
  className,
  ...props
}: FormButtonGroupProps) {
  return (
    <div className={cn('form-actions-bar', className)} {...props}>
      <CancelButton onClick={onCancel} className={cancelClassName}>
        {cancelLabel}
      </CancelButton>
      <SubmitButton isLoading={isLoading} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
    </div>
  )
}
