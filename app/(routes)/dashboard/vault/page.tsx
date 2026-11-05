'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Download, Eye, EyeOff, Fingerprint, KeyRound, Lock, Pencil, Plus, RefreshCw, Search, Star, Trash2, Upload, Wand2 } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { uid } from '@/lib/wealth/db'
import { DEMO_VAULT_PASSWORD } from '@/lib/wealth/seedDemo'
import { biometricSupported, createVault, decryptJson, enableBiometric, encryptJson, generatePassword, passwordStrength, recoverVault, unlockVault, unlockWithBiometric, decryptBytes, encryptBytes } from '@/lib/vault/crypto'
import { setVaultSession } from '@/lib/vault/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, Field, FormDialog, LoadingBlock, PageHeader, Panel, Select } from '@/components/wealth/kit'
import { formatDate } from '@/lib/wealth/format'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Banking', 'Email', 'Social', 'Shopping', 'Work', 'Entertainment', 'Government', 'Other']
type Item = { id: string; type: 'login' | 'note'; name: string; url: string; username: string; password: string; category: string; notes: string; member: string; favourite: boolean; createdAt: string; updatedAt: string }

const DEMO_ITEMS: Partial<Item>[] = [
  { name: 'Netflix (demo)', url: 'https://netflix.com', username: 'arjun.demo@example.com', password: 'DemoNetflix#4821', category: 'Entertainment', member: 'Family' },
  { name: 'HDFC NetBanking (demo)', url: 'https://netbanking.hdfcbank.com', username: 'DEMO-CUST-0001', password: 'Fake-Bank!2209pw', category: 'Banking', member: 'Arjun Mehta', favourite: true },
  { name: 'Personal Email (demo)', url: 'https://mail.example.com', username: 'arjun.demo@example.com', password: 'Sample&Mail#7733', category: 'Email', member: 'Arjun Mehta', favourite: true },
  { name: 'Amazon (demo)', url: 'https://amazon.in', username: 'priya.demo@example.com', password: 'DemoCart$5510', category: 'Shopping', member: 'Priya Mehta' },
  { name: 'Home Wi-Fi (demo)', url: '', username: 'MehtaHome', password: 'fictional-wifi-pass-9', category: 'Other', member: 'Family', type: 'login' },
  { name: 'Locker instructions (demo)', type: 'note', notes: 'Fictional note: spare keys are with the building secretary. This is sample data.', category: 'Other', member: 'Family' },
]

const FAILS_KEY = 'mm-vault-fails'
function lockoutSeconds(): number {
  try {
    const { n, t } = JSON.parse(localStorage.getItem(FAILS_KEY) || '{}')
    if (!n || n < 5) return 0
    return Math.max(0, Math.ceil((t + Math.min(2 ** (n - 4) * 5000, 15 * 60 * 1000) - Date.now()) / 1000))
  } catch { return 0 }
}
const recordFail = () => { try { const o = JSON.parse(localStorage.getItem(FAILS_KEY) || '{}'); localStorage.setItem(FAILS_KEY, JSON.stringify({ n: (o.n || 0) + 1, t: Date.now() })) } catch { /* ignore */ } }
const clearFails = () => { try { localStorage.removeItem(FAILS_KEY) } catch { /* ignore */ } }

function StrengthMeter({ value }: { value: string }) {
  const s = passwordStrength(value)
  const color = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'][s.score]
  return (
    <div aria-live="polite">
      <div className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full bg-muted', value && i < Math.max(1, s.score) && color)} />)}</div>
      <p className="mt-1 text-xs text-muted-foreground">{value ? `${s.label} · ~${s.bits} bits` : 'Enter a password'}</p>
    </div>
  )
}

export default function VaultPage() {
  const { ready, db, isDemo, data } = useWealth()
  const [meta, setMeta] = useState<any>(undefined)
  const [session, setSession] = useState<null | { key: CryptoKey; bits: ArrayBuffer }>(null)
  const [items, setItems] = useState<Item[]>([])
  const [bioOk, setBioOk] = useState(false)
  const autoLock = (data.meta.find((m: any) => m.key === 'prefs')?.value?.autoLockMinutes ?? 5) as number

  useEffect(() => { biometricSupported().then(setBioOk) }, [])
  useEffect(() => { if (ready) db.meta.get('vault').then((m: any) => setMeta(m?.value ?? null)) }, [ready, db])

  const decryptAll = useCallback(async (key: CryptoKey) => {
    const rows = await db.vaultItems.toArray()
    const out: Item[] = []
    for (const r of rows) { try { out.push({ ...(await decryptJson(key, r)), id: r.id }) } catch { /* skip corrupt */ } }
    setItems(out)
  }, [db])

  const lock = useCallback(() => { setSession(null); setItems([]); setVaultSession(null) }, [])
  useEffect(() => { setVaultSession(session) }, [session])
  // Auto-lock on inactivity and when the tab is hidden for the whole timeout
  useEffect(() => {
    if (!session) return
    let t = setTimeout(lock, autoLock * 60_000)
    const reset = () => { clearTimeout(t); t = setTimeout(lock, autoLock * 60_000) }
    const ev = ['mousemove', 'keydown', 'click', 'touchstart']
    ev.forEach((e) => window.addEventListener(e, reset))
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)) }
  }, [session, autoLock, lock])
  useEffect(() => lock, [lock]) // lock when leaving the page

  const saveItem = async (it: Partial<Item>) => {
    if (!session) return
    const now = new Date().toISOString()
    const full: Item = { type: 'login', name: '', url: '', username: '', password: '', category: 'Other', notes: '', member: '', favourite: false, createdAt: now, ...it, updatedAt: now, id: it.id || uid('v') } as Item
    const { id, ...body } = full
    await db.vaultItems.put({ id, ...(await encryptJson(session.key, body)) })
    await decryptAll(session.key)
  }

  const seedDemoVault = useCallback(async () => {
    const { meta: m, key } = await createVault(DEMO_VAULT_PASSWORD)
    await db.meta.put({ key: 'vault', value: m })
    await db.vaultItems.clear()
    for (const d of DEMO_ITEMS) {
      const now = new Date().toISOString()
      const body = { type: 'login', url: '', username: '', password: '', notes: '', favourite: false, createdAt: now, updatedAt: now, ...d }
      await db.vaultItems.put({ id: uid('v'), ...(await encryptJson(key, body)) })
    }
    setMeta(m)
  }, [db])
  useEffect(() => { if (ready && isDemo && meta === null) seedDemoVault() }, [ready, isDemo, meta, seedDemoVault])

  if (!ready || meta === undefined || (isDemo && meta === null)) return <LoadingBlock className="h-64" />
  if (!session) return <LockScreen meta={meta} isDemo={isDemo} bioOk={bioOk} onSetup={async (m, key, bits) => { await db.meta.put({ key: 'vault', value: m }); setMeta(m); setSession({ key, bits }); setItems([]) }}
    onUnlock={async (s) => { setSession(s); await decryptAll(s.key) }} onMetaChange={async (m) => { await db.meta.put({ key: 'vault', value: m }); setMeta(m) }} reencrypt={async (oldKey, newKey) => { const rows = await db.vaultItems.toArray(); for (const r of rows) { const o = await decryptBytes(oldKey, r); await db.vaultItems.put({ id: r.id, ...(await encryptBytes(newKey, o)) }) } }} />
  return <Unlocked items={items} session={session} meta={meta} bioOk={bioOk} onLock={lock} onSave={saveItem} onDelete={async (id) => { await db.vaultItems.delete(id); await decryptAll(session.key) }} db={db} onMeta={async (m) => { await db.meta.put({ key: 'vault', value: m }); setMeta(m) }} reload={() => decryptAll(session.key)} />
}

function LockScreen({ meta, isDemo, bioOk, onSetup, onUnlock, onMetaChange, reencrypt }: { meta: any; isDemo: boolean; bioOk: boolean; onSetup: (m: any, k: CryptoKey, b: ArrayBuffer) => Promise<void>; onUnlock: (s: { key: CryptoKey; bits: ArrayBuffer }) => Promise<void>; onMetaChange: (m: any) => Promise<void>; reencrypt: (o: CryptoKey, n: CryptoKey) => Promise<void> }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [recKey, setRecKey] = useState<string | null>(null); const [recover, setRecover] = useState(false); const [rk, setRk] = useState('')
  const [wait, setWait] = useState(0)
  const setup = !meta
  useEffect(() => { setWait(lockoutSeconds()); const t = setInterval(() => setWait(lockoutSeconds()), 1000); return () => clearInterval(t) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (setup) {
        if (pw !== pw2) throw new Error('Passwords do not match')
        if (passwordStrength(pw).score < 3 || pw.length < 12) throw new Error('Choose a strong master password (12+ characters, mixed).')
        const v = await createVault(pw); setRecKey(v.recoveryKey); setPendingSetup({ ...v })
      } else if (recover) {
        const r = await recoverVault(meta, rk, pw)
        if (!r) throw new Error('Recovery key is incorrect')
        if (passwordStrength(pw).score < 3 || pw.length < 12) throw new Error('Choose a strong new master password.')
        const v = await createVault(pw) // fresh salt + new recovery key; re-encrypt items under it
        await reencrypt(r.oldKey, v.key)
        await onMetaChange(v.meta); setRecKey(v.recoveryKey); setPendingSetup({ ...v, existing: true })
      } else {
        if (lockoutSeconds() > 0) throw new Error('Too many attempts. Wait and try again.')
        const s = await unlockVault(meta, pw)
        if (!s) { recordFail(); setWait(lockoutSeconds()); throw new Error('Incorrect master password') }
        clearFails(); await onUnlock(s)
      }
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed') } finally { setBusy(false) }
  }
  const [pendingSetup, setPendingSetup] = useState<any>(null)

  if (recKey && pendingSetup) {
    return (
      <Panel title="Save your recovery key" className="mx-auto max-w-md">
        <p className="mb-3 text-sm text-muted-foreground">This is the only way to regain access if you forget your master password. We cannot recover it for you. Store it somewhere safe and offline.</p>
        <code className="block select-all rounded-lg bg-muted p-3 text-center text-lg tracking-wider">{recKey}</code>
        <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => { navigator.clipboard.writeText(recKey); toast.success('Copied') }}><Copy className="mr-2 h-4 w-4" />Copy</Button>
          <Button onClick={async () => { const p = pendingSetup; setRecKey(null); setPendingSetup(null); if (p.existing) { await onUnlock({ key: p.key, bits: p.bits }) } else await onSetup(p.meta, p.key, p.bits) }}>I&apos;ve saved it, continue</Button></div>
      </Panel>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader description="Zero-knowledge: everything is encrypted on this device with your master password. No one, including admins and family, can read it." />
      <Panel>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Lock className="h-5 w-5" /></span><div><p className="font-semibold">{setup ? 'Create your vault' : recover ? 'Recover with recovery key' : 'Vault locked'}</p>
            {isDemo && !setup && <p className="text-xs text-muted-foreground">Demo master password: <code>{DEMO_VAULT_PASSWORD}</code></p>}</div></div>
          {recover && <Field label="Recovery key">{(id) => <Input id={id} required value={rk} onChange={(e) => setRk(e.target.value)} placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX" autoComplete="off" />}</Field>}
          <Field label={setup ? 'Master password' : recover ? 'New master password' : 'Master password'}>{(id) => <Input id={id} type="password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={setup || recover ? 'new-password' : 'current-password'} />}</Field>
          {(setup || recover) && <StrengthMeter value={pw} />}
          {setup && <Field label="Confirm master password">{(id) => <Input id={id} type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />}</Field>}
          {wait > 0 && <p role="alert" className="text-sm text-warning">Too many failed attempts. Try again in {wait}s.</p>}
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy || wait > 0}>{setup ? 'Create vault' : recover ? 'Recover and set new password' : 'Unlock'}</Button>
          {!setup && meta?.biometric && bioOk && !recover && <Button type="button" variant="outline" className="w-full" onClick={async () => { try { const s = await unlockWithBiometric(meta.biometric); if (s) await onUnlock(s); else setErr('Biometric unlock failed') } catch { setErr('Biometric unlock was cancelled') } }}><Fingerprint className="mr-2 h-4 w-4" />Unlock with biometrics</Button>}
          {!setup && !isDemo && <button type="button" className="text-xs text-primary underline" onClick={() => { setRecover(!recover); setErr('') }}>{recover ? 'Back to unlock' : 'Forgot master password?'}</button>}
        </form>
      </Panel>
    </div>
  )
}

function Unlocked({ items, session, meta, bioOk, onLock, onSave, onDelete, db, onMeta, reload }: { items: Item[]; session: { key: CryptoKey; bits: ArrayBuffer }; meta: any; bioOk: boolean; onLock: () => void; onSave: (i: Partial<Item>) => Promise<void>; onDelete: (id: string) => Promise<void>; db: any; onMeta: (m: any) => Promise<void>; reload: () => Promise<void> }) {
  const { data } = useWealth()
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [favOnly, setFavOnly] = useState(false)
  const [edit, setEdit] = useState<null | { row?: Item; type: 'login' | 'note' }>(null); const [del, setDel] = useState<Item | null>(null); const [gen, setGen] = useState(false)
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const list = useMemo(() => items.filter((i) => (cat === 'All' || i.category === cat) && (!favOnly || i.favourite) && (!q || [i.name, i.username, i.url, i.member].some((x) => x?.toLowerCase().includes(q.toLowerCase())))).sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name)), [items, q, cat, favOnly])

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text); toast.success(`${what} copied. Clipboard clears in 20s.`)
    setTimeout(async () => { try { if ((await navigator.clipboard.readText()) === text) await navigator.clipboard.writeText('') } catch { try { await navigator.clipboard.writeText('') } catch { /* ignore */ } } }, 20000)
  }
  const members = ['Family', ...data.members.map((m: any) => m.name)]

  const exportEnc = async () => {
    const rows = await db.vaultItems.toArray()
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'mintmind-vault', meta, items: rows })], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'mintmind-vault-encrypted.json'; a.click(); URL.revokeObjectURL(url)
  }
  const importEnc = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()); if (j.app !== 'mintmind-vault') throw new Error('Not a vault export')
      if (j.meta.salt !== meta.salt) throw new Error('This export was made with a different master password. Restore it by recreating the vault with that password.')
      for (const r of j.items) await db.vaultItems.put(r); await reload(); toast.success('Vault items imported')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Import failed') }
  }

  return (
    <div className="space-y-5">
      <PageHeader actions={<>
        <Button variant="outline" onClick={() => setGen(true)}><Wand2 className="mr-1.5 h-4 w-4" />Generator</Button>
        <Button variant="outline" onClick={() => setEdit({ type: 'note' })}>Secure note</Button>
        <Button onClick={() => setEdit({ type: 'login' })}><Plus className="mr-1.5 h-4 w-4" />Add item</Button>
        <Button variant="outline" onClick={onLock}><Lock className="mr-1.5 h-4 w-4" />Lock</Button>
      </>} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search vault" className="pl-9" placeholder="Search name, username, URL" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Category" className="w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        <Button variant={favOnly ? 'default' : 'outline'} aria-pressed={favOnly} onClick={() => setFavOnly(!favOnly)}><Star className="mr-1.5 h-4 w-4" />Favourites</Button>
      </div>

      {list.length === 0 ? <Empty title={items.length ? 'No matches' : 'Your vault is empty'} description="Add logins and secure notes. They are encrypted before being stored." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((i) => (
            <li key={i.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="flex items-center gap-1.5 truncate font-medium">{i.type === 'note' ? <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}{i.name}</p><p className="truncate text-xs text-muted-foreground">{i.category}{i.member ? ` · ${i.member}` : ''} · updated {formatDate(i.updatedAt.slice(0, 10))}</p></div>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={i.favourite ? 'Remove favourite' : 'Mark favourite'} aria-pressed={i.favourite} onClick={() => onSave({ ...i, favourite: !i.favourite })}><Star className={cn('h-4 w-4', i.favourite && 'fill-warning text-warning')} /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${i.name}`} onClick={() => setEdit({ row: i, type: i.type })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${i.name}`} onClick={() => setDel(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div>
              {i.type === 'login' ? (
                <dl className="mt-3 space-y-1.5 text-sm">
                  {i.url && <div className="flex gap-2"><dt className="w-20 shrink-0 text-xs text-muted-foreground">URL</dt><dd className="truncate"><a className="text-primary hover:underline" href={/^https?:\/\//.test(i.url) ? i.url : undefined} target="_blank" rel="noopener noreferrer">{i.url}</a></dd></div>}
                  <div className="flex items-center gap-2"><dt className="w-20 shrink-0 text-xs text-muted-foreground">Username</dt><dd className="min-w-0 flex-1 truncate">{i.username || '—'}</dd>{i.username && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy username" onClick={() => copy(i.username, 'Username')}><Copy className="h-3.5 w-3.5" /></Button>}</div>
                  <div className="flex items-center gap-2"><dt className="w-20 shrink-0 text-xs text-muted-foreground">Password</dt><dd className="min-w-0 flex-1 truncate font-mono">{shown[i.id] ? i.password : '••••••••••'}</dd>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={shown[i.id] ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => ({ ...s, [i.id]: !s[i.id] }))}>{shown[i.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy password" onClick={() => copy(i.password, 'Password')}><Copy className="h-3.5 w-3.5" /></Button></div>
                  {i.notes && <p className="pt-1 text-xs text-muted-foreground">{i.notes}</p>}
                </dl>
              ) : (
                <div className="mt-3 flex items-start gap-2"><p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{shown[i.id] ? i.notes : '•••••••• (hidden)'}</p><Button size="icon" variant="ghost" className="h-7 w-7" aria-label={shown[i.id] ? 'Hide note' : 'Show note'} onClick={() => setShown((s) => ({ ...s, [i.id]: !s[i.id] }))}>{shown[i.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button></div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Panel title="Vault security">
        <div className="flex flex-wrap gap-2">
          {bioOk && !meta.biometric && <Button variant="outline" onClick={async () => { try { const b = await enableBiometric(session.bits); await onMeta({ ...meta, biometric: b }); toast.success('Biometric unlock enabled on this device') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not enable biometrics') } }}><Fingerprint className="mr-2 h-4 w-4" />Enable biometric unlock</Button>}
          {meta.biometric && <Button variant="outline" onClick={async () => { const { biometric: _b, ...rest } = meta; void _b; await onMeta(rest); toast.success('Biometric unlock disabled') }}>Disable biometric unlock</Button>}
          <Button variant="outline" onClick={exportEnc}><Download className="mr-2 h-4 w-4" />Export encrypted</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Import encrypted</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importEnc(f); e.target.value = '' }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Vault data stays on this device and is never sent to our servers. Use the encrypted export to move it to another device.</p>
      </Panel>

      {edit && <ItemForm row={edit.row} type={edit.type} members={members} onClose={() => setEdit(null)} onSave={async (v) => { await onSave({ ...edit.row, ...v, type: edit.type }); toast.success('Saved') }} />}
      {gen && <GeneratorDialog onClose={() => setGen(false)} onCopy={(p) => copy(p, 'Password')} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete ${del?.name}?`} description="This cannot be undone." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await onDelete(del!.id); setDel(null); toast.success('Deleted') }} />
    </div>
  )
}

function ItemForm({ row, type, members, onClose, onSave }: { row?: Item; type: 'login' | 'note'; members: string[]; onClose: () => void; onSave: (v: Partial<Item>) => Promise<void> }) {
  const [f, setF] = useState({ name: row?.name || '', url: row?.url || '', username: row?.username || '', password: row?.password || '', category: row?.category || 'Other', notes: row?.notes || '', member: row?.member || '' })
  const [show, setShow] = useState(false)
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`${row ? 'Edit' : 'Add'} ${type === 'note' ? 'secure note' : 'login'}`} wide
      onSubmit={async () => { if (f.url && !/^https?:\/\//i.test(f.url)) throw new Error('URL must start with http:// or https://'); if (type === 'login' && !f.password) throw new Error('Password is required'); await onSave(f) }}>
      <Field label="Name">{(id) => <Input id={id} required value={f.name} onChange={set('name')} />}</Field>
      <Field label="Category">{(id) => <Select id={id} value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
      {type === 'login' && <>
        <Field label="URL">{(id) => <Input id={id} type="url" value={f.url} onChange={set('url')} placeholder="https://" />}</Field>
        <Field label="Username">{(id) => <Input id={id} value={f.username} onChange={set('username')} autoComplete="off" />}</Field>
        <Field label="Password" className="full">{(id) => <div className="space-y-2"><div className="flex gap-2"><Input id={id} type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="off" className="font-mono" />
          <Button type="button" variant="outline" size="icon" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
          <Button type="button" variant="outline" size="icon" aria-label="Generate password" onClick={() => { setF((p) => ({ ...p, password: generatePassword({ length: 20 }) })); setShow(true) }}><RefreshCw className="h-4 w-4" /></Button></div><StrengthMeter value={f.password} /></div>}</Field></>}
      <Field label="Family member">{(id) => <Select id={id} value={f.member} onChange={set('member')}><option value="">—</option>{members.map((m) => <option key={m}>{m}</option>)}</Select>}</Field>
      <Field label={type === 'note' ? 'Note' : 'Notes'} className="full">{(id) => <textarea id={id} rows={type === 'note' ? 6 : 3} required={type === 'note'} value={f.notes} onChange={set('notes')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />}</Field>
    </FormDialog>
  )
}

function GeneratorDialog({ onClose, onCopy }: { onClose: () => void; onCopy: (p: string) => void }) {
  const [o, setO] = useState({ length: 20, lower: true, upper: true, digits: true, symbols: true })
  const [pw, setPw] = useState(() => generatePassword({ length: 20 }))
  useEffect(() => setPw(generatePassword(o)), [o])
  return (
    <FormDialog open onOpenChange={(x) => !x && onClose()} title="Password generator" submitLabel="Copy and close" onSubmit={async () => onCopy(pw)}>
      <div className="full space-y-3"><code className="block break-all rounded-lg bg-muted p-3 font-mono text-base">{pw}</code><StrengthMeter value={pw} />
        <Button type="button" variant="outline" size="sm" onClick={() => setPw(generatePassword(o))}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Regenerate</Button></div>
      <Field label={`Length: ${o.length}`} className="full">{(id) => <input id={id} type="range" min={8} max={64} value={o.length} onChange={(e) => setO({ ...o, length: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" />}</Field>
      {(['lower', 'upper', 'digits', 'symbols'] as const).map((k) => <label key={k} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} />{k === 'lower' ? 'Lowercase' : k === 'upper' ? 'Uppercase' : k}</label>)}
    </FormDialog>
  )
}

