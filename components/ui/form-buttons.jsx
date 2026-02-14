'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SubmitButton({ 
  children, 
  isLoading = false,
  type = 'submit',
  className = '',
  ...props 
}) {
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

export function CancelButton({ 
  onClick, 
  children = 'Cancel',
  className = '',
  ...props 
}) {
  return (
    <Button 
      type="button" 
      variant="outline" 
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}

export function FormButtonGroup({ 
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  isLoading = false,
  submitClassName = '',
  cancelClassName = '',
  ...props 
}) {
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

