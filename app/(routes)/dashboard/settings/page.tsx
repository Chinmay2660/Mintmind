'use client'

import { BudgetSetup } from '@/components/settings/BudgetSetup'
import { ReportsTab } from '@/components/settings/ReportsTab'
import { toastProblem } from '@/lib/notify'
import { useDashboardLayout, DASHBOARD_BLOCKS } from '@/components/dashboard/useDashboardLayout'
import { DashboardCustomize } from '@/components/dashboard/DashboardCustomize'
import { SharingSettings } from '@/components/family/SharingSettings'
import { RulesDialog } from '@/components/wealth/budget/RulesDialog'
import { CategoryManager } from '@/components/wealth/budget/Views'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTheme } from 'next-themes'
import { START_TOUR_EVENT } from '@/components/shell/ProductTour'
import { SHOW_SHORTCUTS_EVENT } from '@/components/shell/Shortcuts'
import { CookieSettingsButton } from '@/components/landing/CookieSettingsButton'
import { toast } from 'sonner'
import { formatINR } from '@/lib/wealth/format'
import { Check, Cloud, Download, Laptop, LogOut, Moon, Pencil, RotateCcw, ShieldCheck, Sun, Trash2, Upload } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { SyncStatus } from '@/components/wealth/SyncStatus'
import { TABLES, clearAll } from '@/lib/wealth/db'
import { validateMobile } from '@/lib/features'
import { deviceNotifyOn, deviceNotifySupported, disableDeviceNotify, enableDeviceNotify } from '@/lib/notify/device'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, InfoTip, LoadingBlock, PageHeader, Panel, Select } from '@/components/wealth/kit'
import { AutomationManager } from '@/components/ai/AutomationManager'
import { AiSettings } from '@/components/ai/AiSettings'
import { MyAppFeatures } from '@/components/onboarding/MyAppFeatures'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { cn } from '@/lib/utils'
import { toISO } from '@/lib/wealth/calc'
import { UI_STYLES, UI_STYLE_KEY, applyStyle, normaliseStyle } from '@/lib/uiStyle'
import { Checkbox } from '@/components/ui/checkbox'
import { InstallApp } from '@/components/shell/InstallApp'

const TABS = ['Account', 'My App Features', 'Appearance', 'Preferences', 'Budget', 'Family sharing', 'Automation', 'AI', 'Integrations', 'Import & export', 'Data'] as const
type Tab = (typeof TABS)[number]

// On a phone, Settings opens as a short grouped list; a row opens that section as its own page (with a back arrow). A wide screen keeps the side list.
const GROUPS: { label: string; items: { t: Tab; hint: string }[] }[] = [
  { label: 'You', items: [{ t: 'Account', hint: 'Profile, security and sign-in' }] },
  { label: 'Make it yours', items: [{ t: 'Appearance', hint: 'Look, theme and dashboard layout' }, { t: 'My App Features', hint: 'Turn parts of the app on or off' }, { t: 'Preferences', hint: 'Currency, alerts and privacy' }] },
  { label: 'Money', items: [{ t: 'Budget', hint: 'Categories and rules' }, { t: 'Family sharing', hint: 'What each person can see of you' }, { t: 'Automation', hint: 'Reminders and routine updates' }] },
  { label: 'Connections', items: [{ t: 'AI', hint: 'Wealth assistant and providers' }, { t: 'Integrations', hint: 'Connected services' }] },
  { label: 'Your data', items: [{ t: 'Import & export', hint: 'Import statements, Excel and PDF reports' }, { t: 'Data', hint: 'Backup, restore and reset' }] },
]

const DEFAULT_PREFS = { currency: 'INR', dateFormat: 'DD MMM YYYY', hideBalances: false, notifications: { premiums: true, cardDues: true, sips: true, budget: true, lowBalance: true, navStale: true, staleValues: true, legacy: true, family: true }, autoLockMinutes: 5 }

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab | null>(null) // null: the list on a phone, and the Account section on a wide screen
  const [phone, setPhone] = useState(false)
  useEffect(() => { const mq = window.matchMedia('(max-width: 767px)'); const f = () => setPhone(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [])
  // on a phone an open section is a page of its own: the back arrow, the browser's Back and the edge swipe all return to the list
  useDetailCrumb(phone && tab ? tab : null, () => setTab(null))
  // deep links such as /dashboard/settings?tab=assets
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tab')
    const map: Record<string, Tab> = { family: 'Family sharing', budget: 'Budget', account: 'Account', features: 'My App Features', automation: 'Automation', ai: 'AI', integrations: 'Integrations', reports: 'Import & export', export: 'Import & export', import: 'Import & export', data: 'Data' }
    if (q === 'assets') window.location.replace('/dashboard/mutual-funds?tab=property')
    else if (q && map[q]) setTab(map[q])
  }, [])
  const { ready } = useWealth()
  const { isEnabled } = useFeatures()
  const current: Tab = tab ?? 'Account'
  if (!ready) return <LoadingBlock className="h-64" />
  const sections = TABS.filter((t) => (t === 'Automation' ? isEnabled('automation') : t === 'AI' ? isEnabled('ai_assistant') : t === 'Family sharing' ? isEnabled('family_circle') : true))
  return (
    <div className="space-y-5">
      <div className="print:hidden"><PageHeader /></div>
      <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        {/* a list down the left on a wide screen, the usual tab strip on a phone */}
        <nav aria-label="Settings sections" className="mb-5 hidden print:hidden md:sticky md:top-4 md:mb-0 md:block md:self-start">
          <ul className="space-y-0.5">
            {sections.map((t) => (
              <li key={t}>
                <button type="button" onClick={() => setTab(t)} aria-current={current === t ? 'page' : undefined}
                  className={cn('flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', current === t ? 'bg-accent text-accent-foreground paper:bg-primary paper:text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{t}</button>
              </li>
            ))}
          </ul>
        </nav>
        {!tab && (
          <div className="space-y-5 md:hidden print:hidden">
            {GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => sections.includes(i.t)) })).filter((g) => g.items.length).map((g) => (
              <section key={g.label}>
                <h2 className="mb-1 px-1 text-xs font-medium tracking-wide text-muted-foreground">{g.label}</h2>
                <ul className="surface-card divide-y divide-border px-4">
                  {g.items.map(({ t, hint }) => (
                    <li key={t}><button type="button" onClick={() => setTab(t)} className="group flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0"><span className="block text-sm font-medium">{t}</span><span className="block truncate text-xs text-muted-foreground">{hint}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden /></button></li>
                  ))}
                </ul>
              </section>))}
          </div>
        )}
        {tab && (
          <div className="flex items-center gap-2 md:hidden print:hidden">
            <button type="button" onClick={() => setTab(null)} className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />Settings</button>
            <span className="text-sm font-semibold">{tab}</span>
          </div>
        )}
        <div className={cn('min-w-0 space-y-5 max-md:mt-3', !tab && 'max-md:hidden')}>
          {current === 'Account' && <AccountTab />}
          {current === 'My App Features' && <MyAppFeatures />}
          {current === 'Appearance' && <><AppearanceTab /><DashboardLayoutSettings /></>}
          {current === 'Preferences' && <PreferencesTab />}
          {current === 'Budget' && <BudgetSettings />}
          {current === 'Family sharing' && <SharingSettings />}
          {current === 'Automation' && <AutomationManager />}
          {current === 'AI' && <AiSettings />}
          {current === 'Integrations' && <IntegrationsTab />}
          {current === 'Import & export' && <ReportsTab />}
          {current === 'Data' && <DataTab />}
        </div>
      </div>
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
  const [phoneError, setPhoneError] = useState('')
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [disablingMfa, setDisablingMfa] = useState(false)
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
      <Panel title="Profile" action={!editing ? <Button type="button" size="sm" variant="outline" onClick={() => { setF({ name: profile.name || '', phone: profile.phone || '', city: profile.city || '', monthlyIncome: String(profile.monthlyIncome ?? '') }); setEditing(true) }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button> : undefined}>
        {!editing ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Full name</dt><dd className="mt-0.5 truncate text-sm font-medium">{profile.name || '-'}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-0.5 truncate text-sm font-medium">{profile.email || user?.email || '-'}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Mobile</dt><dd className="mt-0.5 truncate text-sm font-medium">{profile.phone || '-'}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">City</dt><dd className="mt-0.5 truncate text-sm font-medium">{profile.city || '-'}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Monthly income</dt><dd className="mt-0.5 truncate text-sm font-medium">{profile.monthlyIncome ? formatINR(Number(profile.monthlyIncome)) : '-'}</dd></div>
          </dl>
        ) : (
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const mo = validateMobile(f.phone); if (!mo.ok) { setPhoneError(mo.error); return } setPhoneError(''); await db.meta.put({ key: 'profile', value: { ...profile, name: f.name, phone: mo.value, city: f.city, monthlyIncome: Number(f.monthlyIncome) || 0 } }); toast.success('Profile saved'); setEditing(false) }}>
          <Field label="Full name">{(id) => <Input id={id} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Email">{(id) => <Input id={id} disabled value={profile.email || user?.email || ''} />}</Field>
          <Field label="Mobile" hint="Include the country code, e.g. +91 98765 43210" error={phoneError}>{(id) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value }); setPhoneError('') }} />}</Field>
          <Field label="City">{(id) => <Input id={id} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}</Field>
          <Field label="Monthly income (₹)" hint="Used only for the financial health score.">{(id) => <Input id={id} type="number" min="0" value={f.monthlyIncome} onChange={(e) => setF({ ...f, monthlyIncome: e.target.value })} />}</Field>
          <div className="flex gap-2"><Button type="submit">Save profile</Button><Button type="button" variant="outline" onClick={() => { setEditing(false); setPhoneError('') }}>Cancel</Button></div>
        </form>
        )}
      </Panel>

      <Panel title="Security">
        {isDemo ? <p className="text-sm text-muted-foreground">Security settings are disabled in Demo Mode. Sign up for an account to use passwords and MFA.</p> : !sec ? <LoadingBlock className="h-24" /> : (
          <div className="space-y-6">
            {!changingPw ? (
              <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">{sec.hasPassword ? 'Password' : 'No password set'}</h4><p className="text-xs text-muted-foreground">{sec.hasPassword ? 'Protected with a password.' : 'Set one to sign in without a link.'}</p></div><Button type="button" size="sm" variant="outline" onClick={() => setChangingPw(true)}>{sec.hasPassword ? 'Change' : 'Set password'}</Button></div>
            ) : (
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: 'change-password', currentPassword: pw.current, newPassword: pw.next }, sec.hasPassword ? 'Password changed' : 'Password set')) setPw({ current: '', next: '' }) }}>
              <h4 className="text-sm font-semibold">{sec.hasPassword ? 'Change password' : 'Set a password'}</h4>
              {sec.hasPassword && <Field label="Current password">{(id) => <Input id={id} type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>}
              <Field label="New password" hint="At least 10 characters, mixing letters, numbers and symbols.">{(id) => <Input id={id} type="password" required minLength={10} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
              <div className="flex gap-2"><Button type="submit" variant="outline">Update password</Button><Button type="button" variant="ghost" onClick={() => { setChangingPw(false); setPw({ current: '', next: '' }) }}>Cancel</Button></div>
            </form>
            )}
            <div className="space-y-3 border-t border-border pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Two-factor authentication (authenticator app)</h4>
              {sec.mfaEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3"><p className="text-sm text-success">MFA is on.</p>{!disablingMfa && <Button type="button" size="sm" variant="outline" onClick={() => setDisablingMfa(true)}>Disable</Button>}</div>
                {disablingMfa && <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: 'disable-mfa', ...disable }, 'MFA disabled')) { setDisablingMfa(false); setDisable({ password: '', code: '' }) } }}>
                  <Field label="Password">{(id) => <Input id={id} type="password" required value={disable.password} onChange={(e) => setDisable({ ...disable, password: e.target.value })} />}</Field>
                  <Field label="Authenticator code">{(id) => <Input id={id} inputMode="numeric" maxLength={6} required value={disable.code} onChange={(e) => setDisable({ ...disable, code: e.target.value })} />}</Field>
                  <div className="flex gap-2"><Button type="submit" variant="outline">Disable MFA</Button><Button type="button" variant="ghost" onClick={() => { setDisablingMfa(false); setDisable({ password: '', code: '' }) }}>Cancel</Button></div>
                </form>}
                </div>
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
  const [look, setLook] = useState('purple')
  useEffect(() => { try { setLook(normaliseStyle(localStorage.getItem(UI_STYLE_KEY))) } catch { /* default look */ } }, [])
  return (
    <Panel flat title="Theme">
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
      <h4 className="mb-2 mt-6 flex items-center gap-1.5 text-sm font-semibold">Look<InfoTip label="Look">Sage and Lavender are calm, light looks with a regular font. Ember is charcoal grey with orange, Ink is black, white and grey, and Violet is the default purple look. Ocean, Sunset, Rose and Forest are single-colour looks. Paper is a denser, warm paper style with a small monospace font. Your choice is remembered on this device, and Light, Dark and System work with all of them.</InfoTip></h4>
      <div role="radiogroup" aria-label="Look" className="grid gap-3 sm:grid-cols-2">
        {UI_STYLES.map((o) => {
          const on = look === o.value
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => { setLook(o.value); applyStyle(o.value) }} className={cn('flex items-center gap-3 rounded-lg border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent' : 'border-border hover:bg-muted')}>
              <span className="min-w-0 flex-1"><span className="block font-medium">{o.label}</span><span className="block text-xs text-muted-foreground">{o.note}</span></span>{on && <Check className="h-4 w-4 text-primary" />}
            </button>
          )
        })}
      </div>
      <h4 className="mb-2 mt-6 text-sm font-semibold">Help</h4>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><span className="text-sm"><span className="block font-medium">Cookies and storage</span><span className="block text-xs text-muted-foreground">Choose whether the app remembers your theme and layout between visits.</span></span><CookieSettingsButton /></div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><span className="text-sm"><span className="block font-medium">Keyboard shortcuts</span><span className="block text-xs text-muted-foreground">Add things, jump between pages and search without the mouse. Press ? anywhere.</span></span><Button type="button" variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event(SHOW_SHORTCUTS_EVENT))}>Show shortcuts</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><span className="text-sm"><span className="block font-medium">Product tour</span><span className="block text-xs text-muted-foreground">A short walk through net worth, investments, transactions, goals and reports.</span></span><Button type="button" variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}>Restart tour</Button></div>
    </Panel>
  )
}

function DeviceNotifyToggle() {
  const [on, setOn] = useState(false)
  const [supported, setSupported] = useState(true)
  useEffect(() => { setSupported(deviceNotifySupported()); setOn(deviceNotifyOn()) }, [])
  const flip = async (v: boolean) => {
    if (!v) { disableDeviceNotify(); setOn(false); return }
    const r = await enableDeviceNotify()
    if (r === 'on') { setOn(true); toast.success('Device notifications on') }
    else (r === 'denied' ? toast.warning('Notifications are blocked. Allow them in your browser settings.') : toast.info('This browser does not support notifications'))
  }
  return (
    <div className="mb-4 rounded-lg border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={on} disabled={!supported} onChange={(e) => flip(e.target.checked)} />Show urgent reminders as device notifications</label>
      <p className="mt-1 text-xs text-muted-foreground">{supported ? 'Dues and expiries appear on your device while Mintmind is open or installed. Reminders are worked out on this device and never sent to a server. Alerts while the app is fully closed are not available yet.' : 'Not supported in this browser.'}</p>
    </div>
  )
}

function PreferencesTab() {
  const { prefs, update } = usePrefs()
  const { setPrivacyMode, privacyMode } = usePrivacyMode()
  const toggles: [keyof typeof prefs.notifications, string][] = [['cardDues', 'Cards: payment dues, statements and high utilisation'], ['premiums', 'Insurance: premiums and expiries'], ['sips', 'Mutual funds: SIP debits and SIPs ending'], ['navStale', 'Mutual funds: outdated NAVs'], ['budget', 'Budget: pace, limits and missing budget'], ['lowBalance', 'Bank accounts: below minimum balance'], ['staleValues', 'Net worth: values not updated in 90 days'], ['legacy', 'Digital Legacy: confirmations and invitations'], ['family', 'Family Circle: pending invitations']]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel flat title="Display">
        <div className="space-y-4">
          <Field label="Currency" hint="Currency is fixed for now.">{(id) => <Select id={id} disabled value="INR"><option value="INR">INR (₹)</option></Select>}</Field>
          <Field label="Date format">{(id) => <Select id={id} value={prefs.dateFormat} onChange={(e) => update({ dateFormat: e.target.value })}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select>}</Field>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={privacyMode} onChange={(e) => { setPrivacyMode(e.target.checked); update({ hideBalances: e.target.checked }) }} />Hide balances by default</label>
        </div>
      </Panel>
      <Panel flat title="Notifications">
        <DeviceNotifyToggle />
        <ul className="space-y-3">{toggles.map(([k, l]) => (
          <li key={String(k)}><label className="flex items-center gap-2 text-sm"><Checkbox checked={prefs.notifications[k]} onChange={(e) => update({ notifications: { ...prefs.notifications, [k]: e.target.checked } })} />{l}</label></li>
        ))}</ul>
      </Panel>
      <Panel flat title="Install app" description="Use Mintmind like an app on your phone or computer.">
        <InstallApp />
      </Panel>
      <Panel flat title="Privacy & security">
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
      <Panel flat title="Google Drive">
        {isDemo ? <p className="text-sm text-muted-foreground">Not available in Demo Mode (demo documents are kept in your browser).</p> : !st ? <LoadingBlock className="h-16" /> : !st.configured ? (
          <div className="space-y-2"><p className="text-sm text-muted-foreground">Google Drive connection isn’t available right now. Please try again later.</p><SetupHint vars={['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']} extra="Enable the Google Drive API and add this redirect URI in Google Cloud:" uri="/api/drive/callback" /></div>
        ) : st.connected ? (
          <div className="space-y-3"><p className="flex items-center gap-2 text-sm text-success"><Cloud className="h-4 w-4" />Connected{st.email ? ` as ${st.email}` : ''}</p>
            <Button variant="outline" onClick={async () => { await axios.post('/api/drive/disconnect'); toast.success('Google Drive disconnected. Files in your Drive are untouched.'); load() }}>Disconnect</Button></div>
        ) : (
          <div className="space-y-3">{st.reason === 'expired' && <p className="text-sm text-warning">Your Drive authorisation expired or was revoked. Reconnect to continue.</p>}
            <Button asChild><a href="/api/drive/connect"><Cloud className="mr-2 h-4 w-4" />Connect Google Drive</a></Button></div>
        )}
      </Panel>
    </div>
  )
}

function SetupHint({ vars, extra, uri }: { vars: string[]; extra: string; uri: string }) {
  // Developer-only: end users never see server setup steps in production.
  if (process.env.NODE_ENV !== 'development') return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <details className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">Developer setup (shown in development only)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-4">
        <li>Add {vars.map((v, i) => <span key={v}>{i ? ' and ' : ''}<code className="rounded bg-muted px-1">{v}</code></span>)} to <code className="rounded bg-muted px-1">.env.local</code> (see <code className="rounded bg-muted px-1">.env.example</code>).</li>
        <li>{extra} <code className="rounded bg-muted px-1">{origin}{uri}</code></li>
        <li>Restart the server, then come back here to connect.</li>
      </ol>
    </details>
  )
}

const forgetLocalExtras = () => { /* planning inputs now live in the synced data, nothing extra is kept on this device */ }

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
    } catch (e) { toastProblem(e, 'Could not restore backup') }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel flat title="Where your data is"><SyncStatus /></Panel>
      <Panel flat title="Export & backup" description="Restoring replaces current data. Vault items are not included in this file.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportAll}><Download className="mr-2 h-4 w-4" />Export backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Restore backup</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = '' }} />
        </div>
      </Panel>
      <Panel flat title="Session" description={isDemo ? 'You are exploring the sample family. Leaving ends the demo session.' : 'Sign out on this device. Your data stays saved.'}><Button variant="outline" onClick={async () => { forgetLocalExtras(); await signOut() }}><LogOut className="mr-2 h-4 w-4" />{isDemo ? 'Exit demo' : 'Sign out'}</Button></Panel>
      {isDemo ? (
        <Panel flat title="Demo data" description="Restore the original sample data. Your edits in demo are discarded."><Button variant="outline" onClick={() => setDlg('reset')}><RotateCcw className="mr-2 h-4 w-4" />Reset demo data</Button></Panel>
      ) : (
        <Panel flat title="Account management">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Button variant="outline" onClick={() => setDlg('wipe')}><Trash2 className="mr-2 h-4 w-4" />Erase my tracked data</Button><InfoTip label="Erase my tracked data">Clears banks, funds, cards, policies, budget and expenses from your account, on every device.</InfoTip></div>
            <div className="flex items-center gap-2"><Button variant="destructive" onClick={() => setDlg('delete')}>Delete my account</Button><InfoTip label="Delete my account">Removes your login, Drive link and server-side records. Files already in your Google Drive are not deleted.</InfoTip></div>
          </div>
        </Panel>
      )}
      <ConfirmDialog open={dlg === 'reset'} onOpenChange={(o) => !o && setDlg(null)} title="Reset demo data?" description="All demo changes will be lost." confirmLabel="Reset" onConfirm={async () => { await resetDemo(); forgetLocalExtras(); setDlg(null); toast.success('Demo data reset') }} />
      <ConfirmDialog open={dlg === 'wipe'} onOpenChange={(o) => !o && setDlg(null)} title="Erase all tracked data?" description="This cannot be undone. Export a backup first if unsure." confirmLabel="Erase" variant="destructive" onConfirm={async () => { try { await axios.delete('/api/user/data') } catch { /* local-first: still erase this browser */ } await clearAll(db); forgetLocalExtras(); setDlg(null); toast.success('Data erased') }} />
      <ConfirmDialog open={dlg === 'delete'} onOpenChange={(o) => !o && setDlg(null)} title="Delete your account?" description="This permanently removes your account. It cannot be undone." confirmLabel="Delete account" variant="destructive" onConfirm={async () => { try { await axios.delete('/api/user/account'); await clearAll(db); forgetLocalExtras(); await signOut() } catch { toast.error('Could not delete account') } }} />
    </div>
  )
}

/** Everything you set up for budgeting lives here, not on the Budget page: the categories spending goes into, and the rules that file imports under them. */
function BudgetSettings() {
  const [categories, setCategories] = useState(false)
  const [rules, setRules] = useState(false)
  return (
    <div className="space-y-4">
      <Panel flat title="Budgets" description="Limits for a month, in total and by category. Later months start from the one before."><BudgetSetup /></Panel>
      <Panel title="Categories" description="The groups your spending and income are sorted into. Add your own, rename them, or make sub-categories (Food > Eating out).">
        <Button variant="outline" onClick={() => setCategories(true)}>Manage categories</Button>
      </Panel>
      <Panel title="Rules" description="Say once that a description such as “swiggy” always goes to Food, and imports and new entries file themselves.">
        <Button variant="outline" onClick={() => setRules(true)}>Manage rules</Button>
      </Panel>
            {categories && <CategoryManager onClose={() => setCategories(false)} />}
      <RulesDialog open={rules} onOpenChange={setRules} />
    </div>
  )
}

/** Which sections the Overview shows and in what order. It used to be a button on the dashboard. */
function DashboardLayoutSettings() {
  const layout = useDashboardLayout(DASHBOARD_BLOCKS)
  return (
    <div className="mt-4">
      <Panel title="Dashboard layout" description="Show or hide sections of the Overview, change their order, and make each full or half width.">
        <DashboardCustomize blocks={DASHBOARD_BLOCKS} order={layout.order} hidden={layout.hidden} half={layout.half} isCustom={layout.isCustom} onOrder={layout.setOrder} onToggle={layout.toggle} onSize={layout.toggleHalf} onReset={layout.reset} />
      </Panel>
    </div>
  )
}
