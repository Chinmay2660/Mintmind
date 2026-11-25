'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { toISO } from '@/lib/wealth/calc'
import { LIMITS, LIMIT_RULES_FY, fyLabel, fyStart, limitStatus } from '@/lib/wealth/limits'
import { uid } from '@/lib/wealth/db'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Money } from './Money'
import { DateInput, Field, FormDialog, Panel, Progress, Select } from './kit'

/**
 * How much has gone into PPF and NPS this financial year, against the yearly limit. Contributions are logged by hand,
 * since the app does not read your accounts. The limits come from one place in the code and tax rules change,
 * so the panel says to check the current rules.
 */
export function LimitsPanel() {
  const { data, db } = useWealth()
  const [adding, setAdding] = useState<null | string>(null)
  const today = new Date()
  const fy = fyLabel(fyStart(toISO(today)))
  const kinds = (['ppf', 'nps'] as const).map((k) => ({ k, items: data.assets.filter((a: any) => a.category === k), st: limitStatus(data.assets, k, today) }))

  return (
    <Panel title={`Yearly limits, FY ${fy}`} description={`The financial year runs 1 April to 31 March. These limits are the ones for FY ${LIMIT_RULES_FY} and tax rules change, so check the current rules before you rely on them.`}>
      <div className="space-y-5">
        {kinds.map(({ k, items, st }) => (
          <section key={k} aria-label={LIMITS[k].label}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold">{LIMITS[k].label}</h4>
              {items.length > 0 && <Button type="button" size="sm" variant="outline" onClick={() => setAdding(k)}><Plus className="mr-1 h-3.5 w-3.5" />Log a contribution</Button>}
            </div>
            {items.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">Add a {k.toUpperCase()} account under Assets & loans to track its yearly limit.</p>
            ) : (
              <>
                <div className="mt-2"><Progress value={st.pct} tone={st.over > 0 ? 'danger' : st.pct >= 90 ? 'warning' : 'primary'} label={`${LIMITS[k].label} used this year`} /></div>
                <p className="mt-1.5 text-sm tabular-nums">
                  <strong><Money value={st.used} /></strong> of {formatINR(st.limit)} used
                  {st.over > 0 ? <span className="font-bold text-destructive"> · over by {formatINR(st.over)}</span> : <span className="text-muted-foreground"> · {formatINR(st.left)} left</span>}
                </p>
                <p className="text-xs text-muted-foreground">{LIMITS[k].note}</p>
              </>
            )}
          </section>
        ))}
      </div>
      {adding && <ContributionForm kind={adding as 'ppf' | 'nps'} onClose={() => setAdding(null)} assets={data.assets.filter((a: any) => a.category === adding)} onSave={async (rec) => { await save(db, 'assets', rec); toast.success('Contribution logged') }} />}
    </Panel>
  )
}

export function ContributionForm({ kind, assets, onClose, onSave }: { kind: 'ppf' | 'nps'; assets: any[]; onClose: () => void; onSave: (a: any) => Promise<void> }) {
  const [assetId, setAssetId] = useState(assets[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toISO(new Date()))
  const [addToBalance, setAddToBalance] = useState(true)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Log a ${LIMITS[kind].label.split(' ')[0]} contribution`} description="Counts towards this financial year's limit. Tick the box to also raise the balance of the account by the same amount."
      onSubmit={async () => {
        const a = assets.find((x) => x.id === assetId)
        const n = Number(amount)
        if (!a) throw new Error('Choose the account')
        if (!(n > 0)) throw new Error('Enter an amount greater than zero')
        if (!date) throw new Error('Choose the date')
        if (date > toISO(new Date())) throw new Error('The date cannot be in the future')
        await onSave({ ...a, contributions: [...(a.contributions || []), { id: uid('ct'), date, amount: n }], ...(addToBalance ? { value: (Number(a.value) || 0) + n } : {}), updated: toISO(new Date()) })
      }}>
      {assets.length > 1 && <Field label="Account" className="full">{(id) => <Select id={id} value={assetId} onChange={(e) => setAssetId(e.target.value)}>{assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>}
      <Field label="Amount (₹)">{(id) => <Input id={id} type="number" min="0" step="any" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
      <Field label="Date">{(id) => <DateInput id={id} required max={toISO(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      <label className="full flex items-center gap-2.5 text-sm"><Checkbox checked={addToBalance} onChange={(e) => setAddToBalance(e.target.checked)} aria-label="Also add to the balance" />Also add to the account balance</label>
      {assets[0]?.contributions?.length > 0 && <p className="full text-xs text-muted-foreground">Last logged: {formatDate(assets.flatMap((a) => a.contributions || []).sort((x: any, y: any) => y.date.localeCompare(x.date))[0].date)}</p>}
    </FormDialog>
  )
}
