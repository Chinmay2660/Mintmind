'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root

const SheetTrigger = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ ...props }, ref) => (
  <DialogPrimitive.Trigger ref={ref} suppressHydrationWarning {...props} />
))
SheetTrigger.displayName = DialogPrimitive.Trigger.displayName

const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps

>(({ side = 'right', className, children, ...props }, ref) => {
  const own = React.useRef<HTMLDivElement | null>(null)
  const closer = React.useRef<HTMLButtonElement | null>(null)
  const drag = React.useRef<{ y: number; dy: number } | null>(null)
  const setRef = (node: HTMLDivElement | null) => { own.current = node; if (typeof ref === 'function') ref(node); else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node }
  // Drag the handle at the top of a bottom sheet downwards to close it. Let go early and it springs back.
  const onDown = (e: React.PointerEvent) => { drag.current = { y: e.clientY, dy: 0 }; e.currentTarget.setPointerCapture(e.pointerId); if (own.current) own.current.style.transition = 'none' }
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || !own.current) return; d.dy = Math.max(0, e.clientY - d.y); own.current.style.transform = `translateY(${d.dy}px)` }
  const onUp = () => {
    const d = drag.current; drag.current = null
    const el = own.current
    if (!d || !el) return
    el.style.transition = 'transform 180ms ease-out'
    if (d.dy > 110) closer.current?.click()
    el.style.transform = ''
  }
  return (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={setRef}
      className={cn(
        'fixed z-50 gap-4 bg-background border border-border p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
        side === 'right' &&
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
        side === 'left' &&
          'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        side === 'top' &&
          'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        side === 'bottom' &&
          'inset-x-0 bottom-[var(--kb-inset,0px)] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        className
      )}
      {...props}
    >
      {side === 'bottom' && (
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="presentation" style={{ touchAction: 'none' }} className="absolute left-0 right-12 top-0 z-10 flex h-7 cursor-grab justify-center pt-2 active:cursor-grabbing">
          <span aria-hidden className="h-1.5 w-12 rounded-full bg-border" />
        </div>
      )}
      {children}
      <DialogPrimitive.Close ref={closer} className={cn('absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary', side === 'bottom' && 'max-sm:hidden')}>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
  )
})
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
