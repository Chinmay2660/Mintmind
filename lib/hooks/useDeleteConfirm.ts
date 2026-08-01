'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
}

export function useDeleteConfirm() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [meta, setMeta] = useState({ title: '', description: '', confirmLabel: 'Delete' })
  const onConfirmRef = useRef<() => void | Promise<void>>(() => {})

  const confirmDelete = useCallback((options: ConfirmOptions) => {
    onConfirmRef.current = options.onConfirm
    setMeta({
      title: options.title,
      description: options.description ?? '',
      confirmLabel: options.confirmLabel ?? 'Delete',
    })
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirmRef.current()
      setOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    confirmDelete,
    confirmDialogProps: {
      open,
      onOpenChange: setOpen,
      title: meta.title,
      description: meta.description,
      confirmLabel: meta.confirmLabel,
      onConfirm: handleConfirm,
      variant: 'destructive' as const,
      isLoading,
    },
  }
}
