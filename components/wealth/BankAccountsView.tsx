'use client'

import { OverviewCard } from '@/components/wealth/HoldingUI'
import { TabBar } from '@/components/ui/tab-bar'
import { DebitCardsTab } from '@/components/wealth/DebitCards'
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
import { AccountForm } from '@/components/wealth/AccountForm'

/** Bank and cash accounts as tabs. */
export function BankAccountsView() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data, db } = useWealth()
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState('all') // All, then each kind of account you have, then Debit cards
  const [addDebit, setAddDebit] = useState(false) // opened from the Overview's Add: the Debit cards tab, with its form open
  useAddParam((what) => { if (what === 'account') setAdding(true); if (what === 'debit') { setTab('debit'); setAddDebit(true) } if (what === 'debits') setTab('debit') })
  if (!ready) return <LoadingBlock className="h-64" />
  const total = data.bankAccounts.reduce((s, b) => s + b.currentBalance, 0)
  const active = tab === 'debit' ? tab : 'all'
  const shown = data.bankAccounts

  return (
    <div className="space-y-5">
      <PageHeader primaryAction={active === 'debit' ? undefined : { label: 'Add account', onClick: () => setAdding(true) }} />
      <OverviewCard label="Total balance" value={<Money value={total} />} rows={[{ label: 'Available balance', value: <Money value={data.bankAccounts.reduce((n: number, b: any) => n + (b.type === 'cash' ? b.currentBalance : availableBalance(b)), 0)} /> }]} />
      <TabBar label="Accounts sections" value={active} onChange={setTab} tabs={[{ key: 'all', label: 'Accounts' }, { key: 'debit', label: 'Debit cards' }]} />
      {active === 'debit' ? <DebitCardsTab startAdd={addDebit} /> : data.bankAccounts.length === 0 ? (
        <Empty title="No bank accounts yet" description="Add your savings accounts to track balances and history." action={<Button onClick={() => setAdding(true)}>Add account</Button>} />
      ) : (
        <ul className="divide-y divide-border border-b border-border">
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

