'use client'

import { documentIcon } from '@/lib/categoryIcons'
import { CategoryCarousel } from '@/components/ui/category-carousel'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { toast } from 'sonner'
import { Cloud, Lock, RefreshCw, Search, Upload } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { toISO } from '@/lib/wealth/calc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DocumentCard } from '@/components/wealth/DocumentCard'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Progress, Select } from '@/components/wealth/kit'
import { Pagination } from '@/components/ui/pagination'
import { usePagination, useServerPagination } from '@/lib/hooks/usePagination'
import { matchesAll } from '@/lib/search'

const CATEGORIES = ['Personal', 'Identity', 'Bank', 'Investment', 'Insurance', 'Property', 'Family']
const MAX = 25 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.doc,.docx,.xls,.xlsx'

interface Doc { id: string; name: string; fileName?: string; category: string; mimeType?: string; size?: number; notes?: string; uploaded?: string; hasFile?: boolean }
interface Pending { key: string; file: File; name: string; category: string; notes: string; progress: number; error?: string }

const fmtSize = (n = 0) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export function DocumentsView() {
  const { ready, isDemo, db, data } = useWealth()
  const [, setRemote] = useState<Doc[] | null>(null)
  const [drive, setDrive] = useState<{ configured: boolean; connected: boolean; reason?: string } | null>(null)
  // one category at a time. It opens on the first one that has documents (the newest document's, for a real account), until you pick one.
  const [picked, setPicked] = useState<string | null>(null)
  const [remoteFirst, setRemoteFirst] = useState<string | null>(null)
  const demoFirst = CATEGORIES.find((c) => (data.documents as any[]).some((d) => d.category === c))
  const cat = picked ?? (isDemo ? demoFirst : remoteFirst) ?? CATEGORIES[0]
  const setCat = setPicked
  useEffect(() => {
    if (!ready || isDemo || !drive?.connected) return
    let live = true
    axios.get('/api/drive/files', { params: { limit: 1 } }).then((r) => { const c = r.data.documents?.[0]?.category; if (live && CATEGORIES.includes(c)) setRemoteFirst(c) }).catch(() => {})
    return () => { live = false }
  }, [ready, isDemo, drive?.connected])
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('') // the search, a moment after typing stops, so the server is not asked on every key
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t) }, [q])
  // Real accounts: the server returns one filtered page at a time. The demo has everything on the device, so it pages locally below.
  const sp = useServerPagination<Doc>(async ({ page, pageSize }) => {
    const r = await axios.get('/api/drive/files', { params: { page, limit: pageSize, category: dq ? undefined : cat, q: dq || undefined } })
    return { items: r.data.documents.map((d: Doc) => ({ ...d, hasFile: true })), total: r.data.total ?? r.data.documents.length }
  }, { pageSize: 12, resetKey: `${cat}|${dq}`, enabled: ready && !isDemo && !!drive?.connected })
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
      const st = await axios.get('/api/drive/status')
      setDrive(st.data)
      sp.refresh()
    } catch {
      setDrive({ configured: false, connected: false })
      setRemote([])
    }
  }, [isDemo])
  useEffect(() => { if (ready) refresh() }, [ready, refresh])

  const docs: Doc[] = useMemo(() => (isDemo ? data.documents.map((d: any) => ({ id: d.id, name: d.name, fileName: d.fileName, category: d.category, mimeType: d.mimeType, size: d.size, notes: d.notes, uploaded: d.uploaded, hasFile: !!d.blob })) : sp.items), [isDemo, data.documents, sp.items])
  const filtered = isDemo ? docs.filter((d) => (dq ? true : d.category === cat) && matchesAll(dq, d.name, d.fileName, d.category, d.notes)) : docs
  const local = usePagination(filtered, { pageSize: 12, resetKey: `${cat}|${dq}` })
  const shown = isDemo ? local.slice : sp.items
  const pg = isDemo ? { ...local, loading: false } : { ...sp, loading: sp.loading }

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
    if (file.size > MAX) return void toast.warning('File is larger than 25 MB')
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
    if (file.size > MAX) return void toast.warning('File is larger than 25 MB')
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
              <p className="text-sm text-muted-foreground">{!drive?.configured ? 'Google Drive connection isn’t available right now. Please try again later.' : 'Your documents are stored in your own Google Drive. Mintmind can only see the files it creates or that you choose to add, and it does not encrypt them.'}</p></div></div>
            {drive?.configured ? <Button asChild><a href="/api/drive/connect">Connect</a></Button> : <Button asChild variant="outline"><Link href="/dashboard/settings">Settings</Link></Button>}
          </div>
        </Panel>
      )}

      {!isDemo && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>Files live in your Google Drive and are <strong className="font-semibold text-foreground">not encrypted by Mintmind</strong>. Anyone who can open your Google account can open them. Keep passwords, PINs and recovery codes in the Vault, not in a document.</span></p>
      )}

      <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search documents" className="h-10 pl-9" placeholder="Search name, category, notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <CategoryCarousel label="Document categories" value={cat} onChange={setCat} items={CATEGORIES.map((c) => ({ key: c, label: c, icon: documentIcon(c) }))} />
      {dq && <p className="-mt-2 text-xs text-muted-foreground">Searching every category.</p>}

      {pending.length > 0 && (
        <Panel title="Uploading">
          <ul className="space-y-3">{pending.map((p) => (
            <li key={p.key} className="text-sm"><div className="mb-1 flex justify-between gap-2"><span className="truncate">{p.name}</span>{p.error ? <Button size="sm" variant="outline" onClick={() => send(p)}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button> : <span>{p.progress}%</span>}</div>
              {p.error ? <p className="text-xs text-destructive">{p.error}</p> : <Progress value={p.progress} label={`Uploading ${p.name}`} />}</li>
          ))}</ul>
        </Panel>
      )}

      {shown.length === 0 && !pg.loading ? <Empty title={dq || cat !== 'All' ? 'No matches' : 'No documents'} description={dq || cat !== 'All' ? 'Try a different word or category.' : blocked ? 'Connect Google Drive to upload documents.' : 'Upload IDs, statements, policies and property papers.'} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <DocumentCard key={d.id} doc={d} sizeLabel={fmtSize(d.size)} replaceDisabled={blocked}
              onPreview={() => openPreview(d)} onDownload={() => download(d)}
              onReplace={() => { replaceTarget.current = d; replaceRef.current?.click() }}
              onEdit={() => setForm({ doc: d })} onDelete={() => setDel(d)} />
          ))}
        </div>
      )}
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} from={pg.from} to={pg.to} pageSize={pg.pageSize} onPage={pg.setPage} onPageSize={pg.setPageSize} loading={pg.loading} label="Documents pages" />

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
          {preview && (preview.doc.mimeType?.startsWith('image/') ? <img src={preview.url} alt={preview.doc.name} className="max-h-[70vh] w-full rounded-lg object-contain" /> : preview.doc.mimeType === 'application/pdf' || preview.doc.mimeType === 'text/plain' ? preview.doc.mimeType === 'application/pdf' ? <object data={preview.url} type="application/pdf" aria-label={preview.doc.name} className="h-[70vh] w-full rounded-lg border border-border"><p className="p-4 text-sm text-muted-foreground">Your browser can&apos;t show this PDF here. Use Download instead.</p></object> : <iframe src={preview.url} title={preview.doc.name} sandbox="" className="h-[70vh] w-full rounded-lg border border-border" /> : <p className="text-sm text-muted-foreground">Preview isn&apos;t available for this file type. Use Download instead.</p>)}
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
