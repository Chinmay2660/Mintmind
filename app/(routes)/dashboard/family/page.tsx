'use client'

import React, { useEffect, useState } from 'react'
import {
  Users, UserPlus, Copy, Clock, Crown, User, Settings, Trash2, LogOut,
  ArrowRightLeft, Target, IndianRupee, ReceiptText, TrendingUp, Wallet,
} from 'lucide-react'
import request from '@/lib/api/request'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormSheet } from '@/components/ui/form-sheet'
import { motion } from 'framer-motion'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { useDeleteConfirm } from '@/lib/hooks/useDeleteConfirm'
import { FamilyGoalsSection } from './_components/FamilyGoalsSection'
import { FamilyBudgetsSection } from './_components/FamilyBudgetsSection'
import { FamilyExpensesSection } from './_components/FamilyExpensesSection'
import type {
  Family,
  FamilyBudget,
  FamilyExpense,
  FamilyGoal,
  FamilySettings,
  FamilyStats,
} from '@/types/family'
import { getActiveMembers, getMemberCount, isFamilyHead, normalizeId } from '@/lib/utils/family'

const defaultSettings: FamilySettings = {
  shareInvestments: true,
  shareExpenses: true,
  shareBudgets: true,
  shareSalary: true,
}

const FamilyPage = () => {
  const { user } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [stats, setStats] = useState<FamilyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairCodeLoading, setPairCodeLoading] = useState(false)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [familyName, setFamilyName] = useState('')
  const [familySettings, setFamilySettings] = useState<FamilySettings>(defaultSettings)
  const [selectedNewHead, setSelectedNewHead] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [goals, setGoals] = useState<FamilyGoal[]>([])
  const [budgets, setBudgets] = useState<FamilyBudget[]>([])
  const [expenses, setExpenses] = useState<FamilyExpense[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [budgetsLoading, setBudgetsLoading] = useState(false)
  const [expensesLoading, setExpensesLoading] = useState(false)
  const { confirmDelete, confirmDialogProps: transferConfirmProps } = useDeleteConfirm()

  useEffect(() => {
    fetchFamily()
    fetchStats()
  }, [])

  useEffect(() => {
    if (!family) return
    if (activeTab === 'goals') fetchGoals()
    else if (activeTab === 'budgets') {
      fetchBudgets()
      fetchExpenses()
    } else if (activeTab === 'expenses') fetchExpenses()
  }, [family, activeTab])

  useEffect(() => {
    if (pairCode && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && pairCode) {
      setPairCode(null)
    }
  }, [countdown, pairCode])

  const fetchFamily = async () => {
    try {
      const response = await request.get('/api/family')
      const fetched = response.data.family as Family | null
      setFamily(fetched)
      if (fetched) {
        setFamilyName(fetched.name)
        setFamilySettings(fetched.settings ?? defaultSettings)
      }
    } catch {
      setFamily(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await request.get('/api/family/stats')
      setStats(response.data as FamilyStats)
    } catch {
      // not in a family
    }
  }

  const generatePairCode = async () => {
    if (!user?.email) {
      toast.error('User email not found')
      return
    }
    setPairCodeLoading(true)
    try {
      const response = await request.post('/api/family/pair-code/generate', {})
      setPairCode(response.data.code)
      setCountdown(60)
      setIsGenerateDialogOpen(false)
      toast.success('Invite code generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate invite code')
    } finally {
      setPairCodeLoading(false)
    }
  }

  const verifyPairCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode || joinCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    try {
      const response = await request.post('/api/family/pair-code/verify', { code: joinCode })
      toast.success(response.data.message || 'Welcome to the family circle!')
      setIsJoinDialogOpen(false)
      setJoinCode('')
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join family circle')
    }
  }

  const createFamily = async () => {
    if (!familyName.trim()) {
      toast.error('Please enter a circle name')
      return
    }
    try {
      await request.post('/api/family', { name: familyName.trim() })
      toast.success('Family circle created!')
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create family circle')
    }
  }

  const leaveFamily = async () => {
    try {
      const response = await request.post('/api/family/members/leave')
      toast.success(response.data.message || 'Left family circle')
      setIsLeaveConfirmOpen(false)
      setFamily(null)
      setStats(null)
      setGoals([])
      setBudgets([])
      setExpenses([])
      await fetchFamily()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave family circle')
      await fetchFamily()
    }
  }

  const handleRemoveMemberClick = (memberId: string) => {
    setMemberToRemove(memberId)
    setIsRemoveConfirmOpen(true)
  }

  const removeMember = async () => {
    if (!memberToRemove) return
    try {
      await request.delete(`/api/family/members/${memberToRemove}`)
      toast.success('Member removed')
      setIsRemoveConfirmOpen(false)
      setMemberToRemove(null)
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const updateFamilySettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      await request.put('/api/family', { name: familyName, settings: familySettings })
      toast.success('Circle settings updated')
      setIsSettingsDialogOpen(false)
      fetchFamily()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings')
    }
  }

  const transferHeadship = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNewHead) {
      toast.error('Please select a member to transfer headship to')
      return
    }
    confirmDelete({
      title: 'Transfer Headship',
      description: 'Are you sure? You will become a regular member of the circle.',
      confirmLabel: 'Transfer',
      onConfirm: async () => {
        await request.post('/api/family/transfer-headship', { newHeadId: selectedNewHead })
        toast.success('Headship transferred')
        setIsTransferDialogOpen(false)
        setSelectedNewHead('')
        fetchFamily()
        fetchStats()
      },
    })
  }

  const copyPairCode = () => {
    if (!pairCode) return
    navigator.clipboard.writeText(pairCode)
    toast.success('Invite code copied')
  }

  const fetchGoals = async () => {
    setGoalsLoading(true)
    try {
      const response = await request.get('/api/family/goals')
      setGoals(response.data as FamilyGoal[])
    } catch {
      toast.error('Failed to load goals')
    } finally {
      setGoalsLoading(false)
    }
  }

  const fetchBudgets = async () => {
    setBudgetsLoading(true)
    try {
      const response = await request.get('/api/family/budgets')
      setBudgets(response.data as FamilyBudget[])
    } catch {
      toast.error('Failed to load budgets')
    } finally {
      setBudgetsLoading(false)
    }
  }

  const fetchExpenses = async () => {
    setExpensesLoading(true)
    try {
      const response = await request.get('/api/family/expenses')
      setExpenses(response.data as FamilyExpense[])
    } catch {
      toast.error('Failed to load expenses')
    } finally {
      setExpensesLoading(false)
    }
  }

  const head = isFamilyHead(family, user?.id)

  if (loading) return <PageSkeleton />

  if (!family) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6 overflow-x-hidden">
        <PageHeader
          title="Family Circle"
          subtitle="Create or join a circle to share finances with loved ones"
          showBack
        />
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Create a Circle</h3>
                <p className="text-sm text-muted-foreground">Start a new family circle</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Circle name (e.g. The Bhoirs)"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
              <Button onClick={createFamily} className="w-full">Create Circle</Button>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserPlus className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Join a Circle</h3>
                <p className="text-sm text-muted-foreground">Enter an invite code from a member</p>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
              Join with Invite Code
            </Button>
            <FormSheet open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen} title="Join Family Circle">
              <form onSubmit={verifyPairCode} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Invite Code</label>
                  <Input
                    placeholder="Enter 6-digit code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Codes expire in 60 seconds</p>
                </div>
                <FormButtonGroup
                  submitLabel="Join Circle"
                  onCancel={() => { setIsJoinDialogOpen(false); setJoinCode('') }}
                />
              </form>
            </FormSheet>
          </Card>
        </div>
      </div>
    )
  }

  const memberCount = getMemberCount(family)
  const activeMembers = getActiveMembers(family)

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6 overflow-x-hidden">
      <PageHeader
        title={family.name}
        subtitle={`${memberCount} member${memberCount !== 1 ? 's' : ''} in your circle`}
        showBack
      >
        {head && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 sm:w-auto sm:px-3"
              onClick={() => setIsSettingsDialogOpen(true)}
              aria-label="Circle settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Settings</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 sm:w-auto sm:px-3"
              onClick={() => setIsTransferDialogOpen(true)}
              aria-label="Transfer headship"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Transfer Headship</span>
            </Button>
          </>
        )}
      </PageHeader>

      <FormSheet open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} title="Circle Settings">
        <form onSubmit={updateFamilySettings} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Circle Name</label>
            <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Data Sharing</p>
            {([
              { key: 'shareExpenses', label: 'Share expenses' },
              { key: 'shareBudgets', label: 'Share budgets' },
              { key: 'shareInvestments', label: 'Share investments' },
              { key: 'shareSalary', label: 'Share salary info' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <input
                  type="checkbox"
                  checked={familySettings[key]}
                  onChange={(e) => setFamilySettings({ ...familySettings, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </label>
            ))}
          </div>
          <FormButtonGroup
            submitLabel="Save Settings"
            onCancel={() => {
              setIsSettingsDialogOpen(false)
              setFamilyName(family.name)
              setFamilySettings(family.settings ?? defaultSettings)
            }}
          />
        </form>
      </FormSheet>

      <FormSheet open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} title="Transfer Headship">
        <form onSubmit={transferHeadship} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Select New Head</label>
            <select
              value={selectedNewHead}
              onChange={(e) => setSelectedNewHead(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select a member</option>
              {activeMembers
                .filter((m) => normalizeId(m.user) !== user?.id)
                .map((member) => (
                  <option key={normalizeId(member.user)} value={normalizeId(member.user)}>
                    {member.user.name || member.user.email}
                  </option>
                ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              You will become a regular member after transferring
            </p>
          </div>
          <FormButtonGroup
            submitLabel="Transfer Headship"
            onCancel={() => { setIsTransferDialogOpen(false); setSelectedNewHead('') }}
          />
        </form>
      </FormSheet>

      <TabButtonGroup
        value={activeTab}
        onValueChange={setActiveTab}
        options={[
          { value: 'overview', label: 'Overview', icon: Users },
          { value: 'goals', label: 'Goals', icon: Target },
          { value: 'budgets', label: 'Budgets', icon: IndianRupee },
          { value: 'expenses', label: 'Expenses', icon: ReceiptText },
        ]}
      />

      {activeTab === 'overview' && (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Balance"
                value={stats.totalBalance}
                icon={Wallet}
                gradient="from-blue-500 to-blue-600"
                bgColor="bg-blue-50 dark:bg-blue-950/20"
                iconColor="text-blue-600 dark:text-blue-400"
                formatValue={formatCurrency}
              />
              <StatCard
                title="Investments"
                value={stats.totalInvestments}
                icon={TrendingUp}
                gradient="from-green-500 to-green-600"
                bgColor="bg-green-50 dark:bg-green-950/20"
                iconColor="text-green-600 dark:text-green-400"
                formatValue={formatCurrency}
              />
              <StatCard
                title="Monthly Income"
                value={stats.totalIncome}
                icon={ArrowRightLeft}
                gradient="from-primary to-primary/80"
                bgColor="bg-primary/10"
                iconColor="text-primary"
                formatValue={formatCurrency}
              />
              <StatCard
                title="Monthly Expenses"
                value={stats.totalExpenses}
                icon={ReceiptText}
                gradient="from-red-500 to-red-600"
                bgColor="bg-red-50 dark:bg-red-950/20"
                iconColor="text-red-600 dark:text-red-400"
                formatValue={formatCurrency}
              />
            </div>
          )}

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-1">Invite to Circle</h3>
              <p className="text-sm text-muted-foreground">
                Generate a one-time code to invite someone to your family circle
              </p>
            </div>
            {pairCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                  <div className="text-3xl font-bold tracking-wider text-primary font-mono">{pairCode}</div>
                  <Button onClick={copyPairCode} size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-2" />Copy
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expires in {countdown} seconds</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with the person you want to invite. They enter it on the Join screen.
                </p>
              </div>
            ) : (
              <>
                <Button className="w-full md:w-auto" onClick={() => setIsGenerateDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />Generate Invite Code
                </Button>
                <FormSheet open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen} title="Generate Invite Code">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      A 6-digit code will be generated that expires in 60 seconds. Share it with the person you want to invite.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={generatePairCode} className="flex-1" disabled={pairCodeLoading}>
                        {pairCodeLoading ? 'Generating...' : 'Generate Code'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)} disabled={pairCodeLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </FormSheet>
              </>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Circle Members</h3>
            <div className="space-y-3">
              {activeMembers.map((member) => {
                const memberUserId = normalizeId(member.user)
                const headId = normalizeId(family.familyHead)
                const isHeadMember = member.role === 'head' || headId === memberUserId
                const isCurrentUser = user?.id === memberUserId

                return (
                  <motion.div
                    key={memberUserId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 surface-inner rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={member.user.name ?? ''}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {member.user.name || member.user.email}
                          </span>
                          {isHeadMember && (
                            <Crown className="w-4 h-4 text-yellow-500 shrink-0" aria-label="Circle Head" />
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground shrink-0">(You)</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isHeadMember && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          Head
                        </span>
                      )}
                      {head && !isHeadMember && !isCurrentUser && memberUserId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMemberClick(memberUserId)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />Remove
                        </Button>
                      )}
                      {!isHeadMember && isCurrentUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsLeaveConfirmOpen(true)}
                          className="text-orange-600 hover:text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                        >
                          <LogOut className="w-4 h-4 mr-2" />Leave
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          <ConfirmDialog
            open={isLeaveConfirmOpen}
            onOpenChange={setIsLeaveConfirmOpen}
            title="Leave Family Circle"
            description="You will lose access to all circle data. You'll need a new invite to rejoin."
            confirmLabel="Leave Circle"
            onConfirm={leaveFamily}
            variant="destructive"
          />
          <ConfirmDialog
            open={isRemoveConfirmOpen}
            onOpenChange={(open) => { setIsRemoveConfirmOpen(open); if (!open) setMemberToRemove(null) }}
            title="Remove Member"
            description="They will lose access to all circle data and need a new invite to rejoin."
            confirmLabel="Remove Member"
            onConfirm={removeMember}
            variant="destructive"
          />
        </>
      )}

      {activeTab === 'goals' && family && (
        <FamilyGoalsSection
          goals={goals}
          loading={goalsLoading}
          onRefresh={fetchGoals}
          isFamilyHead={head}
          family={family}
          currentUserId={user?.id}
        />
      )}
      {activeTab === 'budgets' && (
        <FamilyBudgetsSection
          budgets={budgets}
          expenses={expenses}
          loading={budgetsLoading}
          onRefresh={fetchBudgets}
          isFamilyHead={head}
        />
      )}
      {activeTab === 'expenses' && family && (
        <FamilyExpensesSection
          expenses={expenses}
          loading={expensesLoading}
          onRefresh={fetchExpenses}
          family={family}
          user={user}
        />
      )}

      <ConfirmDialog {...transferConfirmProps} />
    </div>
  )
}

export default FamilyPage
