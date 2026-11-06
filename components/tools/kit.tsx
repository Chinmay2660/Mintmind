'use client'

import { Input } from '@/components/ui/input'
import { Field } from '@/components/wealth/kit'

export const num = (v: string) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : 0)

export function Num({ label, value, set, hint, min = 0 }: { label: string; value: string; set: (v: string) => void; hint?: string; min?: number }) {
  return <Field label={label} hint={hint}>{(id) => <Input id={id} type="number" min={min} step="any" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />}</Field>
}
export const Result = ({ rows, note }: { rows: [string, string][]; note: string }) => (
  <div className="surface-card p-4 sm:p-5">
    <dl className="divide-y divide-border">{rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 py-2"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-muted-foreground">{note}</p>
  </div>
)
export const ASSUME = 'What-if arithmetic from the numbers and assumed return you enter. It is not a prediction or advice, and nothing you type leaves this page.'

