'use client'

import { useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { importTransactions } from '@/lib/wealth/actions'
import { detectColumns, parseCsv, toTransactions } from '@/lib/wealth/csvImport'
import { matchRule } from '@/lib/wealth/rules'
import { findDuplicates } from '@/lib/ai/budgetAI'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/pickers'
import { useRules } from './RulesDialog'

const MAX_BYTES = 5 * 1024 * 1024
const FIELDS: [keyof ReturnType<typeof detectColumns>, string][] = [['date', 'Date'], ['description', 'Description'], ['amount', 'Amount'], ['debit', 'Money out'], ['credit', 'Money in'], ['category', 'Category']]

/**
 * Bring in past transactions from a bank or app export. The file is read on this device and never uploaded.
 * Nothing is saved until the person confirms, rows that look like ones already recorded are left out by default,
 * and balances are never changed.
 */
export function ImportCsvDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, data } = useWealth()
  const rules = useRules()
  const pick = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [header, setHeader] = useState<string[]>([])
  const [map, setMap] = useState<ReturnType<typeof detectColumns> | null>(null)
  const [account, setAccount] = useState('')
  const [monthFirst, setMonthFirst] = useState(false)
  const [invert, setInvert] = useState(false)
  const [skipDupes, setSkipDupes] = useState(true)
  const [busy, setBusy] = useState(false)
  const accounts = data.bankAccounts as any[]
  const acct = account || accounts[0]?.id || ''

  const reset = () => { setName(''); setRows([]); setHeader([]); setMap(null) }
  const load = async (file: File) => {
    if (file.size > MAX_BYTES) return toast.error('That file is larger than 5 MB')
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) return toast.error('No rows found. Is this a CSV file with a header row?')
    setName(file.name); setHeader(parsed[0]); setRows(parsed.slice(1)); setMap(detectColumns(parsed[0]))
  }

  const result = useMemo(() => {
    if (!map) return null
    const { items, skipped } = toTransactions(rows, map, { monthFirst, invert })
    const marked = items.map((it) => {
      // rules fill the category when the file has none; a repeat of something already recorded is flagged
      const category = it.category || matchRule(rules, it.note, it.kind)?.category || ''
      const dupe = it.kind === 'expense' && findDuplicates({ amount: it.amount, date: it.date, category: category || 'Other', note: it.note }, data.expenses).length > 0
      return { ...it, category, dupe }
    })
    return { items: marked, skipped }
  }, [rows, map, monthFirst, invert, rules, data.expenses])

  const toAdd = result ? result.items.filter((i) => !(skipDupes && i.dupe)) : []
  const dupes = result ? result.items.filter((i) => i.dupe).length : 0
  const noColumns = !!map && (map.date < 0 || (map.amount < 0 && map.debit < 0 && map.credit < 0))

  const run = async () => {
    setBusy(true)
    try {
      const r = await importTransactions(db, toAdd, acct)
      toast.success(`Added ${r.expenses} expense${r.expenses === 1 ? '' : 's'} and ${r.income} income entr${r.income === 1 ? 'y' : 'ies'}`)
      reset(); onOpenChange(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not import') } finally { setBusy(false) }
  }

  const colSelect = (k: keyof NonNullable<typeof map>, label: string) => (
    <label key={k} className="text-xs text-muted-foreground">{label}
      <div className="mt-0.5"><Select aria-label={`${label} column`} value={String(map![k])} onChange={(e) => setMap({ ...map!, [k]: Number(e.target.value) })}>
        <option value="-1">Not in the file</option>
        {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
      </Select></div>
    </label>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import transactions from a CSV</DialogTitle>
          <DialogDescription>Read on this device and never uploaded. Nothing is saved until you confirm. Balances are not changed: this is for past activity your balance already includes.</DialogDescription>
        </DialogHeader>

        {!map ? (
          <button type="button" onClick={() => pick.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-10 text-center outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-bold">Choose a CSV file</span>
            <span className="text-xs text-muted-foreground">A bank statement export or a spreadsheet saved as CSV. It needs a header row with a date, a description and an amount.</span>
            <input ref={pick} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = '' }} />
          </button>
        ) : (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm"><FileSpreadsheet className="h-4 w-4" /><span className="min-w-0 truncate font-medium">{name}</span><span className="text-muted-foreground">{rows.length} rows</span><button type="button" onClick={reset} className="ml-auto rounded text-xs underline outline-none focus-visible:ring-2 focus-visible:ring-ring">Choose another</button></p>

            <fieldset className="space-y-2"><legend className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Which column is which</legend>
              <div className="grid gap-2 sm:grid-cols-3">{FIELDS.map(([k, l]) => colSelect(k, l))}</div>
              {noColumns && <p role="alert" className="text-xs text-destructive">Choose a Date column and either an Amount column or Money out and Money in columns.</p>}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">Bank account these belong to<div className="mt-0.5"><Select aria-label="Account" value={acct} onChange={(e) => setAccount(e.target.value)}>{accounts.length === 0 && <option value="">No bank accounts yet</option>}{accounts.map((a) => <option key={a.id} value={a.id}>{a.nickname || a.bankName}</option>)}</Select></div></label>
              <div className="space-y-1.5 self-end text-sm">
                <label className="flex items-center gap-2.5"><Checkbox checked={monthFirst} onChange={(e) => setMonthFirst(e.target.checked)} aria-label="Dates are month first" />Dates are month first (11/05 is 5 November)</label>
                <label className="flex items-center gap-2.5"><Checkbox checked={invert} onChange={(e) => setInvert(e.target.checked)} aria-label="Spending is listed as positive" />Spending is listed as positive amounts</label>
              </div>
            </div>

            {result && !noColumns && (
              <>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[34rem] text-left text-xs">
                    <caption className="sr-only">Preview of the first rows</caption>
                    <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="px-2 py-1.5">Date</th><th scope="col" className="px-2 py-1.5">Description</th><th scope="col" className="px-2 py-1.5">Category</th><th scope="col" className="px-2 py-1.5 text-right">Amount</th><th scope="col" className="px-2 py-1.5">Note</th></tr></thead>
                    <tbody>
                      {result.items.slice(0, 8).map((i, n) => (
                        <tr key={n} className="border-t border-border">
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatDate(i.date)}</td>
                          <td className="max-w-[14rem] truncate px-2 py-1.5">{i.note || '-'}</td>
                          <td className="px-2 py-1.5">{i.category || 'Other'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{i.kind === 'income' ? '+' : '-'}{formatINR(i.amount)}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{i.dupe ? 'Looks already recorded' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm"><strong className="tabular-nums">{result.items.length}</strong> readable rows{result.skipped.length ? `, ${result.skipped.length} skipped (no date or amount)` : ''}{dupes ? `, ${dupes} look already recorded` : ''}.</p>
                {dupes > 0 && <label className="flex items-center gap-2.5 text-sm"><Checkbox checked={skipDupes} onChange={(e) => setSkipDupes(e.target.checked)} aria-label="Leave out rows that look already recorded" />Leave out the {dupes} that look already recorded</label>}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={busy || !map || noColumns || toAdd.length === 0 || !acct}>{busy ? 'Importing…' : `Import ${toAdd.length || ''} transactions`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
