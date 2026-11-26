'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { GrowwChartImpl } from './GrowwChartImpl'

export type { GrowwPoint } from './GrowwChartImpl'

/** The chart library is loaded on demand, so pages open without it; a blank block of the same height holds the place meanwhile. */
const Lazy = dynamic(() => import('./GrowwChartImpl').then((m) => m.GrowwChartImpl), {
  ssr: false,
  loading: () => null,
})

export function GrowwChart(props: ComponentProps<typeof GrowwChartImpl>) {
  return <div style={{ minHeight: props.height ?? 160 }}><Lazy {...props} /></div>
}
