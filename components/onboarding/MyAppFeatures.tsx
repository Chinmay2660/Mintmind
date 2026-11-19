'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, Lightbulb } from 'lucide-react'
import { FEATURES, featureByKey, suggestFeatures } from '@/lib/features'
import { useFeatures } from '@/lib/features/FeaturesContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { iconFor } from './icons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Panel, InfoTip } from '@/components/wealth/kit'

/** Settings → My App Features: Active and Available. Turning a feature off never deletes its data. */
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

  // The whole left side of an active row opens the feature; the switch on the right turns it on or off.
  const Row = ({ k }: { k: string }) => {
    const f = featureByKey(k)!
    const Icon = iconFor(f.icon)
    const on = isEnabled(k)
    const info = (
      <>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Icon className="h-5 w-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{f.name}</span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{f.core ? 'Always on. ' : ''}{f.description}</span>
        </span>
      </>
    )
    return (
      <li className="flex items-center gap-1">
        {on && !f.noRoute ? (
          <Link href={f.path} aria-label={`Open ${f.name}`} className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted">{info}</Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 py-3">{info}</div>
        )}
        <Switch checked={on} disabled={f.core || busy} aria-label={`${f.name} ${on ? 'is on' : 'is off'}`} onCheckedChange={(next) => (next ? setIntro(k) : setOff(k))} />
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

      <Dialog open={!!intro} onOpenChange={(o) => !o && setIntro(null)}>
        <DialogContent>{intro && (() => { const f = featureByKey(intro)!; return (<>
          <DialogHeader><div className="flex items-center gap-2"><DialogTitle>Turn on {f.name}</DialogTitle><InfoTip label="Details">{f.description}</InfoTip></div><DialogDescription className="sr-only">{f.description}</DialogDescription></DialogHeader>
          <ul className="space-y-1.5 text-sm">{f.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{b}</li>)}</ul>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm"><strong>What it needs:</strong> {f.needs}</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIntro(null)}>Cancel</Button><Button disabled={busy} onClick={() => change(intro, true)}>Turn on</Button></div>
        </>) })()}</DialogContent>
      </Dialog>
      <ConfirmDialog open={!!off} onOpenChange={(o) => !o && setOff(null)} title={`Turn off ${off ? featureByKey(off)!.name : ''}?`} description="It disappears from your menu and dashboard. Everything you added stays saved, and turning it on again brings it back." confirmLabel="Turn off" onConfirm={() => change(off!, false)} />
    </div>
  )
}
