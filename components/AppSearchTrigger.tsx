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
    <Tooltip content="Search (⌘K)" side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={open}
        aria-label="Search"
        className={cn('h-9 w-9 rounded-full', className)}
      >
        <Search className="h-4 w-4" />
      </Button>
    </Tooltip>
  )
}
