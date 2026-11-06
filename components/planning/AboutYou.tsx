'use client'

import { Num } from '@/components/tools/kit'
import type { Inputs } from './useProfileInputs'

export function AboutYou({ v, set }: { v: Inputs; set: (k: keyof Inputs, val: string) => void }) {
  return (
    <details open className="surface-card p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold">About you <span className="ml-1 font-normal text-muted-foreground">(kept in this browser only)</span></summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Num label="Take-home a month (₹)" value={v.takeHome} set={(x) => set('takeHome', x)} />
        <Num label="Spending a month (₹)" value={v.spend} set={(x) => set('spend', x)} hint="Prefilled from your budget" />
        <Num label="Of which essentials (₹)" value={v.essentials} set={(x) => set('essentials', x)} hint="Rent, groceries, bills" />
        <Num label="Your age" value={v.age} set={(x) => set('age', x)} />
        <Num label="Retire at" value={v.retireAge} set={(x) => set('retireAge', x)} />
      </div>
    </details>
  )
}
