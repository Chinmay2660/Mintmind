'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, Lightbulb } from 'lucide-react'
import { COMING_SOON, FEATURES, featureByKey, suggestFeatures } from '@/lib/features'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { iconFor } from './icons'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Panel } from '@/components/wealth/kit'

/** Settings → My App Features: Active, Available and Coming soon. Turning a feature off never deletes its data. */
export function MyAppFeatures() {
  const { isEnabled, setFeature, enabled } = useFeatures()
  const { data } = useWealth()
  const [intro, setIntro] = useState<string | null>(null)
  const [off, setOff] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const suggestions = useMemo(() => suggestFeatures(enabled, { banks: data.bankAccounts.length, funds: data.funds.length, policies: data.policies.length, cards: data.cards.length }), [enabled, data.bankAccounts.length, data.funds.length, data.policies.length, data.cards.length])
  const active = FEATURES.filter((f) => isEnabled(f.key))
  const available = FEATURES.filter((f) => !isEnabled(f.key))

  const change = async (key: string, on: boolean) => {
    setBusy(true)
    try { await setFeature(key, on); toast.success(`${featureByKey(key)!.name} ${on ? 'is on' : 'is off. Your data is kept'}`) } catch { toast.error('Could not save. Please try again.') } finally { setBusy(false); setIntro(null); setOff(null) }
  }

  const Row = ({ k }: { k: string }) => {
    const f = featureByKey(k)!
    const Icon = iconFor(f.icon)
    const on = isEnabled(k)
    return (
      <li className="flex items-center gap-3 py-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">{f.name}</p><p className="truncate text-xs text-muted-foreground">{f.description}</p></div>
        {on ? (
          <div className="flex shrink-0 gap-2">
            {!f.noRoute && <Button asChild size="sm" variant="ghost"><Link href={f.path}>Open</Link></Button>}
            {f.core ? <span className="self-center text-xs text-muted-foreground">Always on</span> : <Button size="sm" variant="outline" onClick={() => setOff(k)}>Turn off</Button>}
          </div>
        ) : <Button size="sm" onClick={() => setIntro(k)}>Turn on</Button>}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <Panel title={<span className="flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-primary" />Make your app smarter</span>}>
          <ul className="divide-y divide-border">{suggestions.slice(0, 3).map((s) => <li key={s.key} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><span className="block font-medium">{featureByKey(s.key)!.name}</span><span className="text-xs text-muted-foreground">{s.reason}</span></span><Button size="sm" variant="outline" onClick={() => setIntro(s.key)}>Turn on</Button></li>)}</ul>
        </Panel>
      )}
      <Panel title="Active"><ul className="divide-y divide-border">{active.map((f) => <Row key={f.key} k={f.key} />)}</ul></Panel>
      {available.length > 0 && <Panel title="Available"><ul className="divide-y divide-border">{available.map((f) => <Row key={f.key} k={f.key} />)}</ul></Panel>}
      <Panel title="Coming soon"><ul className="divide-y divide-border">{COMING_SOON.map((c) => <li key={c.key} className="py-2.5 text-sm"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.description}</p></li>)}</ul></Panel>

      <Dialog open={!!intro} onOpenChange={(o) => !o && setIntro(null)}>
        <DialogContent>{intro && (() => { const f = featureByKey(intro)!; return (<>
          <DialogHeader><DialogTitle>Turn on {f.name}</DialogTitle><DialogDescription>{f.description}</DialogDescription></DialogHeader>
          <ul className="space-y-1.5 text-sm">{f.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{b}</li>)}</ul>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm"><strong>What it needs:</strong> {f.needs}</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIntro(null)}>Cancel</Button><Button disabled={busy} onClick={() => change(intro, true)}>Turn on</Button></div>
        </>) })()}</DialogContent>
      </Dialog>
      <ConfirmDialog open={!!off} onOpenChange={(o) => !o && setOff(null)} title={`Turn off ${off ? featureByKey(off)!.name : ''}?`} description="It disappears from your menu and dashboard. Everything you added stays saved, and turning it on again brings it back." confirmLabel="Turn off" onConfirm={() => change(off!, false)} />
    </div>
  )
}
