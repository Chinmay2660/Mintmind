'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Bell, Lightbulb, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { widgetPicks } from '@/lib/ai/insights'
import { Button } from '@/components/ui/button'
import { Panel, LoadingBlock } from '@/components/wealth/kit'
import { useAi } from './useAi'
import { useAssistant } from './AssistantProvider'

/** Dashboard widget: one insight, one spending observation, one reminder, one suggested action. */
export function WealthAiWidget() {
  const { facts, insights, isDemo } = useAi()
  const { open } = useAssistant()
  const picks = useMemo(() => (facts ? widgetPicks(facts, insights) : null), [facts, insights])
  if (!picks) return <LoadingBlock className="h-40" />
  const Row = ({ icon: Icon, label, text, href }: { icon: typeof Bell; label: string; text?: string; href?: string }) => text ? (
    <li className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>{href ? <Link href={href} className="text-sm hover:text-primary">{text}</Link> : <p className="text-sm">{text}</p>}</div></li>
  ) : null
  const any = picks.money || picks.spending || picks.reminder || picks.action
  return (
    <Panel title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" />Your Wealth AI</span>}
      action={<Button size="sm" onClick={() => open()}>Ask Wealth AI</Button>}>
      {!any ? <p className="text-sm text-muted-foreground">Add some data and I&apos;ll start spotting things for you.</p> : (
        <ul className="space-y-3">
          <Row icon={TrendingUp} label="Insight" text={picks.money?.text} href={picks.money?.href} />
          <Row icon={Wallet} label="Spending" text={picks.spending?.text} href={picks.spending?.href} />
          <Row icon={Bell} label="Reminder" text={picks.reminder?.text} href={picks.reminder?.href} />
          <Row icon={Lightbulb} label="Suggested action" text={picks.action?.text} href={picks.action?.href} />
        </ul>
      )}
      <Link href="/dashboard/ai" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">All insights, report and health score →</Link>
    </Panel>
  )
}
