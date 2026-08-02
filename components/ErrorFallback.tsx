'use client'

import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'

interface ErrorFallbackProps {
  error?: Error | null
  reset?: () => void
  fullPage?: boolean
}

export function ErrorFallback({ error, reset, fullPage = false }: ErrorFallbackProps) {
  const card = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="surface-card p-8 sm:p-10 space-y-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" />
            <div className="relative bg-destructive/10 dark:bg-destructive/20 p-5 rounded-full">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3 pt-1"
        >
          {reset && (
            <Button onClick={reset} className="w-full h-12 text-base font-medium rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium rounded-xl"
            onClick={() => { window.location.href = '/' }}
          >
            <Home className="w-4 h-4 mr-2" />
            Go home
          </Button>
        </motion.div>

        {fullPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="flex justify-center pt-2"
          >
            <Logo />
          </motion.div>
        )}
      </div>
    </motion.div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center finance-shell aurora-bg p-4 relative overflow-hidden">
        <div className="relative z-10 w-full flex justify-center">{card}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center p-4 md:p-6', 'min-h-[50vh]')}>
      {card}
    </div>
  )
}
