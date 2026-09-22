'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SessionExpiryDialogProps {
  open: boolean
  secondsLeft: number
  totalSeconds: number
  onStayLoggedIn: () => void
  onLogout: () => void
  loggingOut?: boolean
}

function CountdownRing({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number
  totalSeconds: number
}) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  const offset = circumference * (1 - progress)

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="4 7"
          className="text-muted-foreground/30"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums leading-none text-primary">
          {secondsLeft}
        </span>
        <span className="mt-1 text-sm font-medium text-primary">sec</span>
      </div>
    </div>
  )
}

export function SessionExpiryDialog({
  open,
  secondsLeft,
  totalSeconds,
  onStayLoggedIn,
  onLogout,
  loggingOut = false,
}: SessionExpiryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md gap-6 text-center sm:text-center [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">
            Your session is expiring in ...
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            To stay logged in, click on the button below
          </DialogDescription>
        </DialogHeader>

        <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onLogout}
            disabled={loggingOut}
          >
            Logout
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={onStayLoggedIn}
            disabled={loggingOut}
          >
            Stay Logged In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
