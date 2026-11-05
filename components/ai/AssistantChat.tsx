'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { ArrowUp, Loader2, Sparkles } from 'lucide-react'
import { answerQuestion, SUGGESTED_QUESTIONS } from '@/lib/ai/assistant'
import { useAi, useAiProvider } from './useAi'
import { cn } from '@/lib/utils'

interface Msg {
  role: 'user' | 'ai'; text: string; rows?: string[][] | null; links?: { label: string; href: string }[]; period?: string; unavailable?: boolean; source?: string
  headline?: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }; lead?: string; stats?: string[][]; bar?: { value: number; marker?: number; label: string }; detail?: string; followups?: string[]
}

const TONE = { good: 'text-success', bad: 'text-destructive', neutral: 'text-foreground' } as const

function AnswerCard({ m, onAsk }: { m: Msg; onAsk: (q: string) => void }) {
  const structured = !!m.headline
  return (
    <div className="min-w-0 flex-1 space-y-3 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3.5">
      {structured ? (
        <div>
          <p className="text-xs text-muted-foreground">{m.headline!.label}</p>
          <p className={cn('text-2xl font-semibold tracking-tight tabular-nums', TONE[m.headline!.tone])}>{m.headline!.value}</p>
          {m.lead && <p className="mt-1 text-sm text-muted-foreground">{m.lead}</p>}
        </div>
      ) : <p className={cn('whitespace-pre-wrap text-sm leading-relaxed', m.unavailable && 'text-muted-foreground')}>{m.text}</p>}

      {m.bar && (
        <div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', m.bar.value > (m.bar.marker ?? 100) ? 'bg-destructive' : 'bg-primary')} style={{ width: `${Math.min(m.bar.value, 100)}%` }} />{m.bar.marker != null && <span className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${Math.min(m.bar.marker, 100)}%` }} aria-hidden />}</div>
          <p className="mt-1 text-xs text-muted-foreground">{m.bar.label}</p>
        </div>
      )}
      {m.stats && m.stats.length > 0 && <dl className="divide-y divide-border border-t border-border text-sm">{m.stats.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>)}</dl>}
      {m.rows && <dl className="divide-y divide-border border-t border-border text-sm">{m.rows.map(([k, v], j) => <div key={j} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="min-w-0 truncate">{k}</dt><dd className="shrink-0 text-right text-muted-foreground">{v}</dd></div>)}</dl>}
      {m.detail && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer select-none hover:text-foreground">How this is calculated</summary><p className="mt-1.5 leading-relaxed">{m.detail}</p></details>}
      {(m.links?.length || m.followups?.length) ? (
        <div className="flex flex-col items-start gap-1 border-t border-border pt-2.5 text-xs">
          {m.links?.slice(0, 1).map((l) => <Link key={l.href} href={l.href} className="font-medium text-primary hover:underline">Open {l.label} →</Link>)}
          {m.followups?.slice(0, 2).map((f) => <button key={f} type="button" onClick={() => onAsk(f)} className="text-left text-muted-foreground transition-colors hover:text-foreground">{f}</button>)}
        </div>
      ) : null}
      <p className="text-[11px] text-muted-foreground/80">{m.period ? `Data: ${m.period} · ` : ''}{m.source}</p>
    </div>
  )
}

/** Conversation with My Wealth AI. History lives only in this component's memory and is never stored. */
export function AssistantChat({ compact = false }: { compact?: boolean }) {
  const { facts, data, isDemo } = useAi()
  const provider = useAiProvider()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }, [msgs, busy])

  const ask = async (question: string) => {
    if (!facts || !question.trim() || busy) return
    setQ('')
    setMsgs((m) => [...m, { role: 'user', text: question }])
    const a: any = answerQuestion(question, facts, data)
    const base: Msg = { role: 'ai', text: a.text, rows: a.rows, links: a.links, period: a.period, unavailable: a.unavailable, headline: a.headline, lead: a.lead, stats: a.stats, bar: a.bar, detail: a.detail, followups: a.followups, source: isDemo ? 'Demo: simulated with built-in rules, no AI service used' : 'Built-in analysis of your data' }
    if (provider.usable && !a.unavailable) {
      setBusy(true)
      try {
        // Only pre-calculated aggregates are sent: no account/card numbers, documents, vault data or credentials.
        const { data: r } = await axios.post('/api/ai/chat', { question, draft: a.text, consent: true, facts: { asOf: facts.asOf, monthLabel: facts.monthLabel, netWorth: facts.netWorth, money: facts.money, budget: facts.budget, funds: { summary: facts.funds.summary, perFund: facts.funds.perFund, monthChange: facts.funds.monthChange }, cards: facts.cards, insurance: facts.insurance, banks: { total: facts.banks.total }, family: facts.family } })
        if (r.text) { setMsgs((m) => [...m, { ...base, lead: r.text, source: `AI-written from your calculated figures (${r.provider})` }]); setBusy(false); return }
      } catch { /* fall back to the built-in answer below */ }
      setBusy(false)
    }
    setMsgs((m) => [...m, base])
  }

  return (
    <div className={cn('flex flex-col', compact ? 'h-full' : 'min-h-[24rem]')}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2 pr-1" aria-live="polite">
        {msgs.length === 0 && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
              <div><p className="font-semibold">Hi, I&apos;m My Wealth AI.</p><p className="mt-0.5 text-sm text-muted-foreground">Ask about your money in plain words. I use your real figures, tell you which period they cover, and say so when something is missing.</p></div></div>
            <div className="grid gap-2 sm:grid-cols-2">{SUGGESTED_QUESTIONS.map((s) => <button key={s} type="button" onClick={() => ask(s)} disabled={!facts} className="rounded-xl border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-50">{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.text}</div>
        ) : (
          <div key={i} className="flex"><AnswerCard m={m} onAsk={ask} /></div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking…</div>}
        <div ref={end} />
      </div>
      <form className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-ring/40" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input aria-label="Ask My Wealth AI" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Ask about your finances…" value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" aria-label="Send" disabled={!q.trim() || !facts || busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
      </form>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Educational information, not financial advice.{isDemo ? ' Demo: simulated with sample data.' : provider.usable ? ' AI provider enabled with your consent.' : ''}</p>
    </div>
  )
}
