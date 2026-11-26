'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Check, MoreVertical, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toastProblem } from '@/lib/notify'
import { useWealth } from '@/lib/wealth/WealthContext'
import { deletePolicy, recordPremiumPaid, save } from '@/lib/wealth/actions'
import { premiumPayable } from '@/lib/wealth/premium'
import { istNow } from '@/lib/wealth/calc'
import { PREMIUM_FREQUENCIES } from '@/lib/wealth/labels'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CopyValue } from '@/components/wealth/CopyButton'
import { CategoryHeader } from '@/components/wealth/CategoryHeader'
import { HistoryList } from '@/components/wealth/HistoryList'
import { PolicyForm, kindOf, premiumStatus, typeLabel } from '@/components/wealth/PolicyParts'
import { useDetailCrumb } from '@/components/shell/DetailCrumb'
import { Empty, LoadingBlock, Panel } from '@/components/wealth/kit'
import { cn } from '@/lib/utils'

/** One policy on its own page, the same page as a fund: the totals and a tab for each policy, the main action, Edit and Delete in the three dots, the figures, the details. */
export default function PolicyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, data, db } = useWealth()
  const today = useMemo(() => istNow(), [])
  const [dlg, setDlg] = useState<null | 'edit' | 'del'>(null)
  const [busy, setBusy] = useState(false)
  const p = data.policies.find((x: any) => x.id === id)
  useDetailCrumb(p ? typeLabel(kindOf(p)) : null, () => router.push('/dashboard/insurance')) // the kind of insurance, not the policy's own name (that is the tab)
  if (!ready) return <LoadingBlock className="h-64" />
  if (!p) return <Empty title="Policy not found" action={<Link className="text-primary underline" href="/dashboard/insurance">Go to insurance</Link>} />
  const st = premiumStatus(p, today)
  const can = premiumPayable(p, today)
  const freq = PREMIUM_FREQUENCIES.find((x) => x.value === p.frequency)?.label
  const doc = data.documents.find((x: any) => x.id === p.documentId)
  const history = data.premiums.filter((h: any) => h.policyId === p.id).sort((x: any, y: any) => y.date.localeCompare(x.date))
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="outline" className="h-9 w-9 shrink-0" aria-label="More for this policy"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDlg('edit')}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDlg('del')} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-5">
      <CategoryHeader tabsLabel="Your policies" items={data.policies.map((x: any) => ({ key: x.id, label: x.policyName || x.company || 'Policy' }))} active={p.id} onPick={(k) => router.push(`/dashboard/insurance/${k}`)} />
      <p className="text-sm text-muted-foreground">{p.company}</p>
      {p.frequency !== 'single' && (can.ok
        ? <div className="flex items-center gap-2"><Button className="flex-1 sm:flex-none" disabled={busy} onClick={async () => { setBusy(true); try { await recordPremiumPaid(db, p.id); toast.success('Premium recorded; next due date moved forward') } catch (e) { toastProblem(e, 'Could not record the premium') } finally { setBusy(false) } }}>Mark premium paid</Button>{menu}</div>
        : <div className="flex items-center gap-2"><p className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm"><Check className="h-4 w-4 shrink-0 text-success" /><span>{can.reason}</span></p>{menu}</div>)}
      {p.frequency === 'single' && <div className="flex justify-end">{menu}</div>}
      <Panel title="Policy details">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Sum assured</dt><dd><span className="font-semibold"><Money value={p.sumAssured} /></span></dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd><span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', st.cls)}>{st.label}</span></dd></div>
          <div><dt className="text-xs text-muted-foreground">Premium</dt><dd><Money value={p.premium} />{freq ? <span className="text-xs text-muted-foreground"> {freq}</span> : null}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Next premium</dt><dd>{p.nextPremium ? formatDate(p.nextPremium) : '-'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Policy number</dt><dd><CopyValue value={p.policyNumber} label="Policy number" mono /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Policy holder</dt><dd><CopyValue value={p.holder} label="Policy holder" /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Nominee</dt><dd>{p.nominee ? <CopyValue value={p.nominee} label="Nominee" /> : '-'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Period</dt><dd>{formatDate(p.startDate)} to {p.endDate ? formatDate(p.endDate) : 'no end date'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Covers</dt><dd>{p.members?.length ? p.members.join(', ') : '-'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Document</dt><dd><span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5 text-muted-foreground" />{doc ? doc.name : 'None attached'}</span></dd></div>
        </dl>
      </Panel>
      <Panel title="Premium history">
        <HistoryList rows={history} getKey={(h: any) => h.id} empty={<Empty title="No premiums recorded yet" />}>
          {(h: any) => <><span>{formatDate(h.date)}</span><Money value={h.amount} className="font-medium" /></>}
        </HistoryList>
      </Panel>
      {dlg === 'edit' && <PolicyForm row={p} members={data.members} documents={data.documents} accounts={data.bankAccounts.filter((a: any) => a.type !== 'cash')} onClose={() => setDlg(null)} onSave={async (r) => { await save(db, 'policies', r); toast.success('Policy saved') }} />}
      <ConfirmDialog open={dlg === 'del'} onOpenChange={(o) => !o && setDlg(null)} title="Delete this policy?" description="Its premium history is removed too." confirmLabel="Delete" variant="destructive" onConfirm={async () => { await deletePolicy(db, p.id); setDlg(null); toast.success('Policy deleted'); router.push('/dashboard/insurance') }} />
    </div>
  )
}
