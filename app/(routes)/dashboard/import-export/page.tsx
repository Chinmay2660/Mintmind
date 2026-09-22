'use client'

import { useRef, useState } from 'react'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/form-buttons'
import { FormActions, FormField, FormGrid, FormSection } from '@/components/ui/form-layout'

const EXPORT_TYPES = [
  { type: 'transactions', label: 'Transactions' },
  { type: 'investments', label: 'Investments' },
  { type: 'budgets', label: 'Budgets' },
  { type: 'goals', label: 'Goals' },
  { type: 'all', label: 'All Data' },
]

interface ImportPreview {
  total: number
  valid: number
  errors: { row: number; error: string }[]
  preview: { type?: string; amount?: number; description?: string; date?: string }[]
}

export default function ImportExportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('transactions')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = (type: string) => {
    window.open(`/api/export?type=${type}`, '_blank')
  }

  const handlePreview = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }
    setPreviewing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)
      formData.append('preview', 'true')
      const res = await request.post('/api/import', formData)
      setPreview(res.data as ImportPreview)
      toast.success(`Found ${res.data.valid} valid rows`)
    } catch {
      toast.error('Failed to preview import')
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', importType)
      formData.append('preview', 'false')
      const res = await request.post('/api/import', formData)
      toast.success(`Imported ${res.data.imported} records`)
      setPreview(null)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Failed to import data')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        subtitle="Backup and restore your financial data"
      />

      <Card className="p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Export Data</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Download your data as an Excel spreadsheet.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_TYPES.map(({ type, label }) => (
            <Button key={type} variant="outline" onClick={() => handleExport(type)}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Import Data</h2>
        </div>
        <FormGrid>
          <FormSection>
            <FormField label="Data type">
              <select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value)
                  setPreview(null)
                }}
                className="form-select"
              >
                <option value="transactions">Transactions</option>
              </select>
            </FormField>
            <FormField label="File (.xlsx, .xls, .csv)" span="full">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setPreview(null)
                }}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
            </FormField>
          </FormSection>
          <FormActions>
            <SubmitButton
              type="button"
              onClick={handlePreview}
              isLoading={previewing}
            >
              Preview import
            </SubmitButton>
            <SubmitButton
              type="button"
              onClick={handleImport}
              isLoading={importing}
              disabled={!preview}
            >
              Confirm import
            </SubmitButton>
          </FormActions>
        </FormGrid>

        {preview && (
          <div className="mt-6 rounded-xl border border-border/60 p-4">
            <p className="mb-3 text-sm font-medium">
              Preview: {preview.valid} of {preview.total} rows valid
              {preview.errors.length > 0 && ` · ${preview.errors.length} errors`}
            </p>
            {preview.preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Description</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 pr-4">{row.type}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.amount}</td>
                        <td className="py-2 pr-4">{row.description}</td>
                        <td className="py-2">
                          {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.errors.length > 0 && (
              <div className="mt-3 text-xs text-destructive">
                {preview.errors.slice(0, 5).map((err) => (
                  <p key={err.row}>Row {err.row}: {err.error}</p>
                ))}
                {preview.errors.length > 5 && (
                  <p>…and {preview.errors.length - 5} more errors</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
