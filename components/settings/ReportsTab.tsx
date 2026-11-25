'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { REPORTS, buildReport, sheetNames } from '@/lib/wealth/reports'
import { toISO } from '@/lib/wealth/calc'
import { Button } from '@/components/ui/button'
import { DateInput, Panel } from '@/components/wealth/kit'
import { toastProblem } from '@/lib/notify'
import { ImportCsvDialog } from '@/components/wealth/budget/ImportCsvDialog'
import { StatementImportButton } from '@/components/wealth/StatementImport'
import { PdfStatementImport } from '@/components/wealth/PdfStatementImport'

type Report = ReturnType<typeof buildReport>

const fmt = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(v ?? ''))

/**
 * Settings > Import & export: bring in transactions and fund statements, and download any report as an Excel workbook or print it to PDF. The PDF uses the browser's own
 * "Save as PDF", from a page laid out for paper, so nothing is sent anywhere.
 */
export function ReportsTab() {
  const { data } = useWealth()
  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(`${toISO(today).slice(0, 7)}-01`)
  const [to, setTo] = useState(toISO(today))
  const [printing, setPrinting] = useState<Report | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const make = (key: string) => buildReport(key, data as any, { from, to, today })

  const excel = async (key: string) => {
    setBusy(key)
    try {
      const rep = make(key)
      const XLSX = await import('xlsx') // loaded only when a workbook is asked for
      const wb = XLSX.utils.book_new()
      const names = sheetNames(rep.sheets)
      rep.sheets.forEach((s, i) => {
        const ws = XLSX.utils.aoa_to_sheet([s.columns, ...s.rows])
        ws['!cols'] = s.columns.map((c: string, ci: number) => ({ wch: Math.min(40, Math.max(c.length + 2, ...s.rows.map((r: unknown[]) => String(r[ci] ?? '').length + 2))) }))
        XLSX.utils.book_append_sheet(wb, ws, names[i])
      })
      XLSX.writeFile(wb, `mintmind-${key}-${toISO(today)}.xlsx`)
      toast.success('Excel file downloaded')
    } catch (e) { toastProblem(e, 'Could not make the Excel file') } finally { setBusy(null) }
  }

  const pdf = (key: string) => setPrinting(make(key))
  useEffect(() => {
    if (!printing) return
    const prev = document.title
    document.title = `mintmind-${printing.key}-${toISO(today)}`
    const done = () => { document.title = prev; setPrinting(null) }
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 150) // let the print layout draw first
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done) }
  }, [printing, today])

  return (
    <>
      <div className="space-y-4 print:hidden">
        <section>
          <h2 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Import</h2>
          <ul className="surface-card divide-y divide-border px-4">
            <li className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">Transactions</p><p className="text-xs text-muted-foreground">From a bank or card statement saved as CSV.</p></div>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>Import CSV</Button>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">Mutual fund statement</p><p className="text-xs text-muted-foreground">A CSV or Excel export from your fund house or registrar.</p></div>
              <StatementImportButton />
            </li>
            <li className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">Mutual fund statement (PDF)</p><p className="text-xs text-muted-foreground">A text PDF statement. Scans and photos cannot be read.</p></div>
              <PdfStatementImport label="Import PDF" />
            </li>
          </ul>
        </section>
        <h2 className="-mb-2 px-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Export</h2>
        <Panel title="Period" description="Used by Transactions, Budget (the month of the end date) and Everything. The other reports are as of today.">
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <label className="min-w-0 text-xs text-muted-foreground">From<div className="mt-0.5"><DateInput aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div></label>
            <label className="min-w-0 text-xs text-muted-foreground">To<div className="mt-0.5"><DateInput aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div></label>
          </div>
        </Panel>
        <ul className="surface-card divide-y divide-border px-4">
          {REPORTS.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.description}</p></div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" disabled={busy === r.key} onClick={() => excel(r.key)} aria-label={`${r.title}: download Excel`}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Excel</Button>
                <Button size="sm" variant="outline" onClick={() => pdf(r.key)} aria-label={`${r.title}: print or save as PDF`}><Printer className="mr-1.5 h-4 w-4" />PDF</Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-muted-foreground">For PDF, choose "Save as PDF" as the printer in the window that opens.</p>
      </div>

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />

      {printing && (
        <div className="hidden print:block" aria-hidden>
          <h1 className="text-xl font-semibold">Mintmind: {printing.title}</h1>
          <p className="mb-4 text-xs">{printing.note}</p>
          {printing.sheets.map((s) => (
            <section key={s.name} className="mb-6 break-inside-avoid-page">
              <h2 className="mb-1 text-sm font-semibold">{s.name}</h2>
              <table className="w-full border-collapse text-[11px]">
                <thead><tr>{s.columns.map((c: string) => <th key={c} className="border-b border-black px-1.5 py-1 text-left font-semibold">{c}</th>)}</tr></thead>
                <tbody>{s.rows.map((row: unknown[], i: number) => <tr key={i}>{row.map((cell, j) => <td key={j} className={`border-b border-gray-300 px-1.5 py-1 ${typeof cell === 'number' ? 'text-right tabular-nums' : ''}`}>{fmt(cell)}</td>)}</tr>)}</tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
