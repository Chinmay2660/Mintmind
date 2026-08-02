'use client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useState, useEffect } from 'react'
import { User, Mail, Save, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfilePicturePicker } from '@/components/ui/profile-picture-picker'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { motion } from 'framer-motion'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { clearOfflineData } from '@/lib/offline/db'
import { useOffline } from '@/contexts/OfflineContext'

const SettingsPage = () => {
  const { user, refetch, signOut } = useAuth()
  const router = useRouter()
  const { syncNow } = useOffline()
  const { confirmDelete, confirmDialogProps } = useDeleteConfirm()
  const [loading, setLoading] = useState(false)
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
        'This permanently deletes all your transactions, accounts, budgets, categories, investments, salary, and recurring expenses. This action cannot be undone.',
      confirmLabel: 'Reset All Data',
      onConfirm: async () => {
        await request.delete('/api/user/data')
        await clearOfflineData()
        await syncNow()
        toast.success('All data has been reset')
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
      <div className="p-4 md:p-8 flex items-center justify-center min-h-screen">
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
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences"
        showBack
        backHref="/dashboard"
      />

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="surface-card p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
            {formData.image ? (
              <img
                src={formData.image}
                alt={user.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {user.name || user.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                value={formData.email}
                disabled
                className="pl-10 h-12 surface-input"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed as it's linked to your Google account
            </p>
          </div>

          <ProfilePicturePicker
            value={formData.image}
            onChange={(image) => setFormData((prev) => ({ ...prev, image }))}
            name={user.name}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  firstName: user.firstName || user.name?.split(' ')[0] || '',
                  lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                  email: user.email || '',
                  image: user.image || '',
                })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="surface-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-sm font-mono text-foreground">{user.id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Account Type</span>
            <span className="text-sm text-foreground">Google Account</span>
          </div>
        </div>
      </motion.div>

      {/* Reset Data */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="surface-card p-6 border border-red-200 dark:border-red-900/50"
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">Reset Data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete all your financial data. Your account and profile will remain.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleResetData}
          className="w-full sm:w-auto text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Reset All Data
        </Button>
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="surface-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">Sign Out</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Sign out of your account on this device.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={signOut}
          className="w-full sm:w-auto text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}

export default SettingsPage

