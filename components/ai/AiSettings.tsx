'use client'

import { useWealth } from '@/lib/wealth/WealthContext'
import { LoadingBlock, Panel } from '@/components/wealth/kit'
import { useAiProvider } from './useAi'

/** Consent, provider status and usage. The built-in analysis works without any of this. */
export function AiSettings() {
  const { isDemo } = useWealth()
  const { status, consent, setConsent } = useAiProvider()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="My Wealth AI" description="Insights, answers, reports and the health score are calculated by the app from your own data and work with no AI service at all.">
        {isDemo ? <p className="text-sm text-muted-foreground">Demo mode never uses an AI service. Answers are simulated from sample data by built-in rules and are labelled as such.</p> : !status ? <LoadingBlock className="h-16" /> : (
          <div className="space-y-3 text-sm">
            <p>{status.configured ? <>An AI provider (<strong>{status.provider}</strong>) is available. It can make answers read more naturally.</> : 'No AI provider is configured on this server, so built-in answers are used.'}</p>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" disabled={!status.configured} checked={consent && status.configured} onChange={(e) => setConsent(e.target.checked)} /><span><span className="block font-medium">Let My Wealth AI use an AI provider</span><span className="text-xs text-muted-foreground">Off by default. When on, only the calculated figures needed for your question are sent from our server to the provider.</span></span></label>
          </div>
        )}
      </Panel>
      <Panel title="What is shared, and what never is">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Shared (only with consent):</strong> totals and percentages the app already calculated, fund and card names, and your question.</li>
          <li><strong className="text-foreground">Never shared:</strong> passwords, vault contents, master password or keys, Aadhaar, PAN, account and card numbers, documents, OAuth tokens.</li>
          <li>The provider only rephrases figures. It cannot calculate, change or create financial records.</li>
          <li>Requests are made by our server (keys are never in the browser), rate limited, time limited, and fall back to the built-in answer on any error. We store usage counts only, not your questions or answers.</li>
        </ul>
      </Panel>
      {!isDemo && status?.configured && (
        <Panel title="Usage today">
          {status.today ? <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Requests</dt><dd className="font-medium">{status.today.requests} / {status.dailyLimit}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Failures</dt><dd className="font-medium">{status.today.failures}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Tokens (in / out)</dt><dd className="font-medium">{status.today.inputTokens} / {status.today.outputTokens}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Estimated cost</dt><dd className="font-medium">{status.today.estimatedCost == null ? 'Set AI_PRICE_* to track' : `$${status.today.estimatedCost}`}</dd></div>
          </dl> : <p className="text-sm text-muted-foreground">No usage yet today.</p>}
        </Panel>
      )}
    </div>
  )
}
