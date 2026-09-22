'use client'

import { useEffect, useState } from 'react'
import { Copy, ShieldAlert, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/form-buttons'
import { FormField, FormGrid, FormSection } from '@/components/ui/form-layout'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'

const ACCESS_SCOPES = [
  { key: 'netWorth', label: 'Net worth summary' },
  { key: 'accounts', label: 'Bank accounts' },
  { key: 'investments', label: 'Investments' },
  { key: 'loans', label: 'Loans' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'passwords', label: 'Passwords' },
  { key: 'documents', label: 'Documents' },
] as const

type AccessScopeKey = (typeof ACCESS_SCOPES)[number]['key']

interface NomineeData {
  name: string
  email: string
  phone: string
  relationship: string
  notes: string
}

interface LegacyPlanData {
  enabled: boolean
  releaseMode: 'inactivity' | 'manual'
  inactivityDays: number
  released: boolean
  releasedAt?: string
  accessScopes: Record<AccessScopeKey, boolean>
  releaseLog?: { action: string; at: string; note?: string }[]
}

export default function NomineePage() {
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [accessUrl, setAccessUrl] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [nominee, setNominee] = useState<NomineeData>({
    name: '',
    email: '',
    phone: '',
    relationship: 'spouse',
    notes: '',
  })
  const [plan, setPlan] = useState<LegacyPlanData>({
    enabled: false,
    releaseMode: 'inactivity',
    inactivityDays: 90,
    released: false,
    accessScopes: {
      netWorth: true,
      accounts: true,
      investments: true,
      loans: true,
      insurance: true,
      passwords: true,
      documents: true,
    },
  })

  useEffect(() => {
    Promise.all([request.get('/api/nominee'), request.get('/api/legacy')])
      .then(([nomineeRes, legacyRes]) => {
        if (nomineeRes.data) setNominee({ ...nominee, ...nomineeRes.data })
        if (legacyRes.data) setPlan({ ...plan, ...legacyRes.data })
      })
      .catch(() => toast.error('Failed to load nominee settings'))
      .finally(() => setLoading(false))
  }, [])

  const saveNominee = async () => {
    setSaving(true)
    try {
      const res = await request.put('/api/nominee', nominee)
      setNominee(res.data)
      toast.success('Nominee saved')
    } catch {
      toast.error('Failed to save nominee')
    } finally {
      setSaving(false)
    }
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      const res = await request.put('/api/legacy', plan)
      setPlan(res.data)
      toast.success('Legacy settings saved')
    } catch {
      toast.error('Failed to save legacy settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRelease = () => {
    confirmDelete({
      title: 'Release vault to nominee?',
      description:
        'This will generate an access link for your nominee with the selected data. Share it only with someone you trust.',
      confirmLabel: 'Release vault',
      onConfirm: async () => {
        setReleasing(true)
        try {
          const res = await request.post('/api/legacy/release')
          setAccessUrl(res.data.accessUrl)
          setEmailSent(Boolean(res.data.emailSent))
          setPlan((prev) => ({ ...prev, released: true, releasedAt: res.data.releasedAt }))
          toast.success(
            res.data.emailSent
              ? 'Vault released — email sent to your nominee'
              : 'Vault released — share the access link with your nominee'
          )
        } catch {
          toast.error('Failed to release vault. Enable legacy access first.')
        } finally {
          setReleasing(false)
        }
      },
    })
  }

  const handleRevoke = () => {
    confirmDelete({
      title: 'Revoke nominee access?',
      description: 'The current access link will stop working immediately.',
      confirmLabel: 'Revoke access',
      onConfirm: async () => {
        try {
          const res = await request.post('/api/legacy/revoke')
          setPlan(res.data)
          setAccessUrl('')
          toast.success('Access revoked')
        } catch {
          toast.error('Failed to revoke access')
        }
      },
    })
  }

  const copyAccessUrl = async () => {
    if (!accessUrl) return
    await navigator.clipboard.writeText(accessUrl)
    toast.success('Access link copied')
  }

  const toggleScope = (key: AccessScopeKey) => {
    setPlan((prev) => ({
      ...prev,
      accessScopes: { ...prev.accessScopes, [key]: !prev.accessScopes[key] },
    }))
  }

  if (loading) {
    return <div className="skeleton h-64 rounded-xl" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nominee & Legacy Access"
        subtitle="Choose who receives your financial vault if you cannot access it"
      />

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Nominee details</h2>
            <p className="text-sm text-muted-foreground">Person who should receive access</p>
          </div>
        </div>
        <FormSection>
          <FormGrid>
            <FormField label="Full name" required>
              <Input
                value={nominee.name}
                onChange={(e) => setNominee({ ...nominee, name: e.target.value })}
                placeholder="Nominee name"
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={nominee.email}
                onChange={(e) => setNominee({ ...nominee, email: e.target.value })}
                placeholder="nominee@email.com"
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={nominee.phone}
                onChange={(e) => setNominee({ ...nominee, phone: e.target.value })}
                placeholder="+91 ..."
              />
            </FormField>
            <FormField label="Relationship">
              <select
                value={nominee.relationship}
                onChange={(e) => setNominee({ ...nominee, relationship: e.target.value })}
                className="form-select"
              >
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </FormGrid>
          <FormField label="Notes" span="full">
            <Input
              value={nominee.notes}
              onChange={(e) => setNominee({ ...nominee, notes: e.target.value })}
              placeholder="Instructions for your nominee"
            />
          </FormField>
        </FormSection>
        <SubmitButton type="button" onClick={saveNominee} isLoading={saving} className="mt-4">
          Save nominee
        </SubmitButton>
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold">Legacy release</h2>
              <p className="text-sm text-muted-foreground">Control when your nominee can access the vault</p>
            </div>
          </div>
          {plan.released ? <Badge variant="warning">Released</Badge> : plan.enabled ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Disabled</Badge>}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={plan.enabled}
              onChange={(e) => setPlan({ ...plan, enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Enable legacy access for my nominee
          </label>

          <FormGrid>
            <FormField label="Release mode">
              <select
                value={plan.releaseMode}
                onChange={(e) =>
                  setPlan({ ...plan, releaseMode: e.target.value as LegacyPlanData['releaseMode'] })
                }
                className="form-select"
              >
                <option value="inactivity">After inactivity (auto)</option>
                <option value="manual">Manual release only</option>
              </select>
            </FormField>
            {plan.releaseMode === 'inactivity' && (
              <FormField label="Inactivity period (days)">
                <Input
                  type="number"
                  min={30}
                  max={365}
                  value={plan.inactivityDays}
                  onChange={(e) => setPlan({ ...plan, inactivityDays: Number(e.target.value) })}
                />
              </FormField>
            )}
          </FormGrid>

          <div>
            <p className="mb-2 text-sm font-medium">What to share</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCESS_SCOPES.map((scope) => (
                <label key={scope.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.accessScopes?.[scope.key] ?? true}
                    onChange={() => toggleScope(scope.key)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </div>

          <SubmitButton type="button" onClick={savePlan} isLoading={saving}>
            Save legacy settings
          </SubmitButton>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Release controls</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan.releaseMode === 'inactivity'
            ? `Vault auto-releases after ${plan.inactivityDays} days without login.`
            : 'Release manually when you want your nominee to receive access.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleRelease} disabled={!plan.enabled || releasing}>
            {plan.released ? 'Generate new release' : 'Release vault now'}
          </Button>
          {plan.released && (
            <Button variant="outline" onClick={handleRevoke}>
              Revoke access
            </Button>
          )}
        </div>
        {accessUrl && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Nominee access link</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate text-xs">{accessUrl}</code>
              <Button size="sm" variant="outline" onClick={copyAccessUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {emailSent
                ? `Email sent to ${nominee.email}.`
                : `Email not sent — share the link with ${nominee.email || 'your nominee'} manually.`}
            </p>
          </div>
        )}
      </Card>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}
