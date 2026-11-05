'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Landmark, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { availableBalance, mabShortfall, toISO } from '@/lib/wealth/calc'
import { formatDate } from '@/lib/wealth/format'
import { Money } from '@/components/wealth/Money'
import { Button } from '@/components/ui/button'
import { Empty, LoadingBlock, PageHeader, Stat } from '@/components/wealth/kit'
import { AccountForm } from '@/components/wealth/AccountForm'

export default function BankAccountsPage() {
  const { ready, data, db } = useWealth()
  const [adding, setAdding] = useState(false)
  if (!ready) return <LoadingBlock className="h-64" />
  const total = data.bankAccounts.reduce((s, b) => s + b.currentBalance, 0)

  return (
    <div className="space-y-5">
      <PageHeader description="Bank accounts and cash in hand. Every expense, income, transfer, card payment, SIP and premium updates these balances." actions={<Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" />Add account</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Total balance" value={<Money value={total} />} />
        <Stat label="Accounts" value={data.bankAccounts.length} />
      </div>
      {data.bankAccounts.length === 0 ? (
        <Empty title="No bank accounts yet" description="Add your savings accounts to track balances and history." action={<Button onClick={() => setAdding(true)}>Add account</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.bankAccounts.map((b) => (
            <Link key={b.id} href={`/dashboard/bank-accounts/${b.id}`} className="surface-card block p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Landmark className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="truncate font-medium">{b.nickname || b.bankName}</p><p className="truncate text-xs text-muted-foreground">{b.type === 'cash' ? 'Cash in hand' : `${b.bankName} · ${b.holderName}`}</p></div>
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

