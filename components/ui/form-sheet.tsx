'use client'

import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

interface FormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

export function FormSheet({ open, onOpenChange, title, children }: FormSheetProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] rounded-t-3xl overflow-y-auto pb-8 safe-area-inset-bottom"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
