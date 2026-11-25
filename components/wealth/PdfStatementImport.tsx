'use client'

import { FootNote, InfoTip } from '@/components/wealth/kit'
import { useMemo, useRef, useState } from 'react'
import { FileText, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWealth } from '@/lib/wealth/WealthContext'
import { importHoldings, importStatement } from '@/lib/wealth/actions'
import { groupByFund, positionFrom } from '@/lib/wealth/statementImport'
import { parseStatementText } from '@/lib/wealth/pdfStatements'
import { formatDate, formatINR } from '@/lib/wealth/format'

const MAX_BYTES = 15 * 1024 * 1024
type Parsed = ReturnType<typeof parseStatementText>
type Row = { id: string; category: 'stocks' | 'nps' | 'epf'; name: string; value: string; notes: string; asOf: string | null; on: boolean }

/**
 * Import holdings from a statement PDF: CAMS / KFintech CAS (funds), NSDL / CDSL demat CAS (stocks), NPS and EPF.
 * The PDF is read in this browser tab and never uploaded. Nothing is saved until you review it and press Import.
 */
export function PdfStatementImport({ label = 'Import PDF' }: { label?: string }) {
  const { db } = useWealth()
  const fileRef = useRef<HTMLInputElement>(null)
  const picked = useRef<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [askPwd, setAskPwd] = useState<null | { wrong: boolean }>(null)
  const [pwd, setPwd] = useState('')
  const [name, setName] = useState('')
  const [res, setRes] = useState<Parsed | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [fundsOn, setFundsOn] = useState(true)

  const groups = useMemo(() => (res ? groupByFund(res.txns).map((g: any) => ({ ...g, closing: res.closing[`${g.folio}|${g.name}`] })) : []), [res])

  const read = async (file: File, password?: string) => {
    setBusy(true)
    try {
      const { readPdfText } = await import('@/lib/wealth/pdfText')
      const r = await readPdfText(file, password)
      if ('needPassword' in r) { setAskPwd({ wrong: !!r.wrongPassword }); return }
      setAskPwd(null); setPwd('')
      const parsed = parseStatementText(r.text)
      const list: Row[] = [
        ...parsed.holdings.map((h: any, i: number) => ({ id: `s${i}`, category: 'stocks' as const, name: h.name, value: String(h.value), notes: `${h.units != null ? `${h.units} units` : 'Units not read'}${h.price ? ` at ${formatINR(h.price)}` : ''}. ISIN ${h.isin}. Imported from a statement.`, asOf: null, on: true })),
        ...parsed.nps.map((a: any, i: number) => ({ id: `n${i}`, category: 'nps' as const, name: a.name, value: String(a.value), notes: 'Imported from an NPS statement.', asOf: a.asOf, on: true })),
        ...parsed.epf.map((a: any, i: number) => ({ id: `e${i}`, category: 'epf' as const, name: a.name, value: String(a.value), notes: `Employee ${formatINR(a.employee)} + employer ${formatINR(a.employer)}${a.pension ? `. Pension (EPS) ${formatINR(a.pension)} is not included` : ''}. Imported from a passbook.`, asOf: a.asOf, on: true })),
      ]
      setName(file.name); setRes(parsed); setRows(list); setFundsOn(true)
    } catch {
      toast.error('Could not read that PDF. If it is a scan or image, text cannot be extracted.')
    } finally { setBusy(false) }
  }

  const choose = (f: File) => {
    if (f.type && f.type !== 'application/pdf') return toast.warning('Choose a PDF file')
    if (f.size > MAX_BYTES) return toast.warning('File is larger than 15 MB')
    picked.current = f
    read(f)
  }

  const run = async () => {
    setBusy(true)
    try {
      const out: string[] = []
      if (fundsOn && groups.length) {
        const r = await importStatement(db, groups)
        out.push(`${r.added} fund transaction${r.added === 1 ? '' : 's'}${r.funds ? ` (${r.funds} new fund${r.funds === 1 ? '' : 's'})` : ''}${r.skipped ? `, ${r.skipped} already recorded` : ''}`)
      }
      const chosen = rows.filter((r) => r.on && Number(r.value) > 0)
      if (chosen.length) {
        const r = await importHoldings(db, chosen.map((c) => ({ category: c.category, name: c.name, value: Number(c.value), notes: c.notes, asOf: c.asOf })))
        out.push(`${r.added} added and ${r.updated} updated under Net Worth assets`)
      }
      toast.success(out.length ? `Imported: ${out.join('; ')}` : 'Nothing selected to import')
      setRes(null)
    } catch { toast.error('Import failed. Nothing was changed.') } finally { setBusy(false) }
  }

  const nothing = !!res && res.found.length === 0
  const somethingOn = (fundsOn && groups.length > 0) || rows.some((r) => r.on)
  const section = (title: string, cat: Row['category']) => {
    const mine = rows.filter((r) => r.category === cat)
    if (!mine.length) return null
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <Checkbox checked={r.on} onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, on: e.target.checked } : x)))} aria-label={`Include ${r.name}`} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.name}</span>{r.asOf && <span className="text-xs text-muted-foreground">as on {formatDate(r.asOf)}</span>}</span>
              <div className="w-32 shrink-0"><Input type="number" inputMode="decimal" min="0" step="any" aria-label={`Value of ${r.name} in rupees`} className="h-9 text-right tabular-nums" value={r.value} onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))} /></div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}{label}</Button>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) choose(f); e.target.value = '' }} />

      {/* Password */}
      <Dialog open={!!askPwd} onOpenChange={(o) => { if (!o) { setAskPwd(null); setPwd('') } }}>
        <DialogContent>
          <DialogHeader><div className="flex items-center gap-2"><DialogTitle>Statement password</DialogTitle><InfoTip label="Details">This PDF is protected. It is usually your PAN in capital letters, sometimes with your date of birth. The password stays in this tab and is not stored.</InfoTip></div><DialogDescription className="sr-only">This PDF is protected. It is usually your PAN in capital letters, sometimes with your date of birth. The password stays in this tab and is not stored.</DialogDescription></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (picked.current && pwd) read(picked.current, pwd) }}>
            <Input type="password" autoComplete="off" autoFocus aria-label="PDF password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            {askPwd?.wrong && <p role="alert" className="text-sm text-destructive">That password did not open the file. Try again.</p>}
            <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" onClick={() => { setAskPwd(null); setPwd('') }}>Cancel</Button><Button type="submit" disabled={!pwd || busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Lock className="mr-1.5 h-4 w-4" />}Unlock</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!res} onOpenChange={(o) => !o && setRes(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><div className="flex items-center gap-2"><DialogTitle>Review before importing</DialogTitle><InfoTip label="Details">{name}. Read in your browser only. Check every figure; layouts differ between providers, and you can edit values or untick anything.</InfoTip></div><DialogDescription className="sr-only">{name}. Read in your browser only. Check every figure; layouts differ between providers, and you can edit values or untick anything.</DialogDescription></DialogHeader>
          {nothing ? (
            <p className="rounded-xl bg-muted px-3 py-3 text-sm">We could not find anything we recognise. Supported: CAMS and KFintech CAS (funds), NSDL and CDSL demat statements (stocks), NPS statements and EPF passbooks. Scanned or image PDFs cannot be read.</p>
          ) : (
            <div className="max-h-[55dvh] space-y-4 overflow-y-auto pr-1">
              {groups.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mutual funds</p>
                  <label className="flex items-center gap-3 text-sm"><Checkbox checked={fundsOn} onChange={(e) => setFundsOn(e.target.checked)} />Import {res?.txns.length} transactions across {groups.length} fund{groups.length === 1 ? '' : 's'}. Ones you already have are skipped.</label>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {groups.map((g: any) => { const p = positionFrom(g.txns); return (
                      <li key={g.key} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{g.name}</span><span className="text-xs text-muted-foreground">{g.folio ? `Folio ${g.folio} · ` : ''}{g.txns.length} transactions{g.closing ? ` · NAV ${g.closing.nav} on ${formatDate(g.closing.date)}` : ''}</span></span><span className="shrink-0 text-right tabular-nums"><span className="block">{p.units} units</span><span className="text-xs text-muted-foreground">cost {formatINR(p.invested)}</span></span></li>
                    ) })}
                  </ul>
                </div>
              )}
              {section('Stocks', 'stocks')}
              {section('NPS', 'nps')}
              {section('EPF', 'epf')}
              {res && res.mfUnitsSkipped > 0 && <p className="text-xs text-muted-foreground">{res.mfUnitsSkipped} mutual fund holding{res.mfUnitsSkipped === 1 ? '' : 's'} inside the demat were not imported here. Use the CAMS or KFintech CAS for fund transactions.</p>}
              <FootNote>Stocks, NPS and EPF are saved as Net Worth assets at the value shown. Importing again updates the same entries instead of adding duplicates.</FootNote>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setRes(null)}>Cancel</Button><Button onClick={run} disabled={busy || nothing || !somethingOn}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
