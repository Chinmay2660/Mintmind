'use client'

import { useState } from 'react'
import { Copy, Download, Printer, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { reportToText } from '@/lib/ai/report'
import { AssistantChat } from '@/components/ai/AssistantChat'
import { InsightsList } from '@/components/ai/InsightsList'
import { useAi } from '@/components/ai/useAi'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingBlock, PageHeader, Panel, Progress } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'

const TABS = ['Ask', 'Insights', 'Health score', 'Report'] as const

export default function AiPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Ask')
  const { ready, health, report, isDemo } = useAi()
  const [share, setShare] = useState(false)
  if (!ready) return <LoadingBlock className="h-72" />

  const download = () => {
    if (!report) return
    const url = URL.createObjectURL(new Blob([reportToText(report)], { type: 'text/plain' }))
    const a = document.createElement('a'); a.href = url; a.download = `financial-summary-${report.period.replace(/\s/g, '-')}.txt`; a.click(); URL.revokeObjectURL(url)
  }
  const familyText = report ? `${report.title}\n${report.headline.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join('\n')}\n(Net worth summary only. Shared by the account owner.)` : ''

  return (
    <div className="space-y-5">
      <PageHeader title="My Wealth AI" />
      <div role="tablist" aria-label="Wealth AI" className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('shrink-0 border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:bg-muted', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t}</button>)}
      </div>

      {tab === 'Ask' && <Panel bodyClassName="p-4"><div className="h-[60dvh] min-h-[22rem]"><AssistantChat compact /></div></Panel>}
      {tab === 'Insights' && <Panel title="Insights"><InsightsList /></Panel>}

      {tab === 'Health score' && health && (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-end gap-3"><span className="text-5xl font-semibold">{health.score ?? '—'}</span><span className="pb-1 text-muted-foreground">/ 100 · {health.label}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{health.disclaimer}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div><h3 className="mb-1.5 text-sm font-semibold">Strengths</h3>{health.strengths.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{health.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-muted-foreground">None yet.</p>}</div>
              <div><h3 className="mb-1.5 text-sm font-semibold">Areas to improve</h3>{health.improvements.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{health.improvements.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing flagged.</p>}</div>
              <div><h3 className="mb-1.5 text-sm font-semibold">Suggested actions</h3>{health.actions.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{health.actions.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-muted-foreground">Keep it up.</p>}</div>
            </div>
          </Panel>
          <Panel title="How the score is calculated">
            <ul className="space-y-4">{health.params.map((p) => (
              <li key={p.key}><div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-medium">{p.name} <span className="text-xs font-normal text-muted-foreground">weight {p.weight}</span></span><span className="text-muted-foreground">{p.value ?? 'No data'}{p.score != null ? ` · ${p.score}/100` : ''}</span></div>
                {p.score != null && <div className="mt-1"><Progress value={p.score} tone={p.score < 40 ? 'danger' : p.score < 70 ? 'warning' : 'primary'} label={p.name} /></div>}
                <p className="mt-1 text-xs text-muted-foreground">Rule: {p.rule}</p></li>))}</ul>
            {health.missing.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Not enough data for: {health.missing.join(', ')}.</p>}
          </Panel>
        </div>
      )}

      {tab === 'Report' && report && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Download PDF</Button>
            <Button variant="outline" onClick={download}><Download className="mr-1.5 h-4 w-4" />Export text</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(reportToText(report)).then(() => toast.success('Report copied'), () => toast.error('Could not copy')) }}><Copy className="mr-1.5 h-4 w-4" />Copy</Button>
            <Button variant="outline" onClick={() => setShare(true)}><Share2 className="mr-1.5 h-4 w-4" />Family summary</Button>
          </div>
          <article id="report" className="space-y-4">
            <Panel>
              <h2 className="text-lg font-semibold">{report.title}</h2>
              <p className="text-xs text-muted-foreground">Data as of {report.asOf}{report.partial ? ' (month in progress)' : ''}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{report.headline.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-base font-semibold">{v}</dd></div>)}</dl>
              {report.summary && <p className="mt-4 border-t border-border pt-4 text-sm">{report.summary}</p>}
              <p className="mt-2 text-[11px] text-muted-foreground">{isDemo ? 'Demo: simulated from sample data. ' : ''}{report.source}. Educational summary, not financial advice.</p>
            </Panel>
            <div className="grid gap-4 md:grid-cols-2">{report.sections.map((s) => (
              <Panel key={s.title} title={s.title}><dl className="divide-y divide-border">{s.rows.map(([k, v], i) => <div key={i} className="flex justify-between gap-3 py-1.5 text-sm"><dt className="min-w-0">{k}</dt><dd className="shrink-0 text-right text-muted-foreground">{v}</dd></div>)}</dl></Panel>))}</div>
            {report.actions.length > 0 && <Panel title="Suggested actions"><ul className="list-disc space-y-1 pl-5 text-sm">{report.actions.map((a) => <li key={a}>{a}</li>)}</ul></Panel>}
          </article>
        </div>
      )}
      <ConfirmDialog open={share} onOpenChange={setShare} title="Copy a family summary?" description={`This copies only: ${familyText.split('\n').slice(1, -1).join(', ')}. Nothing is sent anywhere; you choose where to paste it.`} confirmLabel="Copy summary" onConfirm={async () => { await navigator.clipboard.writeText(familyText).catch(() => {}); setShare(false); toast.success('Family summary copied') }} />
    </div>
  )
}

