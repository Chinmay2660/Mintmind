'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { useAppSearch } from '@/contexts/AppSearchContext'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface AppSearchTriggerProps {
  className?: string
}

export default function AppSearchTrigger({ className }: AppSearchTriggerProps) {
  const { open } = useAppSearch()

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        className={cn(
          'hidden h-9 w-full max-w-xs justify-start gap-2 rounded-full border-border bg-muted/40 px-3 text-muted-foreground lg:inline-flex',
          className
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left text-sm">Search...</span>
        <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </Button>

      <Tooltip content="Search (⌘K)" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={open}
          className="h-9 w-9 rounded-xl lg:hidden"
        >
          <Search className="h-4 w-4" />
        </Button>
      </Tooltip>
    </>
  )
}
