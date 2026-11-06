'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWealth } from '@/lib/wealth/WealthContext'
import { importStatement } from '@/lib/wealth/actions'
import { groupByFund, parseStatementRows, positionFrom } from '@/lib/wealth/statementImport'
import { formatINR } from '@/lib/wealth/format'

const MAX_BYTES = 5 * 1024 * 1024

export function StatementImportButton() {
  const { db } = useWealth()
  const ref = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState('')
  const [res, setRes] = useState<ReturnType<typeof parseStatementRows> | null>(null)
  const groups = res ? groupByFund(res.txns) : []

  const read = async (f: File) => {
    if (f.size > MAX_BYTES) return toast.error('File is larger than 5 MB')
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true })
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
      setFile(f.name); setRes(parseStatementRows(rows as any)); setOpen(true)
    } catch { toast.error('Could not read that file. Use a CSV or Excel export.') } finally { setBusy(false) }
  }
  const run = async () => {
    setBusy(true)
    try {
      const r = await importStatement(db, groups)
      toast.success(`Imported ${r.added} transaction${r.added === 1 ? '' : 's'}${r.funds ? ` and ${r.funds} new fund${r.funds === 1 ? '' : 's'}` : ''}${r.skipped ? `, ${r.skipped} already recorded` : ''}`)
      setOpen(false)
    } catch { toast.error('Import failed. Nothing was changed.') } finally { setBusy(false) }
  }

  return (
    <>
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileUp className="mr-1.5 h-4 w-4" />}Import statement</Button>
      <input ref={ref} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = '' }} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import statement</DialogTitle><DialogDescription>{file}: review before anything is added. The file is read in your browser and never uploaded.</DialogDescription></DialogHeader>
          {res && res.txns.length === 0 ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{res.errors[0] ?? 'No transactions found.'} Expected columns such as Scheme, Folio, Date, Type, Amount, Units and NAV.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p><strong>{res?.txns.length}</strong> transactions across <strong>{groups.length}</strong> fund{groups.length === 1 ? '' : 's'}. Transactions you already have are skipped.</p>
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">{groups.map((g) => { const p = positionFrom(g.txns); return (
                <li key={g.key} className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0"><span className="block truncate font-medium">{g.name}</span><span className="text-xs text-muted-foreground">{g.folio ? `Folio ${g.folio} · ` : ''}{g.txns.length} txns · {g.txns[0].date} to {g.txns[g.txns.length - 1].date}</span></span><span className="shrink-0 text-right text-xs text-muted-foreground">{p.units} units<br />{formatINR(p.invested)}</span></li>) })}</ul>
              {res && res.errors.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{res.errors.length} row{res.errors.length === 1 ? '' : 's'} skipped</summary><ul className="mt-1 list-disc pl-4">{res.errors.slice(0, 10).map((e) => <li key={e}>{e}</li>)}</ul></details>}
              <p className="text-xs text-muted-foreground">New funds use the last NAV in the file until you update it. Redemptions reduce your cost at the average price.</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={run} disabled={busy || !res?.txns.length}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
