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
      className={cn('flex-1 bg-primary hover:bg-primary/90', className)}
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

export function FormButtonGroup({
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  isLoading = false,
  submitClassName = '',
  cancelClassName = '',
  ...props
}: FormButtonGroupProps) {
  return (
    <div className="flex gap-2" {...props}>
      <SubmitButton isLoading={isLoading} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
      <CancelButton onClick={onCancel} className={cancelClassName}>
        {cancelLabel}
      </CancelButton>
    </div>
  )
}
