'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/form-buttons'
import { useAuth } from '@/lib/hooks/useAuth'

const defaultFormData = () => ({
  type: 'FD',
  name: '',
  amount: 0,
  investedDate: new Date().toISOString().split('T')[0],
  maturityDate: '',
  maturityType: 'Ongoing',
  currentValue: '',
  interestRate: '',
  accountId: '',
  notes: '',
})

interface InvestmentFormProps {
  investmentId?: string
}

export function InvestmentForm({ investmentId }: InvestmentFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<{ _id: string; icon?: string; accountName: string }[]>([])
  const [loading, setLoading] = useState(!!investmentId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (!user) return
    request.get('/api/bank-accounts').then((res) => setAccounts(res.data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!investmentId || !user) return
    setLoading(true)
    request
      .get(`/api/investments/${investmentId}`)
      .then((res) => {
        const inv = res.data
        setFormData({
          type: inv.type,
          name: inv.name,
          amount: inv.amount,
          investedDate: format(new Date(inv.investedDate), 'yyyy-MM-dd'),
          maturityDate: inv.maturityDate ? format(new Date(inv.maturityDate), 'yyyy-MM-dd') : '',
          maturityType: inv.maturityType,
          currentValue: inv.currentValue || '',
          interestRate: inv.interestRate || '',
          accountId: inv.accountId?._id || '',
          notes: inv.notes || '',
        })
      })
      .catch(() => {
        toast.error('Failed to load investment')
        router.push('/dashboard/investments')
      })
      .finally(() => setLoading(false))
  }, [investmentId, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : null,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        accountId: formData.accountId || null,
      }
      if (investmentId) {
        await request.put(`/api/investments/${investmentId}`, payload)
        toast.success('Investment updated successfully')
      } else {
        await request.post('/api/investments', payload)
        toast.success('Investment added successfully')
      }
      router.push('/dashboard/investments')
    } catch {
      toast.error('Failed to save investment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="w-full animate-pulse h-64 rounded-xl bg-muted/40" />
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div>
        <label className="text-sm font-medium mb-1 block">Investment Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="FD">Fixed Deposit</option>
          <option value="Mutual Fund">Mutual Fund</option>
          <option value="Stock">Stock</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., HDFC FD, SBI Mutual Fund"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Amount Invested</label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          required
          step="0.01"
          min="0"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Invested Date</label>
        <Input
          type="date"
          value={formData.investedDate}
          onChange={(e) => setFormData({ ...formData, investedDate: e.target.value })}
          required
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Maturity Date (Optional)</label>
        <Input
          type="date"
          value={formData.maturityDate}
          onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Maturity Type</label>
        <select
          value={formData.maturityType}
          onChange={(e) => setFormData({ ...formData, maturityType: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Ongoing">Ongoing</option>
          <option value="Payout">Payout</option>
          <option value="Reinvestment">Reinvestment</option>
          <option value="Maturity">Maturity</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Current Value (Optional)</label>
        <Input
          type="number"
          value={formData.currentValue}
          onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
          step="0.01"
          placeholder="Current market value"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Interest Rate % (Optional)</label>
        <Input
          type="number"
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          step="0.01"
          placeholder="Annual interest rate"
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Source Account (Optional)</label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          className="w-full h-12 px-3 rounded-lg surface-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select account</option>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.icon} {acc.accountName}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field-full">
        <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
        <Input
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          className="h-12"
        />
      </div>
      <div className="form-field-full">
        <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[10rem] h-12">
          {investmentId ? 'Update Investment' : 'Add Investment'}
        </SubmitButton>
      </div>
    </form>
  )
}
