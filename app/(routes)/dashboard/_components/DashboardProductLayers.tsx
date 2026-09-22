'use client'

import Link from 'next/link'
import { Landmark, Lock, ReceiptText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { withFromHome } from '@/lib/utils/navigation'
import type { DashboardStats } from '@/types/dashboard'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'

interface DashboardProductLayersProps {
  stats: DashboardStats
  loading: boolean
}

export function DashboardProductLayers({ stats, loading }: DashboardProductLayersProps) {
  const { fmt } = usePrivacyAmount()

  const layers = [
    {
      title: 'Net worth',
      description: 'Accounts, investments, loans, and insurance in one picture',
      icon: Landmark,
      href: withFromHome('/dashboard/accounts'),
      stat: loading ? '—' : fmt(stats.netWorth ?? 0),
      statLabel: 'Total net worth',
    },
    {
      title: 'Expense management',
      description: 'Track spending, set budgets, and watch recurring bills',
      icon: ReceiptText,
      href: withFromHome('/dashboard/transactions'),
      stat: loading ? '—' : fmt(stats.monthlyExpenses ?? 0),
      statLabel: 'Spent this month',
    },
    {
      title: 'Secure vault',
      description: 'Passwords, documents, and nominee handoff when it matters',
      icon: Lock,
      href: withFromHome('/dashboard/vault'),
      stat: loading ? '—' : `${(stats.passwordCount ?? 0) + (stats.documentCount ?? 0)}`,
      statLabel: 'Vault items',
    },
  ]

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold">Everything else, when you need it</h2>
        <p className="text-sm text-muted-foreground">
          Net worth and expenses come first. Vault and legacy access stay one tap away.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {layers.map((layer) => {
          const Icon = layer.icon
          return (
            <Link key={layer.title} href={layer.href}>
              <Card hover className="h-full p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{layer.statLabel}</p>
                    <p className="font-semibold">{layer.stat}</p>
                  </div>
                </div>
                <h3 className="mt-4 font-semibold">{layer.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{layer.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
