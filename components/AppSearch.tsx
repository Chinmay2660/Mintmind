'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, CreditCard, Landmark, PieChart, Scale, Search, Shield, Target, Wallet, X } from 'lucide-react'
import {
  DASHBOARD_SEARCH_ALL,
  type SearchItem,
} from '@/lib/constants/dashboardNav'
import { useAppSearch } from '@/contexts/AppSearchContext'
import { useWealth } from '@/lib/wealth/WealthContext'
import { formatINR } from '@/lib/wealth/format'
import { matchesAll } from '@/lib/search'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function matchesQuery(item: SearchItem, query: string): boolean {
  return matchesAll(query, item.name, ...(item.keywords ?? []))
}

type Found = { key: string; name: string; sub?: string; path: string; icon: SearchItem['icon']; group: string }
const GROUP_LABEL: Record<string, string> = { pages: 'Pages', actions: 'Quick actions', transactions: 'Transactions', accounts: 'Accounts and cards', holdings: 'Investments, assets and loans', goals: 'Goals and cover' }
const GROUP_ORDER = ['pages', 'actions', 'transactions', 'accounts', 'holdings', 'goals']
// every word of the search has to appear somewhere in the record, in any order
const has = (q: string, ...parts: unknown[]) => matchesAll(q, ...parts)
const cap = <T,>(list: T[], n = 5) => list.slice(0, n)

export default function AppSearch() {
  const router = useRouter()
  const { isOpen, close } = useAppSearch()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data } = useWealth()

  const results = useMemo<Found[]>(() => {
    const pages: Found[] = DASHBOARD_SEARCH_ALL.filter((item) => matchesQuery(item, query)).map((i) => ({ key: `${i.group}-${i.path}`, name: i.name, path: i.path, icon: i.icon, group: i.group === 'actions' ? 'actions' : 'pages' }))
    const q = query.trim().toLowerCase()
    if (q.length < 2) return pages
    const tx: Found[] = [
      ...data.expenses.filter((e: any) => has(q, e.note, e.category, e.amount, e.date)).map((e: any) => ({ key: 'e' + e.id, name: e.note || e.category, sub: `${e.category} · ${e.date} · ${formatINR(e.amount)}`, path: '/dashboard/budget', icon: ArrowLeftRight, group: 'transactions' })),
      ...data.bankTxns.filter((t: any) => has(q, t.description, t.category, t.amount, t.date)).map((t: any) => ({ key: 't' + t.id, name: t.description || t.category || 'Transaction', sub: `${t.type} · ${t.date} · ${formatINR(t.amount)}`, path: '/dashboard/budget', icon: ArrowLeftRight, group: 'transactions' })),
    ]
    const accounts: Found[] = [
      ...data.bankAccounts.filter((a: any) => has(q, a.nickname, a.bankName, a.holderName)).map((a: any) => ({ key: 'a' + a.id, name: a.nickname || a.bankName, sub: `Account · ${formatINR(a.currentBalance)}`, path: `/dashboard/bank-accounts/${a.id}`, icon: Landmark, group: 'accounts' })),
      ...data.cards.filter((x: any) => has(q, x.bank, x.cardName)).map((x: any) => ({ key: 'c' + x.id, name: `${x.bank} ${x.cardName}`, sub: `Credit card · outstanding ${formatINR(x.outstanding)}`, path: '/dashboard/credit-cards', icon: CreditCard, group: 'accounts' })),
    ]
    const holdings: Found[] = [
      ...data.funds.filter((x: any) => has(q, x.name, x.fundHouse, x.category)).map((x: any) => ({ key: 'f' + x.id, name: x.name, sub: `Mutual fund · ${formatINR(x.currentValue)}`, path: `/dashboard/mutual-funds/${x.id}`, icon: PieChart, group: 'holdings' })),
      ...data.assets.filter((x: any) => has(q, x.name, x.category)).map((x: any) => ({ key: 's' + x.id, name: x.name, sub: `Asset · ${x.category}`, path: '/dashboard/net-worth/manage', icon: Wallet, group: 'holdings' })),
      ...data.liabilities.filter((x: any) => has(q, x.name, x.category)).map((x: any) => ({ key: 'l' + x.id, name: x.name, sub: `Loan · outstanding ${formatINR(Number(x.outstanding) || 0)}`, path: '/dashboard/net-worth/manage', icon: Scale, group: 'holdings' })),
    ]
    const more: Found[] = [
      ...data.goals.filter((x: any) => has(q, x.name)).map((x: any) => ({ key: 'g' + x.id, name: x.name, sub: 'Goal', path: '/dashboard/net-worth', icon: Target, group: 'goals' })),
      ...data.policies.filter((x: any) => has(q, x.name, x.insurer, x.type)).map((x: any) => ({ key: 'p' + x.id, name: x.name || x.insurer, sub: 'Insurance policy', path: '/dashboard/insurance', icon: Shield, group: 'goals' })),
    ]
    return [...pages, ...cap(tx), ...cap(accounts), ...cap(holdings), ...cap(more)]
  }, [query, data])

  const grouped = useMemo(() => GROUP_ORDER.map((key) => ({ key, items: results.filter((r) => r.group === key) })).filter((g) => g.items.length), [results])

  const flatResults = useMemo(
    () => grouped.flatMap((group) => group.items),
    [grouped]
  )

  const navigate = useCallback(
    (path: string) => {
      close()
      router.push(path)
    },
    [close, router]
  )

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
      return
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(flatResults.length, 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) =>
        prev === 0 ? Math.max(flatResults.length - 1, 0) : prev - 1
      )
      return
    }

    if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault()
      navigate(flatResults[activeIndex].path)
    }
  }

  let runningIndex = -1

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl [&>button]:hidden"
      >
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-3 dark:bg-muted/30">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search transactions, accounts, funds, goals, pages..."
              className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div ref={listRef} className="max-h-[min(60dvh,380px)] overflow-y-auto px-2 py-2">
          {flatResults.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.key} className="mb-1 last:mb-0">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABEL[group.key]}
                </p>
                <ul>
                  {group.items.map((item) => {
                    runningIndex += 1
                    const index = runningIndex
                    const Icon = item.icon
                    const isActive = index === activeIndex

                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          data-active={isActive}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-muted'
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(item.path)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1"><span className="block truncate">{item.name}</span>{item.sub && <span className="block truncate text-xs text-muted-foreground">{item.sub}</span>}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground sm:flex">
          <span>Navigate with ↑↓</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>{' '}
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
