'use client'

import type { ReactNode } from 'react'

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-0.5 flex-shrink-0 self-start">{children}</div>
}
