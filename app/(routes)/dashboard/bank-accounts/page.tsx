'use client'

import { TabBar } from '@/components/ui/tab-bar'
import { DebitCardsTab } from '@/components/wealth/DebitCards'
import { BackBar } from '@/components/shell/BackBar'
import { usePrivacyMode } from '@/contexts/PrivacyContext'
import Link from 'next/link'
import { useState } from 'react'
import { useAddParam } from '@/lib/hooks/useAddParam'
import { ChevronRight, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { availableBalance, mabShortfall, toISO } from '@/lib/wealth/calc'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Empty, LoadingBlock, PageHeader, Stat } from '@/components/wealth/kit'
import { AccountForm, ACCOUNT_TYPES } from '@/components/wealth/AccountForm'

export default function BankAccountsPage() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  const { ready, data, db } = useWealth()
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState('all') // All, then each kind of account you have, then Debit cards
  useAddParam((what) => { if (what === 'account') setAdding(true) })
  if (!ready) return <LoadingBlock className="h-64" />
  const total = data.bankAccounts.reduce((s, b) => s + b.currentBalance, 0)
  const kinds = ACCOUNT_TYPES.filter((t) => data.bankAccounts.some((b: any) => b.type === t.value))
  const active = tab === 'debit' || kinds.some((k) => k.value === tab) ? tab : 'all'
  const shown = active === 'all' ? data.bankAccounts : data.bankAccounts.filter((b: any) => b.type === active)

  return (
    <div className="space-y-5">
      <BackBar phoneOnly />
      <PageHeader primaryAction={tab === 'debit' ? undefined : { label: 'Add account', onClick: () => setAdding(true) }} />
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 border-b border-border pb-5 lg:grid-cols-3">
        <Stat label="Total balance" value={<Money value={total} />} />
        <Stat label="Accounts" value={data.bankAccounts.length} />
      </section>
      <TabBar label="Kinds of account" value={active} onChange={setTab} tabs={[{ key: 'all', label: 'All', badge: data.bankAccounts.length }, ...kinds.map((k) => ({ key: k.value, label: k.label, badge: data.bankAccounts.filter((b: any) => b.type === k.value).length })), { key: 'debit', label: 'Debit cards', badge: data.debitCards.length }]} />
      {active === 'debit' ? <DebitCardsTab /> : data.bankAccounts.length === 0 ? (
        <Empty title="No bank accounts yet" description="Add your savings accounts to track balances and history." action={<Button onClick={() => setAdding(true)}>Add account</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((b) => (
            <Link key={b.id} href={`/dashboard/bank-accounts/${b.id}`} aria-label={`${b.nickname || b.bankName}, open details`} className="surface-card block p-4 outline-none transition-all hover:border-primary/40 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight/30 text-[hsl(85_60%_26%)] dark:bg-highlight/20 dark:text-highlight"><Landmark className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{b.nickname || b.bankName}</p><p className="truncate text-xs text-muted-foreground">{b.type === 'cash' ? 'Wallet' : b.type === 'joint' && b.holderName ? `${b.bankName} · ${b.holderName}` : b.bankName}</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-semibold"><Money value={b.currentBalance} /></p>
              <p className="mt-1 text-xs text-muted-foreground">{b.type === 'cash' ? '' : <>Available <Money value={availableBalance(b)} />{mabShortfall(b) > 0 && <span className="text-warning"> (below MAB)</span>} · </>}updated {formatDate(b.lastUpdated)}</p>
            </Link>
          ))}
        </div>
      )}
      {adding && <AccountForm onClose={() => setAdding(false)} onSave={async (rec) => { await save(db, 'bankAccounts', rec); await db.balanceHistory.add({ id: `bh_${Date.now()}`, accountId: rec.id, date: rec.lastUpdated, balance: rec.currentBalance, note: 'Opening balance' }); toast.success('Account added') }} />}
    </div>
  )
}

