'use client'

import { useCallback, useState } from 'react'

export function useFormSheet() {
  const [open, setOpen] = useState(false)
  const openSheet = useCallback(() => setOpen(true), [])
  const closeSheet = useCallback(() => setOpen(false), [])
  return { open, setOpen, openSheet, closeSheet }
}
