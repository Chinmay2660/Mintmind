'use client'

import { useCallback, useState, type MouseEvent } from 'react'

export function useFormSheet() {
  const [open, setOpen] = useState(false)
  const [entityId, setEntityId] = useState<string | undefined>()

  const openSheet = useCallback((idOrEvent?: string | MouseEvent) => {
    setEntityId(typeof idOrEvent === 'string' ? idOrEvent : undefined)
    setOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    setOpen(false)
    setEntityId(undefined)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) setOpen(true)
      else closeSheet()
    },
    [closeSheet]
  )

  return { open, setOpen: handleOpenChange, entityId, openSheet, closeSheet }
}
