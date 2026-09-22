'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Shield, FileText, Lock, Landmark, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePrivacyAmount } from '@/lib/hooks/usePrivacyAmount'

interface ReleasedVault {
  releasedAt?: string
  netWorth?: {
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    totalBankBalance: number
    totalCash: number
    totalInvestmentValue: number
    totalCreditDue: number
    totalLoanOutstanding: number
  }
  accounts?: { accountName: string; balance: number; bankName?: string }[]
  cash?: { amount: number }
  investments?: { name: string; type: string; currentValue?: number; amount?: number }[]
  loans?: { name: string; lender?: string; outstanding: number; emi?: number }[]
  insurance?: { name: string; type: string; policyNumber?: string; coverageAmount?: number }[]
  passwords?: { service: string; username?: string; password: string; url?: string }[]
  documents?: { name: string; category: string; fileName?: string; notes?: string; storageKey?: string }[]
}

export default function LegacyAccessPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<ReleasedVault | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { fmt } = usePrivacyAmount()

  useEffect(() => {
    fetch(`/api/legacy/access?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Access denied')
        }
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="skeleton h-40 w-full max-w-2xl rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-semibold">Access unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Invalid link'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold">Released financial vault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Released {data.releasedAt ? new Date(data.releasedAt).toLocaleString() : 'recently'}
          </p>
        </div>

        {data.netWorth && (
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Net worth</h2>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{fmt(data.netWorth.netWorth)}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <p>Assets: {fmt(data.netWorth.totalAssets)}</p>
              <p>Liabilities: {fmt(data.netWorth.totalLiabilities)}</p>
              <p>Cash & bank: {fmt(data.netWorth.totalBankBalance + data.netWorth.totalCash)}</p>
              <p>Investments: {fmt(data.netWorth.totalInvestmentValue)}</p>
            </div>
          </Card>
        )}

        {data.accounts && data.accounts.length > 0 && (
          <Section title="Bank accounts" icon={Landmark}>
            {data.accounts.map((acc, i) => (
              <Row key={i} label={acc.accountName} value={fmt(acc.balance)} sub={acc.bankName} />
            ))}
            {data.cash?.amount ? <Row label="Cash" value={fmt(data.cash.amount)} /> : null}
          </Section>
        )}

        {data.investments && data.investments.length > 0 && (
          <Section title="Investments" icon={TrendingUp}>
            {data.investments.map((inv, i) => (
              <Row
                key={i}
                label={inv.name}
                value={fmt(inv.currentValue ?? inv.amount ?? 0)}
                sub={inv.type}
              />
            ))}
          </Section>
        )}

        {data.loans && data.loans.length > 0 && (
          <Section title="Loans" icon={Landmark}>
            {data.loans.map((loan, i) => (
              <Row key={i} label={loan.name} value={fmt(loan.outstanding)} sub={loan.lender} />
            ))}
          </Section>
        )}

        {data.insurance && data.insurance.length > 0 && (
          <Section title="Insurance" icon={Shield}>
            {data.insurance.map((item, i) => (
              <Row
                key={i}
                label={item.name}
                value={item.coverageAmount ? fmt(item.coverageAmount) : '—'}
                sub={[item.type, item.policyNumber].filter(Boolean).join(' · ')}
              />
            ))}
          </Section>
        )}

        {data.passwords && data.passwords.length > 0 && (
          <Section title="Passwords" icon={Lock}>
            {data.passwords.map((entry, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{entry.service}</p>
                  {entry.url && (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                      Open
                    </a>
                  )}
                </div>
                {entry.username && <p className="text-sm text-muted-foreground">{entry.username}</p>}
                <p className="mt-1 font-mono text-sm break-all">{entry.password}</p>
              </div>
            ))}
          </Section>
        )}

        {data.documents && data.documents.length > 0 && (
          <Section title="Documents" icon={FileText}>
            {data.documents.map((doc, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{doc.name}</p>
                  <Badge variant="outline">{doc.category}</Badge>
                </div>
                {doc.fileName && <p className="text-sm text-muted-foreground">{doc.fileName}</p>}
                {doc.storageKey && (
                  <a
                    href={`/api/legacy/access/file?token=${encodeURIComponent(token)}&key=${encodeURIComponent(doc.storageKey)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    View file
                  </a>
                )}
                {doc.notes && <p className="mt-1 text-xs text-muted-foreground">{doc.notes}</p>}
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        {sub && <p className="text-muted-foreground">{sub}</p>}
      </div>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}
