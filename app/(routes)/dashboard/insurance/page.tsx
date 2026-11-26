'use client'

import { PolicyForm, kindOf, typeLabel } from '@/components/wealth/PolicyParts'
import Link from 'next/link'
import { OverviewCard } from '@/components/wealth/HoldingUI'
import { useRouter } from 'next/navigation'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deletePolicy, save } from '@/lib/wealth/actions'
import { istNow } from '@/lib/wealth/calc'
import { POLICY_TYPES } from '@/lib/wealth/labels'
import { annualPremium, coverageTotals } from '@/lib/wealth/selectors'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Empty, LoadingBlock, PageHeader } from '@/components/wealth/kit'
import { TabBar } from '@/components/ui/tab-bar'

export default function InsurancePage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data, db } = useWealth()
  useAddParam((what) => { if (what === 'policy') setDlg({ kind: 'edit' }) })
  const [kindTab, setKindTab] = useState('') // the kind of policy shown; the first one until another is picked
  const [dlg, setDlg] = useState<null | { kind: 'edit' | 'del'; row?: any }>(null)
  const router = useRouter()
  useEffect(() => { const q = new URLSearchParams(window.location.search), id = q.get('policy'), type = q.get('type'); if (id) router.replace(`/dashboard/insurance/${id}`); else if (type) setKindTab(type) }, [router])
  const today = useMemo(() => istNow(), [])
  const cover = useMemo(() => coverageTotals(data.policies, today), [data.policies, today])
  if (!ready) return <LoadingBlock className="h-64" />

  const annual = data.policies.reduce((s, p) => s + annualPremium(p), 0)
  // each kind of policy that exists, with the cover it gives; a kind opens to show its policies
  const kindKeys = [...new Set<string>(data.policies.map(kindOf))]
  const order = (k: string) => { const i = POLICY_TYPES.findIndex((t) => t.value === k); return i < 0 ? 99 : i }
  const kinds = kindKeys.sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map((k) => ({ value: k, label: typeLabel(k) }))
  const activeKind = kinds.some((k) => k.value === kindTab) ? kindTab : kinds[0]?.value ?? ''

  return (
    <div className="space-y-5">
      <PageHeader description="Coverage is protection, not wealth. It is never counted in your net worth." primaryAction={{ label: 'Add policy', onClick: () => setDlg({ kind: 'edit' }) }} />
      <OverviewCard label="Total coverage" value={<Money value={cover.total} />} rows={[{ label: 'Annual premium', value: <Money value={annual} /> }]} />

      {(kinds.length === 0 ? <Empty title="No policies" action={<Button onClick={() => setDlg({ kind: 'edit' })}>Add policy</Button>} /> : (
        <>
          <TabBar label="Kinds of policy" value={activeKind} onChange={setKindTab} tabs={kinds.map((t) => ({ key: t.value, label: t.label }))} />
          <ul className="divide-y divide-border border-b border-border">
            {data.policies.filter((p: any) => kindOf(p) === activeKind).map((p: any) => (
              <li key={p.id}>
                <Link href={`/dashboard/insurance/${p.id}`} aria-label={`${p.policyName}, ${p.company}. Open details`} className="flex min-h-[4.25rem] w-full items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.policyName}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{p.company}</span>
                  </span>
                  <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
                    <span className="block whitespace-nowrap text-sm font-semibold tabular-nums"><Money value={p.sumAssured} /></span>
                    <span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">{p.nextPremium ? `Due ${formatDate(p.nextPremium)}` : '-'}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ))}


      {dlg?.kind === 'edit' && <PolicyForm row={dlg.row} members={data.members} documents={data.documents} accounts={data.bankAccounts.filter((a: any) => a.type !== 'cash')} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'policies', r); toast.success('Policy saved') }} />}
      <ConfirmDialog open={dlg?.kind === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this policy?" description="Its premium history is removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deletePolicy(db, dlg!.row.id); setDlg(null); toast.success('Policy deleted') }} />
    </div>
  )
}

