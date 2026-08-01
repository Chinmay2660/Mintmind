'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    if (onCancel) onCancel()
    else onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm?.()
  }

  const confirmButtonClass =
    variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-primary hover:bg-primary/90 text-white'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button onClick={handleConfirm} className={`flex-1 ${confirmButtonClass}`} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
