'use client'

import { useTheme } from 'next-themes'
import {
  CircleCheck,
  CircleX,
  Info,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      offset={16}
      gap={10}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-[var(--radius-xl)] !border-border !bg-[hsl(var(--card-elevated))] !text-card-foreground !shadow-elevated !px-4 !py-3.5',
          title: '!text-sm !font-semibold !text-foreground',
          description: '!text-xs !text-muted-foreground',
          actionButton:
            '!rounded-full !bg-primary !text-primary-foreground !text-xs !font-medium',
          cancelButton:
            '!rounded-full !bg-muted !text-muted-foreground !text-xs !font-medium',
          success: '!border-success/25',
          error: '!border-destructive/25',
          warning: '!border-warning/25',
          info: '!border-primary/25',
        },
      }}
      icons={{
        success: <CircleCheck className="h-4 w-4 text-success" strokeWidth={2} />,
        error: <CircleX className="h-4 w-4 text-destructive" strokeWidth={2} />,
        warning: <TriangleAlert className="h-4 w-4 text-warning" strokeWidth={2} />,
        info: <Info className="h-4 w-4 text-primary" strokeWidth={2} />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={2} />,
      }}
      {...props}
    />
  )
}

export { Toaster }
