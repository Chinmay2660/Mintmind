'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { toast } from 'sonner'
import { Cloud, Download, Eye, FileText, Folder, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { toISO } from '@/lib/wealth/calc'
import { formatDate } from '@/lib/wealth/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Progress, Select } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Personal', 'Identity', 'Bank', 'Investment', 'Insurance', 'Property', 'Family']
const MAX = 25 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.doc,.docx,.xls,.xlsx'

interface Doc { id: string; name: string; fileName?: string; category: string; mimeType?: string; size?: number; notes?: string; uploaded?: string; hasFile?: boolean }
interface Pending { key: string; file: File; name: string; category: string; notes: string; progress: number; error?: string }

const fmtSize = (n = 0) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function DocumentsPage() {
  const { ready, isDemo, db, data } = useWealth()
  const [remote, setRemote] = useState<Doc[] | null>(null)
  const [drive, setDrive] = useState<{ configured: boolean; connected: boolean; reason?: string } | null>(null)
  const [cat, setCat] = useState('All')
  const [pending, setPending] = useState<Pending[]>([])
  const [form, setForm] = useState<null | { file?: File; doc?: Doc }>(null)
  const [preview, setPreview] = useState<null | { doc: Doc; url: string }>(null)
  const [del, setDel] = useState<Doc | null>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<Doc | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    if (isDemo) return
    try {
      const [s, l] = await Promise.all([axios.get('/api/drive/status'), axios.get('/api/drive/files')])
      setDrive(s.data)
      setRemote(l.data.documents.map((d: Doc) => ({ ...d, hasFile: true })))
    } catch {
      setDrive({ configured: false, connected: false })
      setRemote([])
    }
  }, [isDemo])
  useEffect(() => { if (ready) refresh() }, [ready, refresh])

  const docs: Doc[] = useMemo(() => (isDemo ? data.documents.map((d: any) => ({ id: d.id, name: d.name, fileName: d.fileName, category: d.category, mimeType: d.mimeType, size: d.size, notes: d.notes, uploaded: d.uploaded, hasFile: !!d.blob })) : remote ?? []), [isDemo, data.documents, remote])
  const shown = docs.filter((d) => cat === 'All' || d.category === cat)

  const authErr = (e: unknown) => (axios.isAxiosError(e) && e.response?.data?.code === 'DRIVE_AUTH' ? (refresh(), 'Google Drive needs to be reconnected (Settings → Integrations).') : axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Upload failed')

  const send = async (p: Pending) => {
    setPending((l) => l.map((x) => (x.key === p.key ? { ...x, error: undefined, progress: 0 } : x)))
    try {
      if (isDemo) {
        await db.documents.put({ id: uid('doc'), name: p.name, category: p.category, fileName: p.file.name, mimeType: p.file.type, size: p.file.size, source: 'demo', driveFileId: null, uploaded: toISO(new Date()), notes: p.notes, blob: p.file })
      } else {
        const fd = new FormData(); fd.set('file', p.file); fd.set('name', p.name); fd.set('category', p.category); fd.set('notes', p.notes)
        await axios.post('/api/drive/files', fd, { onUploadProgress: (e) => setPending((l) => l.map((x) => (x.key === p.key ? { ...x, progress: Math.round(((e.loaded || 0) / (e.total || p.file.size)) * 100) } : x))) })
        await refresh()
      }
      setPending((l) => l.filter((x) => x.key !== p.key))
      toast.success(`${p.name} uploaded`)
    } catch (e) {
      setPending((l) => l.map((x) => (x.key === p.key ? { ...x, error: authErr(e) } : x)))
    }
  }

  const onPick = (file?: File) => {
    if (!file) return
    if (file.size > MAX) return void toast.error('File is larger than 25 MB')
    setForm({ file })
  }

  const openPreview = async (d: Doc) => {
    if (isDemo) {
      const row = await db.documents.get(d.id)
      if (!row?.blob) return void toast.info('This is a sample entry without a file. Upload a file to preview it.')
      setPreview({ doc: d, url: URL.createObjectURL(row.blob) })
    } else setPreview({ doc: d, url: `/api/drive/files/${d.id}` })
  }
  const download = async (d: Doc) => {
    if (isDemo) {
      const row = await db.documents.get(d.id)
      if (!row?.blob) return void toast.info('This is a sample entry without a file.')
      const a = document.createElement('a'); a.href = URL.createObjectURL(row.blob); a.download = d.fileName || d.name; a.click()
    } else window.location.href = `/api/drive/files/${d.id}?download=1`
  }
  const doReplace = async (file?: File) => {
    const d = replaceTarget.current
    if (!file || !d) return
    if (file.size > MAX) return void toast.error('File is larger than 25 MB')
    try {
      if (isDemo) await db.documents.update(d.id, { blob: file, fileName: file.name, mimeType: file.type, size: file.size })
      else { const fd = new FormData(); fd.set('file', file); await axios.put(`/api/drive/files/${d.id}`, fd); await refresh() }
      toast.success('File replaced')
    } catch (e) { toast.error(authErr(e)) }
  }

  if (!ready || (!isDemo && drive === null)) return <LoadingBlock className="h-64" />
  const blocked = !isDemo && !(drive?.connected)

  return (
    <div className="space-y-5">
      <PageHeader actions={<>
        <Button disabled={blocked} onClick={() => pickRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" />Upload</Button>
        <input ref={pickRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { doReplace(e.target.files?.[0]); e.target.value = '' }} />
      </>} />

      {blocked && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3"><Cloud className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-medium">{drive?.reason === 'expired' ? 'Reconnect Google Drive' : 'Connect Google Drive'}</p>
              <p className="text-sm text-muted-foreground">{!drive?.configured ? 'Google Drive isn’t available yet. The app administrator needs to set it up.' : 'Your documents are stored in your own Drive. We can only see files this app creates.'}</p></div></div>
            {drive?.configured ? <Button asChild><a href="/api/drive/connect">Connect</a></Button> : <Button asChild variant="outline"><Link href="/dashboard/settings">Settings</Link></Button>}
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
        {['All', ...CATEGORIES].map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cn('flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium', cat === c ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{c !== 'All' && <Folder className="h-3 w-3" />}{c}</button>)}
      </div>

      {pending.length > 0 && (
        <Panel title="Uploading">
          <ul className="space-y-3">{pending.map((p) => (
            <li key={p.key} className="text-sm"><div className="mb-1 flex justify-between gap-2"><span className="truncate">{p.name}</span>{p.error ? <Button size="sm" variant="outline" onClick={() => send(p)}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button> : <span>{p.progress}%</span>}</div>
              {p.error ? <p className="text-xs text-destructive">{p.error}</p> : <Progress value={p.progress} label={`Uploading ${p.name}`} />}</li>
          ))}</ul>
        </Panel>
      )}

      {shown.length === 0 ? <Empty title="No documents" description={blocked ? 'Connect Google Drive to upload documents.' : 'Upload IDs, statements, policies and property papers.'} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <div key={d.id} className="surface-card p-4">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{d.name}</p><p className="truncate text-xs text-muted-foreground">{d.category} · {fmtSize(d.size)} · {formatDate(d.uploaded?.slice(0, 10))}</p>{d.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{d.notes}</p>}</div></div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={() => openPreview(d)}><Eye className="mr-1 h-3.5 w-3.5" />Preview</Button>
                <Button size="sm" variant="outline" onClick={() => download(d)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
                <Button size="sm" variant="outline" disabled={blocked} onClick={() => { replaceTarget.current = d; replaceRef.current?.click() }}><RefreshCw className="mr-1 h-3.5 w-3.5" />Replace</Button>
                <Button size="sm" variant="ghost" onClick={() => setForm({ doc: d })} aria-label={`Edit ${d.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(d)} aria-label={`Delete ${d.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <MetaForm init={form.doc ?? { name: form.file!.name.replace(/\.[^.]+$/, ''), category: 'Personal', notes: '' }} isEdit={!!form.doc} onClose={() => setForm(null)}
        onSave={async (v) => {
          if (form.doc) {
            if (isDemo) await db.documents.update(form.doc.id, v)
            else { const fd = new FormData(); fd.set('name', v.name); fd.set('category', v.category); fd.set('notes', v.notes); await axios.put(`/api/drive/files/${form.doc.id}`, fd).catch((e) => { throw new Error(authErr(e)) }); await refresh() }
            toast.success('Saved')
          } else { const p: Pending = { key: uid('up'), file: form.file!, ...v, progress: 0 }; setPending((l) => [...l, p]); send(p) }
        }} />}

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) { if (isDemo && preview) URL.revokeObjectURL(preview.url); setPreview(null) } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{preview?.doc.name}</DialogTitle><DialogDescription className="sr-only">Document preview</DialogDescription></DialogHeader>
          {preview && (preview.doc.mimeType?.startsWith('image/') ? <img src={preview.url} alt={preview.doc.name} className="max-h-[70vh] w-full rounded-lg object-contain" /> : preview.doc.mimeType === 'application/pdf' || preview.doc.mimeType === 'text/plain' ? <iframe src={preview.url} title={preview.doc.name} sandbox="" className="h-[70vh] w-full rounded-lg border border-border" /> : <p className="text-sm text-muted-foreground">Preview isn&apos;t available for this file type. Use Download instead.</p>)}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete ${del?.name}?`} description={isDemo ? 'Removes this demo entry.' : 'The file is also removed from your Google Drive.'} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { try { if (isDemo) await db.documents.delete(del!.id); else { await axios.delete(`/api/drive/files/${del!.id}`); await refresh() } toast.success('Deleted') } catch (e) { toast.error(authErr(e)) } setDel(null) }} />
    </div>
  )
}

function MetaForm({ init, isEdit, onClose, onSave }: { init: { name: string; category: string; notes?: string }; isEdit: boolean; onClose: () => void; onSave: (v: { name: string; category: string; notes: string }) => Promise<void> }) {
  const [f, setF] = useState({ name: init.name, category: init.category, notes: init.notes || '' })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={isEdit ? 'Edit document' : 'Upload document'} submitLabel={isEdit ? 'Save' : 'Upload'} onSubmit={() => onSave(f)}>
      <Field label="Name" className="full">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Category" hint={isEdit ? 'Changing category moves the file to that folder in Drive.' : undefined} className="full">{(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
      <Field label="Notes" className="full">{(id) => <Input id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
    </FormDialog>
  )
}
