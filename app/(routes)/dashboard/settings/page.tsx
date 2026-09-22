'use client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useState, useEffect } from 'react'
import { User, Mail, Save, LogOut, Trash2, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfilePicturePicker } from '@/components/ui/profile-picture-picker'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { useDemoDataModal } from '../_components/DemoDataModal'
import { cn } from '@/lib/utils'

function SettingsGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40',
        className
      )}
    >
      {children}
    </div>
  )
}

function SettingsRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm text-foreground',
          mono && 'max-w-[55%] truncate font-mono text-xs'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SettingsActionRow({
  title,
  description,
  action,
  destructive,
}: {
  title: string
  description: string
  action: React.ReactNode
  destructive?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            destructive ? 'text-destructive' : 'text-foreground'
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

const SettingsPage = () => {
  const { user, refetch, signOut } = useAuth()
  const router = useRouter()
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const { openDemoModal } = useDemoDataModal()
  const [loading, setLoading] = useState(false)
  const isDemoMode =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    image: '',
  })

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ')
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        image: user.image || '',
      })
    }
  }, [user])

  const handleResetData = () => {
    confirmDelete({
      title: 'Reset All Data',
      description:
        'This permanently deletes your personal transactions, accounts, budgets, categories, investments, salary, and recurring expenses. Family shared data stays intact. This action cannot be undone.',
      confirmLabel: 'Reset All Data',
      onConfirm: async () => {
        await request.delete('/api/user/data')
        toast.success('Your personal data has been reset')
        router.push('/dashboard')
      },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      await request.put('/api/user/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        image: formData.image,
      })
      toast.success('Profile updated successfully')
      await refetch()
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to access settings</p>
          <Link href="/auth/signin">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences"
      />

      <div className="mx-auto max-w-2xl space-y-8">
        <section>
          <h2 className="mm-section-title mb-3 px-0.5">Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SettingsGroup>
              <div className="space-y-4 px-4 py-4 md:px-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        placeholder="First Name"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="Last Name"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={formData.email}
                      disabled
                      className="pl-9 surface-input"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Linked to your Google account and cannot be changed here
                  </p>
                </div>

                <ProfilePicturePicker
                  value={formData.image}
                  onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
                  name={user.name}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end md:px-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      firstName: user.firstName || user.name?.split(' ')[0] || '',
                      lastName:
                        user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                      email: user.email || '',
                      image: user.image || '',
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm">
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </SettingsGroup>
          </form>
        </section>

        <section>
          <h2 className="mm-section-title mb-3 px-0.5">Account</h2>
          <SettingsGroup>
            <SettingsRow label="User ID" value={user.id} mono />
            <SettingsRow label="Account Type" value="Google Account" />
          </SettingsGroup>
        </section>

        {isDemoMode && (
          <section>
            <h2 className="mm-section-title mb-3 px-0.5">Developer</h2>
            <SettingsGroup>
              <SettingsActionRow
                title="Demo Data"
                description="Load sample data across transactions, investments, goals, loans, and more."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDemoModal({ force: true })}
                  >
                    <Database className="mr-1.5 h-3.5 w-3.5" />
                    Load
                  </Button>
                }
              />
            </SettingsGroup>
          </section>
        )}

        <section>
          <h2 className="mm-section-title mb-3 px-0.5">Data &amp; session</h2>
          <SettingsGroup className="border-destructive/20">
            <SettingsActionRow
              destructive
              title="Reset all data"
              description="Permanently delete personal financial data. Family shared data is not affected."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetData}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
              }
            />
            <SettingsActionRow
              title="Sign out"
              description="Sign out of your account on this device."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Sign Out
                </Button>
              }
            />
          </SettingsGroup>
        </section>
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default SettingsPage
