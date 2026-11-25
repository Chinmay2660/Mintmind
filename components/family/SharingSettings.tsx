'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { sharingPreview } from '@/lib/family/visibility'
import { PERMS } from '@/lib/family/perms'
import { formatPct } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, LoadingBlock, Panel } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'
import { useMySharedSummary } from './useMySummary'

/**
 * Settings > Family sharing: what each person in your circle can see of you. Choose "Everyone" for the circle default, or one
 * person to give them their own setting. The preview below is drawn by the same rule the server applies.
 */
export function SharingSettings() {
  const { ready, isDemo, db, data } = useWealth()
  const mine = useMySharedSummary()
  const [circle, setCircle] = useState<any | null | undefined>(undefined)
  const [target, setTarget] = useState('all')

  const load = useCallback(async () => {
    if (isDemo) return
    try { setCircle((await axios.get('/api/family-circle')).data.circle) } catch { setCircle(null) }
  }, [isDemo])
  useEffect(() => { if (ready) load() }, [ready, load])

  // one shape for the demo (rows in the local database) and a real account (the server's answer)
  const members: any[] = isDemo ? data.members : circle?.members ?? []
  const self = members.find((m) => m.self)
  const others = members.filter((m) => !m.self && m.status === 'active')
  const overrideOf = (id: string): any | null => {
    const o = self?.overrides
    if (!o) return null
    return Array.isArray(o) ? o.find((x: any) => String(x.viewerId) === String(id))?.permissions ?? null : o[id] ?? null
  }
  const current = target === 'all' ? self?.permissions : overrideOf(target) ?? self?.permissions
  const custom = target !== 'all' && !!overrideOf(target)
  const person = others.find((m) => m.id === target)

  if (isDemo ? !ready : circle === undefined) return <LoadingBlock className="h-40" />
  if (!self) return <Empty title="No family circle yet" description="Create or join a circle first, then choose what each member sees." action={<Button asChild><Link href="/dashboard/family">Open Family Circle</Link></Button>} />

  const toggle = async (key: string, value: boolean) => {
    try {
      if (isDemo) {
        if (target === 'all') await db.members.update(self.id, { permissions: { ...self.permissions, [key]: value } })
        else await db.members.update(self.id, { overrides: { ...(self.overrides || {}), [target]: { ...(current || {}), [key]: value } } })
      } else {
        const r = await axios.post('/api/family-circle', target === 'all' ? { action: 'update-sharing', permissions: { [key]: value } } : { action: 'update-sharing', memberId: target, permissions: { [key]: value } })
        setCircle(r.data.circle)
      }
    } catch (e) { toast.error(axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : 'Could not save') }
  }
  const reset = async () => {
    try {
      if (isDemo) { const next = { ...(self.overrides || {}) }; delete next[target]; await db.members.update(self.id, { overrides: next }) }
      else setCircle((await axios.post('/api/family-circle', { action: 'update-sharing', memberId: target, reset: true })).data.circle)
      toast.success('Back to the circle default')
    } catch { toast.error('Could not reset') }
  }

  const preview = sharingPreview(mine, current || {})
  return (
    <div className="space-y-4">
      <Panel title="Who are you choosing for?" description="Start with Everyone. Pick a person only when they should see something different.">
        <div role="group" aria-label="Choose who" className="flex flex-wrap gap-1.5">
          {[{ id: 'all', name: 'Everyone' }, ...others].map((m: any) => {
            const on = target === m.id
            const has = m.id !== 'all' && !!overrideOf(m.id)
            return (
              <button key={m.id} type="button" aria-pressed={on} onClick={() => setTarget(m.id)}
                className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
                {m.name}{has && <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">own setting</span>}
              </button>
            )
          })}
        </div>
        {others.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Nobody else has joined yet, so these choices apply to whoever joins.</p>}
      </Panel>

      <Panel title={target === 'all' ? 'What everyone can see' : `What ${person?.name ?? 'this person'} can see`}
        description={target === 'all' ? 'The default for every member without a setting of their own.' : custom ? 'This person has their own setting.' : 'This person follows the circle default. Change anything below to give them their own.'}
        action={custom ? <Button size="sm" variant="outline" onClick={reset}>Use circle default</Button> : undefined}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PERMS.map(([k, l, d]) => (
            <li key={k}>
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox className="mt-0.5" checked={!!current?.[k]} onChange={(e) => toggle(k, e.target.checked)} />
                <span><span className="block font-medium">{l}</span><span className="text-xs text-muted-foreground">{d}</span></span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={target === 'all' ? 'What others see of you' : `What ${person?.name ?? 'they'} see${person ? 's' : ''} of you`} description="Updates as you tick the boxes. Your personal budgets, spending and transactions are never shared.">
        <ul className="divide-y divide-border text-sm">
          {preview.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-center gap-2">{r.visible ? <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}<span className={r.visible ? '' : 'text-muted-foreground'}>{r.label}</span></span>
              <span className="shrink-0 text-right tabular-nums">{!r.visible ? <span className="text-xs text-muted-foreground">Hidden</span> : r.kind === 'money' ? <Money value={r.value as number} /> : r.kind === 'pct' ? formatPct(r.value as number, 1) : <span className="text-xs font-medium">Shared</span>}</span>
            </li>
          ))}
        </ul>
        {current?.emergencyOnly && <p className="mt-3 text-xs text-muted-foreground">Emergency-only is on, so nothing is shown on the dashboard. Trusted contacts reach you only through Digital Legacy.</p>}
      </Panel>
    </div>
  )
}
