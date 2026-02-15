'use client'
import React, { useEffect, useState } from 'react'
import { Users, UserPlus, Copy, Check, Clock, Crown, User, Settings, Trash2, LogOut, ArrowRightLeft, Target, DollarSign, ReceiptText } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StatCard } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { FormButtonGroup } from '@/components/ui/form-buttons'
import { TabButtonGroup } from '@/components/ui/tab-button'
import { EmptyState } from '@/components/ui/empty-state'
import { EditButton, DeleteButton } from '@/components/ui/icon-button'
import { AddButton } from '@/components/ui/AddButton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const FamilyPage = () => {
  const { user } = useAuth()
  const [family, setFamily] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pairCode, setPairCode] = useState(null)
  const [pairCodeLoading, setPairCodeLoading] = useState(false)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [familyName, setFamilyName] = useState('')
  const [selectedNewHead, setSelectedNewHead] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'goals', 'budgets', 'expenses'
  const [goals, setGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [budgetsLoading, setBudgetsLoading] = useState(false)
  const [expensesLoading, setExpensesLoading] = useState(false)

  useEffect(() => {
    fetchFamily()
    fetchStats()
  }, [])

  useEffect(() => {
    if (family) {
      if (activeTab === 'goals') {
        fetchGoals()
      } else if (activeTab === 'budgets') {
        fetchBudgets()
      } else if (activeTab === 'expenses') {
        fetchExpenses()
      }
    }
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
      const response = await axios.get('/api/family')
      setFamily(response.data.family)
      if (response.data.family) {
        setFamilyName(response.data.family.name)
      }
    } catch (error) {
      // Not part of a family - this is okay
      setFamily(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/family/stats')
      setStats(response.data)
    } catch (error) {
      // Not part of a family or error - ignore
    }
  }

  const generatePairCode = async (e) => {
    if (e) e.preventDefault()
    
    if (!user?.email) {
      toast.error('User email not found')
      return
    }

    setPairCodeLoading(true)
    try {
      const response = await axios.post('/api/family/pair-code/generate', { email: user.email })
      setPairCode(response.data.code)
      setGeneratedEmail(user.email)
      setCountdown(60)
      setIsGenerateDialogOpen(false)
      toast.success('Pair code generated successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate pair code')
    } finally {
      setPairCodeLoading(false)
    }
  }

  const verifyPairCode = async (e) => {
    if (e) e.preventDefault()
    
    if (!joinCode || joinCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      const response = await axios.post('/api/family/pair-code/verify', { code: joinCode })
      toast.success(response.data.message || 'Successfully joined family')
      setIsJoinDialogOpen(false)
      setJoinCode('')
      fetchFamily()
      fetchStats()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to join family'
      toast.error(errorMessage)
      console.error('Join family error:', error)
    }
  }

  const createFamily = async () => {
    if (!familyName.trim()) {
      toast.error('Please enter a family name')
      return
    }

    try {
      await axios.post('/api/family', { name: familyName.trim() })
      toast.success('Family created successfully')
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create family')
    }
  }


  const leaveFamily = async () => {
    try {
      const response = await axios.post('/api/family/members/leave')
      toast.success(response.data.message || 'Left family successfully')
      setIsLeaveConfirmOpen(false)
      // Clear all family-related state
      setFamily(null)
      setStats(null)
      setGoals([])
      setBudgets([])
      setExpenses([])
      // Force refresh to ensure clean state
      await fetchFamily()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to leave family')
      // Even on error, try to refresh to get current state
      await fetchFamily()
    }
  }

  const handleRemoveMemberClick = (memberId) => {
    setMemberToRemove(memberId)
    setIsRemoveConfirmOpen(true)
  }

  const removeMember = async () => {
    if (!memberToRemove) return

    try {
      // Handle both object ID and string ID
      const id = typeof memberToRemove === 'object' ? (memberToRemove._id || memberToRemove) : memberToRemove
      const finalId = id?.toString() || id
      await axios.delete(`/api/family/members/${finalId}`)
      toast.success('Member removed successfully')
      setIsRemoveConfirmOpen(false)
      setMemberToRemove(null)
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove member')
    }
  }

  const updateFamilySettings = async (e) => {
    if (e) e.preventDefault()
    
    try {
      await axios.put('/api/family', { name: familyName })
      toast.success('Family settings updated')
      setIsSettingsDialogOpen(false)
      fetchFamily()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update settings')
    }
  }

  const transferHeadship = async (e) => {
    if (e) e.preventDefault()
    
    if (!selectedNewHead) {
      toast.error('Please select a member to transfer headship to')
      return
    }

    if (!confirm('Are you sure you want to transfer headship? You will become a regular member.')) {
      return
    }

    try {
      await axios.post('/api/family/transfer-headship', { newHeadId: selectedNewHead })
      toast.success('Headship transferred successfully')
      setIsTransferDialogOpen(false)
      setSelectedNewHead('')
      fetchFamily()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to transfer headship')
    }
  }

  const copyPairCode = () => {
    navigator.clipboard.writeText(pairCode)
    toast.success('Pair code copied to clipboard')
  }

  const fetchGoals = async () => {
    setGoalsLoading(true)
    try {
      const response = await axios.get('/api/family/goals')
      setGoals(response.data)
    } catch (error) {
      toast.error('Failed to load goals')
    } finally {
      setGoalsLoading(false)
    }
  }

  const fetchBudgets = async () => {
    setBudgetsLoading(true)
    try {
      const response = await axios.get('/api/family/budgets')
      setBudgets(response.data)
    } catch (error) {
      toast.error('Failed to load budgets')
    } finally {
      setBudgetsLoading(false)
    }
  }

  const fetchExpenses = async () => {
    setExpensesLoading(true)
    try {
      const response = await axios.get('/api/family/expenses')
      setExpenses(response.data)
    } catch (error) {
      toast.error('Failed to load expenses')
    } finally {
      setExpensesLoading(false)
    }
  }

  // Check if current user is family head - handle both populated and non-populated cases
  // Note: Session API returns 'id' not '_id'
  const isFamilyHead = family && user && (() => {
    try {
      const headId = family.familyHead?._id || family.familyHead
      // Session API returns 'id', but we also check '_id' for compatibility
      const userId = user.id || user._id
      if (!headId || !userId) return false
      // Convert both to strings for comparison
      const headIdStr = headId.toString()
      const userIdStr = userId.toString()
      return headIdStr === userIdStr
    } catch (e) {
      return false
    }
  })()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
        <PageHeader
          title="Family Management"
          subtitle="Connect with your family members to share financial data"
        />

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Create Family</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Start a new family group</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Family name"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
              <Button onClick={createFamily} className="w-full">
                Create Family
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserPlus className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Join Family</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Join an existing family</p>
              </div>
            </div>
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  Join with Pair Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Family</DialogTitle>
                </DialogHeader>
                <form onSubmit={verifyPairCode} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pair Code</label>
                    <Input
                      placeholder="Enter 6-digit code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Code expires in 60 seconds</p>
                  </div>
                  <FormButtonGroup
                    submitLabel="Join Family"
                    onCancel={() => {
                      setIsJoinDialogOpen(false)
                      setJoinCode('')
                    }}
                  />
                </form>
              </DialogContent>
            </Dialog>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <PageHeader
        title={family.name}
        subtitle={`${family.members.filter(m => m.status === 'active').length} family member${family.members.filter(m => m.status === 'active').length !== 1 ? 's' : ''}`}
      >
        {isFamilyHead && (
          <>
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Family Settings</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); updateFamilySettings(); }} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Family Name</label>
                    <Input
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                    />
                  </div>
                  <FormButtonGroup
                    submitLabel="Update Settings"
                    onCancel={() => {
                      setIsSettingsDialogOpen(false)
                      setFamilyName(family.name)
                    }}
                  />
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer Headship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Family Headship</DialogTitle>
              </DialogHeader>
              <form onSubmit={transferHeadship} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Select New Head</label>
                  <select
                    value={selectedNewHead}
                    onChange={(e) => setSelectedNewHead(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select a member</option>
                    {family.members
                      .filter(m => m.status === 'active' && m.user._id !== user?._id)
                      .map((member) => (
                        <option key={member.user._id} value={member.user._id}>
                          {member.user.name || member.user.email}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You will become a regular member after transferring headship
                  </p>
                </div>
                <FormButtonGroup
                  submitLabel="Transfer Headship"
                  onCancel={() => {
                    setIsTransferDialogOpen(false)
                    setSelectedNewHead('')
                  }}
                />
              </form>
            </DialogContent>
          </Dialog>
        </>
        )}
      </PageHeader>

      {/* Tabs */}
      <TabButtonGroup
        value={activeTab}
        onValueChange={setActiveTab}
        options={[
          { value: 'overview', label: 'Overview', icon: Users },
          { value: 'goals', label: 'Goals', icon: Target },
          { value: 'budgets', label: 'Budgets', icon: DollarSign },
          { value: 'expenses', label: 'Expenses', icon: ReceiptText },
        ]}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Family Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Balance"
                value={formatCurrency(stats.totalBalance)}
                icon={Users}
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                bgColor="bg-blue-400"
                iconColor="text-blue-600"
              />
              <StatCard
                title="Total Investments"
                value={formatCurrency(stats.totalInvestments)}
                icon={Users}
                gradient="bg-gradient-to-br from-green-500 to-green-600"
                bgColor="bg-green-400"
                iconColor="text-green-600"
              />
              <StatCard
                title="Monthly Income"
                value={formatCurrency(stats.totalIncome)}
                icon={Users}
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                bgColor="bg-purple-400"
                iconColor="text-purple-600"
              />
              <StatCard
                title="Monthly Expenses"
                value={formatCurrency(stats.totalExpenses)}
                icon={Users}
                gradient="bg-gradient-to-br from-red-500 to-red-600"
                bgColor="bg-red-400"
                iconColor="text-red-600"
              />
            </div>
          )}

      {/* Pair Code Generation */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Invite Family Member</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate a pair code to invite someone to join your family
            </p>
          </div>
        </div>

        {pairCode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <div className="text-3xl font-bold tracking-wider text-primary">{pairCode}</div>
              <Button onClick={copyPairCode} size="sm" variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Expires in {countdown} seconds</span>
            </div>
            <p className="text-sm text-gray-500">
              Share this code with the person you want to invite. They need to enter this code along with your email ({generatedEmail}) to join.
            </p>
          </div>
        ) : (
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <UserPlus className="w-4 h-4 mr-2" />
                Generate Pair Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Pair Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A 6-digit code will be generated that expires in 60 seconds. Share this code along with your email ({user?.email}) with the person you want to invite.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={generatePairCode} 
                    className="flex-1"
                    disabled={pairCodeLoading}
                  >
                    {pairCodeLoading ? 'Generating...' : 'Generate Code'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsGenerateDialogOpen(false)}
                    disabled={pairCodeLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Card>

      {/* Family Members */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Family Members</h3>
        <div className="space-y-3">
          {family.members
            .filter(m => m.status === 'active')
            .map((member) => {
              // Check if this member is the head
              const headId = family.familyHead?._id || family.familyHead
              const memberUserId = member.user?._id || member.user
              let isHead = false
              try {
                if (member.role === 'head') {
                  isHead = true
                } else if (headId && memberUserId) {
                  isHead = headId.toString() === memberUserId.toString()
                }
              } catch (e) {
                isHead = false
              }
              
              // Check if this member is the current user
              const userId = user?._id || user?.id || (typeof user === 'string' ? user : null)
              let isCurrentUser = false
              try {
                if (userId && memberUserId) {
                  isCurrentUser = userId.toString() === memberUserId.toString()
                }
              } catch (e) {
                isCurrentUser = false
              }

              return (
                <motion.div
                  key={member.user._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.user.name || member.user.email}</span>
                        {isHead && (
                          <Crown className="w-4 h-4 text-yellow-500" title="Family Head" />
                        )}
                        {isCurrentUser && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHead && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                        Head
                      </span>
                    )}
                    {/* Show Remove button for family head when viewing other members (not themselves) */}
                    {isFamilyHead && !isHead && !isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const memberId = member.user?._id || member.user
                          handleRemoveMemberClick(memberId)
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 dark:border-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Member
                      </Button>
                    )}
                    {/* Show Leave button for non-head members viewing themselves */}
                    {!isHead && isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLeaveConfirmOpen(true)}
                        className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 border-orange-300 dark:border-orange-700"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Family
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
        </div>
      </Card>

      {/* Leave Family Confirmation Modal */}
      <ConfirmDialog
        open={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        title="Leave Family"
        description="Are you sure you want to leave this family? You will lose access to all family data and will need to be invited again to rejoin."
        confirmLabel="Leave Family"
        cancelLabel="Cancel"
        onConfirm={leaveFamily}
        variant="destructive"
      />

      {/* Remove Member Confirmation Modal */}
      <ConfirmDialog
        open={isRemoveConfirmOpen}
        onOpenChange={(open) => {
          setIsRemoveConfirmOpen(open)
          if (!open) {
            setMemberToRemove(null)
          }
        }}
        title="Remove Member"
        description="Are you sure you want to remove this member from the family? They will lose access to all family data and will need to be invited again to rejoin."
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        onConfirm={removeMember}
        variant="destructive"
      />
        </>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <FamilyGoalsSection
          goals={goals}
          loading={goalsLoading}
          onRefresh={fetchGoals}
          isFamilyHead={isFamilyHead}
        />
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <FamilyBudgetsSection
          budgets={budgets}
          loading={budgetsLoading}
          onRefresh={fetchBudgets}
          isFamilyHead={isFamilyHead}
        />
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <FamilyExpensesSection
          expenses={expenses}
          loading={expensesLoading}
          onRefresh={fetchExpenses}
          family={family}
          user={user}
        />
      )}
    </div>
  )
}

// Goals Section Component
function FamilyGoalsSection({ goals, loading, onRefresh, isFamilyHead }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    category: 'savings',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingGoal) {
        await axios.put(`/api/family/goals/${editingGoal._id}`, formData)
        toast.success('Goal updated successfully')
      } else {
        await axios.post('/api/family/goals', formData)
        toast.success('Goal created successfully')
      }
      setIsDialogOpen(false)
      setEditingGoal(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save goal')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    try {
      await axios.delete(`/api/family/goals/${id}`)
      toast.success('Goal deleted successfully')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete goal')
    }
  }

  const handleEdit = (goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
      category: goal.category,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: '',
      category: 'savings',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Goals</h2>
          <p className="text-sm text-gray-500">Set and track family financial goals</p>
        </div>
        {isFamilyHead && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AddButton onClick={resetForm}>Add Goal</AddButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create Family Goal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Amount</label>
                  <Input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Current Amount</label>
                  <Input
                    type="number"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Date</label>
                  <Input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="savings">Savings</option>
                    <option value="investment">Investment</option>
                    <option value="expense">Expense</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <FormButtonGroup
                  submitLabel={editingGoal ? 'Update Goal' : 'Create Goal'}
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setEditingGoal(null)
                    resetForm()
                  }}
                />
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Goals Yet"
          description="Create your first family goal to start tracking"
          actionLabel={isFamilyHead ? "Add Goal" : null}
          onAction={isFamilyHead ? () => setIsDialogOpen(true) : null}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            return (
              <Card key={goal._id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      {goal.targetDate && (
                        <p className="text-xs text-gray-500">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {isFamilyHead && (
                    <div className="flex gap-1 ml-4">
                      <EditButton onClick={() => handleEdit(goal)} />
                      <DeleteButton onClick={() => handleDelete(goal._id)} />
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Budgets Section Component
function FamilyBudgetsSection({ budgets, loading, onRefresh, isFamilyHead }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [formData, setFormData] = useState({
    categoryName: '',
    amount: 0,
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Calculate end date based on period
      const start = new Date(formData.startDate)
      let endDate = new Date(start)
      if (formData.period === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else if (formData.period === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3)
      } else if (formData.period === 'half-yearly') {
        endDate.setMonth(endDate.getMonth() + 6)
      } else if (formData.period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      const payload = {
        ...formData,
        endDate: endDate.toISOString().split('T')[0],
      }

      if (editingBudget) {
        await axios.put(`/api/family/budgets/${editingBudget._id}`, payload)
        toast.success('Budget updated successfully')
      } else {
        await axios.post('/api/family/budgets', payload)
        toast.success('Budget created successfully')
      }
      setIsDialogOpen(false)
      setEditingBudget(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save budget')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return
    try {
      await axios.delete(`/api/family/budgets/${id}`)
      toast.success('Budget deleted successfully')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete budget')
    }
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      categoryName: budget.categoryName,
      amount: budget.amount,
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
      endDate: new Date(budget.endDate).toISOString().split('T')[0],
      description: budget.description || '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      categoryName: '',
      amount: 0,
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      description: '',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Budgets</h2>
          <p className="text-sm text-gray-500">Manage family spending limits</p>
        </div>
        {isFamilyHead && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AddButton onClick={resetForm}>Add Budget</AddButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create Family Budget'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Category Name</label>
                  <Input
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount</label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Period</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <FormButtonGroup
                  submitLabel={editingBudget ? 'Update Budget' : 'Create Budget'}
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setEditingBudget(null)
                    resetForm()
                  }}
                />
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No Budgets Yet"
          description="Create your first family budget to manage spending"
          actionLabel={isFamilyHead ? "Add Budget" : null}
          onAction={isFamilyHead ? () => setIsDialogOpen(true) : null}
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <Card key={budget._id} hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{budget.categoryName}</h3>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-primary">{formatCurrency(budget.amount)}</p>
                    <p className="text-sm text-gray-500 capitalize">{budget.period}</p>
                    {budget.description && (
                      <p className="text-sm text-gray-500">{budget.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isFamilyHead && (
                  <div className="flex gap-1 ml-4">
                    <EditButton onClick={() => handleEdit(budget)} />
                    <DeleteButton onClick={() => handleDelete(budget._id)} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Expenses Section Component
function FamilyExpensesSection({ expenses, loading, onRefresh, family, user }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    paidBy: user?._id || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await axios.put(`/api/family/expenses/${editingExpense._id}`, formData)
        toast.success('Expense updated successfully')
      } else {
        await axios.post('/api/family/expenses', formData)
        toast.success('Expense added successfully')
      }
      setIsDialogOpen(false)
      setEditingExpense(null)
      resetForm()
      onRefresh()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save expense')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      await axios.delete(`/api/family/expenses/${id}`)
      toast.success('Expense deleted successfully')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete expense')
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      paidBy: expense.paidBy._id || expense.paidBy,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      paidBy: user?._id || '',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Check if current user is family head - handle both populated and non-populated cases
  const isFamilyHead = family && user && (() => {
    const headId = family.familyHead?._id || family.familyHead
    const userId = user._id
    if (!headId || !userId) return false
    return headId.toString() === userId.toString()
  })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Family Expenses</h2>
          <p className="text-sm text-gray-500">Track shared family expenses</p>
        </div>
        {isFamilyHead && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AddButton onClick={resetForm}>Add Expense</AddButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Family Expense'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount</label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Paid By</label>
                  <select
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {family.members
                      .filter(m => m.status === 'active')
                      .map((member) => (
                        <option key={member.user._id} value={member.user._id}>
                          {member.user.name || member.user.email}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <FormButtonGroup
                  submitLabel={editingExpense ? 'Update Expense' : 'Add Expense'}
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setEditingExpense(null)
                    resetForm()
                  }}
                />
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No Expenses Yet"
          description="Add your first family expense to start tracking"
          actionLabel={isFamilyHead ? "Add Expense" : null}
          onAction={isFamilyHead ? () => setIsDialogOpen(true) : null}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense._id} hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{expense.title}</h3>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(expense.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{expense.category}</p>
                    {expense.description && (
                      <p className="text-sm text-gray-500">{expense.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Paid by: {expense.paidBy?.name || expense.paidBy?.email || 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDate(expense.date)}</span>
                    </div>
                  </div>
                </div>
                {(isFamilyHead || expense.createdBy?._id === user?._id) && (
                  <div className="flex gap-1 ml-4">
                    <EditButton onClick={() => handleEdit(expense)} />
                    <DeleteButton onClick={() => handleDelete(expense._id)} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default FamilyPage

