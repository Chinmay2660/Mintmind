'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Check, Cloud, Download, Laptop, Moon, RotateCcw, ShieldCheck, Sun, Trash2, Upload } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { TABLES, clearAll } from '@/lib/wealth/db'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, LoadingBlock, PageHeader, Panel, Select } from '@/components/wealth/kit'
import { useKiteStatus } from '@/components/wealth/KiteSync'
import { AssetsLoans } from '@/components/wealth/AssetsLoans'
import { AutomationManager } from '@/components/ai/AutomationManager'
import { AiSettings } from '@/components/ai/AiSettings'
import { cn } from '@/lib/utils'
import { toISO } from '@/lib/wealth/calc'

const TABS = ['Account', 'Appearance', 'Preferences', 'Assets & Loans', 'Automation', 'AI', 'Integrations', 'Data'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_PREFS = { currency: 'INR', dateFormat: 'DD MMM YYYY', hideBalances: false, notifications: { premiums: true, cardDues: true, sips: true, budget: true, lowBalance: true, navStale: true, staleValues: true, legacy: true, family: true }, autoLockMinutes: 5 }

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Account')
  // deep links such as /dashboard/settings?tab=assets
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tab')
    const map: Record<string, Tab> = { assets: 'Assets & Loans', automation: 'Automation', ai: 'AI', integrations: 'Integrations', data: 'Data' }
    if (q && map[q]) setTab(map[q])
  }, [])
  const { ready } = useWealth()
  if (!ready) return <LoadingBlock className="h-64" />
  return (
    <div className="space-y-5">
      <PageHeader />
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('shrink-0 border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:bg-muted', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t}</button>
        ))}
      </div>
      {tab === 'Account' && <AccountTab />}
      {tab === 'Appearance' && <AppearanceTab />}
      {tab === 'Preferences' && <PreferencesTab />}
      {tab === 'Assets & Loans' && <AssetsLoans />}
      {tab === 'Automation' && <AutomationManager />}
      {tab === 'AI' && <AiSettings />}
      {tab === 'Integrations' && <IntegrationsTab />}
      {tab === 'Data' && <DataTab />}
    </div>
  )
}

function usePrefs() {
  const { data, db } = useWealth()
  const stored = data.meta.find((m: any) => m.key === 'prefs')?.value ?? {}
  const prefs = { ...DEFAULT_PREFS, ...stored, notifications: { ...DEFAULT_PREFS.notifications, ...(stored.notifications ?? {}) } }
  const update = (patch: Partial<typeof DEFAULT_PREFS>) => db.meta.put({ key: 'prefs', value: { ...prefs, ...patch } })
  return { prefs, update }
}

function AccountTab() {
  const { data, db, isDemo } = useWealth()
  const { user } = useAuth()
  const profile = data.meta.find((m: any) => m.key === 'profile')?.value ?? { name: user?.name ?? '', email: user?.email ?? '', phone: '', city: '' }
  const [f, setF] = useState({ name: profile.name || '', phone: profile.phone || '', city: profile.city || '', monthlyIncome: String(profile.monthlyIncome ?? '') })
  const [sec, setSec] = useState<{ hasPassword: boolean; mfaEnabled: boolean } | null>(null)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [mfa, setMfa] = useState<{ secret: string; url: string } | null>(null)
  const [code, setCode] = useState('')
  const [disable, setDisable] = useState({ password: '', code: '' })

  const load = () => axios.get('/api/user/security').then((r) => setSec(r.data)).catch(() => setSec(null))
  useEffect(() => { if (!isDemo) load() }, [isDemo])
  const call = async (body: object, ok: string) => {
    try { await axios.post('/api/user/security', body); toast.success(ok); await load(); return true } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? e.response.data.error : 'Request failed'); return false }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Profile" description="Personal information">
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await db.meta.put({ key: 'profile', value: { ...profile, name: f.name, phone: f.phone, city: f.city, monthlyIncome: Number(f.monthlyIncome) || 0 } }); toast.success('Profile saved') }}>
          <Field label="Full name">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Email">{(id) => <Input id={id} disabled value={profile.email || user?.email || ''} />}</Field>
          <Field label="Mobile">{(id) => <Input id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}</Field>
          <Field label="City">{(id) => <Input id={id} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}</Field>
          <Field label="Monthly income (₹)" hint="Used only for the financial health score.">{(id) => <Input id={id} type="number" min="0" value={f.monthlyIncome} onChange={(e) => setF({ ...f, monthlyIncome: e.target.value })} />}</Field>
          <Button type="submit">Save profile</Button>
        </form>
      </Panel>

      <Panel title="Security" description="Password and two-factor authentication">
        {isDemo ? <p className="text-sm text-muted-foreground">Security settings are disabled in Demo Mode. Sign up for an account to use passwords and MFA.</p> : !sec ? <LoadingBlock className="h-24" /> : (
          <div className="space-y-6">
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: 'change-password', currentPassword: pw.current, newPassword: pw.next }, sec.hasPassword ? 'Password changed' : 'Password set')) setPw({ current: '', next: '' }) }}>
              <h4 className="text-sm font-semibold">{sec.hasPassword ? 'Change password' : 'Set a password'}</h4>
              {sec.hasPassword && <Field label="Current password">{(id) => <Input id={id} type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>}
              <Field label="New password" hint="At least 10 characters, mixing letters, numbers and symbols.">{(id) => <Input id={id} type="password" required minLength={10} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
              <Button type="submit" variant="outline">Update password</Button>
            </form>
            <div className="space-y-3 border-t border-border pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Two-factor authentication (authenticator app)</h4>
              {sec.mfaEnabled ? (
                <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await call({ action: 'disable-mfa', ...disable }, 'MFA disabled') }}>
                  <p className="text-sm text-success">MFA is on.</p>
                  <Field label="Password">{(id) => <Input id={id} type="password" required value={disable.password} onChange={(e) => setDisable({ ...disable, password: e.target.value })} />}</Field>
                  <Field label="Authenticator code">{(id) => <Input id={id} inputMode="numeric" maxLength={6} required value={disable.code} onChange={(e) => setDisable({ ...disable, code: e.target.value })} />}</Field>
                  <Button type="submit" variant="outline">Disable MFA</Button>
                </form>
              ) : mfa ? (
                <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: 'enable-mfa', code }, 'MFA enabled')) { setMfa(null); setCode('') } }}>
                  <p className="text-sm">Add this key to your authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code.</p>
                  <code className="block break-all rounded-lg bg-muted p-3 text-sm">{mfa.secret}</code>
                  <a className="text-xs text-primary underline" href={mfa.url}>Open in authenticator app</a>
                  <Field label="Verification code">{(id) => <Input id={id} inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
                  <div className="flex gap-2"><Button type="submit">Enable MFA</Button><Button type="button" variant="ghost" onClick={() => setMfa(null)}>Cancel</Button></div>
                </form>
              ) : (
                <Button variant="outline" onClick={async () => { try { const { data: d } = await axios.post('/api/user/security', { action: 'setup-mfa' }); setMfa({ secret: d.secret, url: d.otpauthUrl }) } catch { toast.error('Could not start MFA setup') } }}>Set up MFA</Button>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const opts = [{ v: 'light', l: 'Light', i: Sun }, { v: 'dark', l: 'Dark', i: Moon }, { v: 'system', l: 'System', i: Laptop }]
  return (
    <Panel title="Theme" description="Saved on this device and applied before the page renders. System follows your OS setting.">
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
        {opts.map(({ v, l, i: Icon }) => {
          const on = mounted && theme === v
          return (
            <button key={v} role="radio" aria-checked={on} onClick={() => setTheme(v)} className={cn('flex items-center gap-3 rounded-lg border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent' : 'border-border hover:border-primary/40')}>
              <Icon className="h-5 w-5" /><span className="flex-1 font-medium">{l}</span>{on && <Check className="h-4 w-4 text-primary" />}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

function PreferencesTab() {
  const { prefs, update } = usePrefs()
  const { setPrivacyMode, privacyMode } = usePrivacyMode()
  const toggles: [keyof typeof prefs.notifications, string][] = [['cardDues', 'Cards: payment dues, statements and high utilisation'], ['premiums', 'Insurance: premiums and expiries'], ['sips', 'Mutual funds: SIP debits and SIPs ending'], ['navStale', 'Mutual funds: outdated NAVs'], ['budget', 'Budget: pace, limits and missing budget'], ['lowBalance', 'Bank accounts: below minimum balance'], ['staleValues', 'Net worth: values not updated in 90 days'], ['legacy', 'Digital Legacy: confirmations and invitations'], ['family', 'Family Circle: pending invitations']]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Display">
        <div className="space-y-4">
          <Field label="Currency" hint="Indian rupee only. Amounts use lakh/crore grouping (₹12,34,567).">{(id) => <Select id={id} disabled value="INR"><option value="INR">INR (₹)</option></Select>}</Field>
          <Field label="Date format">{(id) => <Select id={id} value={prefs.dateFormat} onChange={(e) => update({ dateFormat: e.target.value })}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select>}</Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={privacyMode} onChange={(e) => { setPrivacyMode(e.target.checked); update({ hideBalances: e.target.checked }) }} />Hide balances by default</label>
        </div>
      </Panel>
      <Panel title="Notifications" description="Shown in the bell menu. Email, SMS and push delivery are configured per integration.">
        <ul className="space-y-3">{toggles.map(([k, l]) => (
          <li key={String(k)}><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={prefs.notifications[k]} onChange={(e) => update({ notifications: { ...prefs.notifications, [k]: e.target.checked } })} />{l}</label></li>
        ))}</ul>
      </Panel>
      <Panel title="Privacy & security">
        <Field label="Auto-lock the vault after" hint="Applies to My Vault.">{(id) => <Select id={id} value={prefs.autoLockMinutes} onChange={(e) => update({ autoLockMinutes: Number(e.target.value) })}>{[1, 2, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m} minute{m > 1 ? 's' : ''}</option>)}</Select>}</Field>
      </Panel>
    </div>
  )
}

function IntegrationsTab() {
  const { isDemo } = useWealth()
  const [st, setSt] = useState<{ configured: boolean; connected: boolean; reason?: string; email?: string } | null>(null)
  const load = () => axios.get('/api/drive/status').then((r) => setSt(r.data)).catch(() => setSt({ configured: false, connected: false }))
  useEffect(() => { if (!isDemo) load() }, [isDemo])
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Google Drive" description="Documents are stored in your own Drive, in a “My Wealth App” folder. We only request access to files this app creates.">
        {isDemo ? <p className="text-sm text-muted-foreground">Not available in Demo Mode (demo documents are kept in your browser).</p> : !st ? <LoadingBlock className="h-16" /> : !st.configured ? (
          <p className="text-sm text-muted-foreground">Google Drive isn’t available yet. The app administrator needs to set it up.</p>
        ) : st.connected ? (
          <div className="space-y-3"><p className="flex items-center gap-2 text-sm text-success"><Cloud className="h-4 w-4" />Connected{st.email ? ` as ${st.email}` : ''}</p>
            <Button variant="outline" onClick={async () => { await axios.post('/api/drive/disconnect'); toast.success('Google Drive disconnected. Files in your Drive are untouched.'); load() }}>Disconnect</Button></div>
        ) : (
          <div className="space-y-3">{st.reason === 'expired' && <p className="text-sm text-warning">Your Drive authorisation expired or was revoked. Reconnect to continue.</p>}
            <Button asChild><a href="/api/drive/connect"><Cloud className="mr-2 h-4 w-4" />Connect Google Drive</a></Button></div>
        )}
      </Panel>
      <KitePanel />
    </div>
  )
}

function KitePanel() {
  const { isDemo } = useWealth()
  const { status, refresh } = useKiteStatus()
  return (
    <Panel title="Zerodha Kite" description="Sync mutual fund NAVs, SIPs and your stock holdings. Read-only: the app never places orders.">
      {isDemo ? <p className="text-sm text-muted-foreground">Not available in Demo Mode.</p> : !status ? <LoadingBlock className="h-16" /> : !status.configured ? (
        <p className="text-sm text-muted-foreground">Zerodha isn’t available yet. The app administrator needs to set it up.</p>
      ) : status.connected ? (
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 text-success"><Cloud className="h-4 w-4" />Connected{status.kiteUserName ? ` as ${status.kiteUserName}` : ''}</p>
          <p className="text-xs text-muted-foreground">Zerodha sessions last one trading day{status.expiresAt ? ` (this one ends ${new Date(status.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })})` : ''}. Reconnect each day you want to sync. Use “Sync from Zerodha” on the Mutual Funds page.</p>
          <Button variant="outline" onClick={async () => { await axios.post('/api/kite/disconnect'); toast.success('Zerodha disconnected'); refresh() }}>Disconnect</Button>
        </div>
      ) : (
        <div className="space-y-3">{status.expired && <p className="text-sm text-warning">Your Zerodha session expired. Log in again to sync.</p>}
          <Button asChild><a href="/api/kite/connect"><Cloud className="mr-2 h-4 w-4" />Connect Zerodha</a></Button></div>
      )}
    </Panel>
  )
}

function DataTab() {
  const { db, isDemo, resetDemo } = useWealth()
  const { signOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dlg, setDlg] = useState<null | 'reset' | 'wipe' | 'delete'>(null)

  const exportAll = async () => {
    const out: Record<string, unknown[]> = {}
    for (const t of TABLES) out[t] = await db[t].toArray()
    out.vaultItems = [] // vault ciphertext is exported separately from the Vault page, never mixed into plain exports
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'mintmind', version: 1, exportedAt: new Date().toISOString(), tables: out }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `mintmind-backup-${toISO(new Date())}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const restore = async (file: File) => {
    try {
      const json = JSON.parse(await file.text())
      if (json.app !== 'mintmind' || !json.tables) throw new Error('Not a Mintmind backup file')
      await clearAll(db)
      for (const t of TABLES) if (t !== 'vaultItems' && Array.isArray(json.tables[t])) await db[t].bulkPut(json.tables[t])
      toast.success('Backup restored')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not restore backup') }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Export & backup" description="Everything you track, as a JSON file you control.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportAll}><Download className="mr-2 h-4 w-4" />Export backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Restore backup</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = '' }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Restoring replaces current data. Vault items are not included in this file.</p>
      </Panel>
      {isDemo ? (
        <Panel title="Demo data"><p className="mb-3 text-sm text-muted-foreground">Restore the original sample data. Your edits in demo are discarded.</p><Button variant="outline" onClick={() => setDlg('reset')}><RotateCcw className="mr-2 h-4 w-4" />Reset demo data</Button></Panel>
      ) : (
        <Panel title="Account management">
          <div className="space-y-3">
            <div><Button variant="outline" onClick={() => setDlg('wipe')}><Trash2 className="mr-2 h-4 w-4" />Erase my tracked data</Button><p className="mt-1 text-xs text-muted-foreground">Clears banks, funds, cards, policies, budget and expenses from this browser.</p></div>
            <div><Button variant="destructive" onClick={() => setDlg('delete')}>Delete my account</Button><p className="mt-1 text-xs text-muted-foreground">Removes your login, Drive link and server-side records. Files already in your Google Drive are not deleted.</p></div>
          </div>
        </Panel>
      )}
      <ConfirmDialog open={dlg === 'reset'} onOpenChange={(o) => !o && setDlg(null)} title="Reset demo data?" description="All demo changes will be lost." confirmLabel="Reset" onConfirm={async () => { await resetDemo(); setDlg(null); toast.success('Demo data reset') }} />
      <ConfirmDialog open={dlg === 'wipe'} onOpenChange={(o) => !o && setDlg(null)} title="Erase all tracked data?" description="This cannot be undone. Export a backup first if unsure." confirmLabel="Erase" variant="destructive" onConfirm={async () => { await clearAll(db); setDlg(null); toast.success('Data erased') }} />
      <ConfirmDialog open={dlg === 'delete'} onOpenChange={(o) => !o && setDlg(null)} title="Delete your account?" description="This permanently removes your account. It cannot be undone." confirmLabel="Delete account" variant="destructive" onConfirm={async () => { try { await axios.delete('/api/user/account'); await clearAll(db); await signOut() } catch { toast.error('Could not delete account') } }} />
    </div>
  )
}
