'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Keyboard, Landmark, LineChart, Plus, Scale, Target, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { QUICK_ADD_EVENT, SHOW_SHORTCUTS_EVENT } from '@/components/shell/Shortcuts'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { toISO } from '@/lib/wealth/calc'
import { TxnEntryDialog } from '@/components/wealth/budget/TxnEntryDialog'
import { AccountForm } from '@/components/wealth/AccountForm'

type Open = null | 'txn' | 'account'

/** The "+" menu in the top bar. Transactions and accounts open right here; the rest open the form on the page that owns it. */
export function QuickActions() {
  const router = useRouter()
  const { db } = useWealth()
  const [dlg, setDlg] = useState<Open>(null)

  const go = (path: string) => router.push(path)
  const items = [
    { key: 'txn', label: 'Add transaction', hint: 'A', icon: ArrowLeftRight, run: () => setDlg('txn') },
    { key: 'account', label: 'Add account', hint: 'C', icon: Landmark, run: () => setDlg('account') },
    { key: 'asset', label: 'Add asset', hint: 'N', icon: Wallet, run: () => go('/dashboard/net-worth/manage?add=asset') },
    { key: 'invest', label: 'Add investment', hint: 'I', icon: LineChart, run: () => go('/dashboard/mutual-funds?add=fund') },
    { key: 'liab', label: 'Add liability', hint: 'L', icon: Scale, run: () => go('/dashboard/net-worth/loans?add=liability') },
    { key: 'goal', label: 'Create financial goal', hint: 'O', icon: Target, run: () => go('/dashboard/net-worth?add=goal') },
  ]

  // the Shortcuts component sends these when A or C is pressed
  useEffect(() => {
    const on = (e: Event) => { const what = (e as CustomEvent<string>).detail; if (what === 'txn' || what === 'account') setDlg(what) }
    window.addEventListener(QUICK_ADD_EVENT, on)
    return () => window.removeEventListener(QUICK_ADD_EVENT, on)
  }, [])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" className="mr-1 hidden h-9 gap-1.5 md:inline-flex" aria-label="Quick actions"><Plus className="h-4 w-4" />Add</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Quick actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map(({ key, label, hint, icon: Icon, run }) => (
            <DropdownMenuItem key={key} onClick={run} className="cursor-pointer">
              <Icon className="mr-2 h-4 w-4" />
              <span className="flex-1">{label}</span>
              {hint && <kbd className="rounded border border-border px-1.5 text-[11px] text-muted-foreground">{hint}</kbd>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(SHOW_SHORTCUTS_EVENT))} className="cursor-pointer text-xs text-muted-foreground"><Keyboard className="mr-2 h-3.5 w-3.5" />All keyboard shortcuts<kbd className="ml-auto rounded border border-border px-1.5 text-[11px]">?</kbd></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dlg === 'txn' && <TxnEntryDialog initialType="expense" defaultMonth={toISO(new Date()).slice(0, 7)} onClose={() => setDlg(null)} />}
      {dlg === 'account' && (
        <AccountForm onClose={() => setDlg(null)} onSave={async (rec) => {
          await save(db, 'bankAccounts', rec)
          await db.balanceHistory.add({ id: `bh_${Date.now()}`, accountId: rec.id, date: rec.lastUpdated, balance: rec.currentBalance, note: 'Opening balance' })
          toast.success('Account added')
        }} />
      )}
    </>
  )
}
