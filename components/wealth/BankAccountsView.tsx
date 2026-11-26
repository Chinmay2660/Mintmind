'use client'

import { OverviewCard } from '@/components/wealth/HoldingUI'
import { TabBar } from '@/components/ui/tab-bar'
import { DebitCardsTab } from '@/components/wealth/DebitCards'
import { HoldingsTab } from '@/components/wealth/investments/HoldingsTab'
import { LedgerView } from '@/components/wealth/LedgerView'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import Link from 'next/link'
import { useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { availableBalance, mabShortfall } from '@/lib/wealth/calc'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Empty, LoadingBlock, PageHeader } from '@/components/wealth/kit'
import { AccountForm, ACCOUNT_TYPES } from '@/components/wealth/AccountForm'

/** Bank and cash accounts as tabs. */
export function BankAccountsView() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data, db } = useWealth()
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState('all') // All, then each kind of account you have, then Debit cards
  useAddParam((what) => { if (what === 'account') setAdding(true) })
  if (!ready) return <LoadingBlock className="h-64" />
  const total = data.bankAccounts.reduce((s, b) => s + b.currentBalance, 0)
  const kinds = ACCOUNT_TYPES.filter((t) => data.bankAccounts.some((b: any) => b.type === t.value))
  const active = ['debit', 'fd', 'txns'].includes(tab) || kinds.some((k) => k.value === tab) ? tab : 'all'
  const shown = active === 'all' ? data.bankAccounts : data.bankAccounts.filter((b: any) => b.type === active)

  return (
    <div className="space-y-5">
      <PageHeader primaryAction={['debit', 'fd', 'txns'].includes(active) ? undefined : { label: 'Add account', onClick: () => setAdding(true) }} />
      {active !== 'fd' && active !== 'txns' && <OverviewCard label="Total balance" value={<Money value={total} />} rows={[{ label: 'Available balance', value: <Money value={data.bankAccounts.reduce((n: number, b: any) => n + (b.type === 'cash' ? b.currentBalance : availableBalance(b)), 0)} /> }, { label: 'Accounts', value: data.bankAccounts.length }]} />}
      <TabBar label="Kinds of account" value={active} onChange={setTab} tabs={[{ key: 'all', label: 'All', badge: data.bankAccounts.length }, ...kinds.map((k) => ({ key: k.value, label: k.label, badge: data.bankAccounts.filter((b: any) => b.type === k.value).length })), { key: 'debit', label: 'Debit cards', badge: data.debitCards.length }, { key: 'fd', label: 'Fixed deposits' }, { key: 'txns', label: 'Transactions' }]} />
      {active === 'debit' ? <DebitCardsTab /> : active === 'fd' ? <HoldingsTab kind="fd" /> : active === 'txns' ? <LedgerView /> : data.bankAccounts.length === 0 ? (
        <Empty title="No bank accounts yet" description="Add your savings accounts to track balances and history." action={<Button onClick={() => setAdding(true)}>Add account</Button>} />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((b) => (
            <li key={b.id}>
              <Link href={`/dashboard/bank-accounts/${b.id}`} aria-label={`${b.nickname || b.bankName}, open details`} className="flex min-h-[4.25rem] items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug">{b.nickname || b.bankName}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{b.type === 'cash' ? 'Wallet' : b.type === 'joint' && b.holderName ? `${b.bankName} · ${b.holderName}` : b.bankName}</span>
                </span>
                <span className="flex h-10 w-28 shrink-0 flex-col justify-center text-right">
                  <span className="block whitespace-nowrap text-sm font-semibold tabular-nums"><Money value={b.currentBalance} /></span>
                  <span className={`block whitespace-nowrap text-xs tabular-nums ${mabShortfall(b) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>{b.type === 'cash' ? 'Cash' : <>(<Money value={availableBalance(b)} />)</>}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {adding && <AccountForm onClose={() => setAdding(false)} onSave={async (rec) => { await save(db, 'bankAccounts', rec); await db.balanceHistory.add({ id: `bh_${Date.now()}`, accountId: rec.id, date: rec.lastUpdated, balance: rec.currentBalance, note: 'Opening balance' }); toast.success('Account added') }} />}
    </div>
  )
}

