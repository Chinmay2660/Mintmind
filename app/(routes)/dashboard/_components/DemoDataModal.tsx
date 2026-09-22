'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database,
  ReceiptText,
  TrendingUp,
  Target,
  Users,
  Bell,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import request from '@/lib/api/request'
import { maybeSeedDemoData } from '@/lib/offline/seedDemoData'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DEMO_MODE =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DISMISS_KEY = 'mintmind:demo-modal-dismissed'

const DEMO_FEATURES = [
  { icon: ReceiptText, label: 'Transactions, budgets & categories' },
  { icon: TrendingUp, label: 'Investments, SIPs & mutual funds' },
  { icon: Target, label: 'Goals, loans & credit cards' },
  { icon: Shield, label: 'Insurance, documents & passwords' },
  { icon: Bell, label: 'Subscriptions, reminders & rules' },
  { icon: Users, label: 'Family circle with shared data' },
]

interface DemoDataModalContextValue {
  openDemoModal: (opts?: { force?: boolean }) => void
}

const DemoDataModalContext = createContext<DemoDataModalContextValue | null>(null)

export function useDemoDataModal() {
  const ctx = useContext(DemoDataModalContext)
  if (!ctx) {
    return { openDemoModal: () => {} }
  }
  return ctx
}

interface DemoDataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  force?: boolean
  onSuccess?: () => void
}

function DemoDataModal({ open, onOpenChange, force = false, onSuccess }: DemoDataModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const url = force ? '/api/seed?force=true' : '/api/seed'
      const res = await request.post(url)
      if (res.data?.skipped) {
        toast.info('Demo data already loaded or seeding is disabled')
        onOpenChange(false)
        return
      }
      await maybeSeedDemoData(user.id, { force: force || Boolean(res.data?.seeded) }).catch(() => {})
      toast.success('Demo data loaded')
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch {
      const offline = await maybeSeedDemoData(user.id, { force }).catch(() => false)
      if (offline) {
        toast.success('Demo data loaded offline')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Failed to load demo data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (!force) {
      localStorage.setItem(DISMISS_KEY, '1')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Database className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {force ? 'Replace with demo data?' : 'Load demo data?'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {force
              ? 'This replaces your personal financial data with fresh sample data for testing.'
              : 'Populate your dashboard with sample data to explore every tab in MintMind.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-4">
          {DEMO_FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              {label}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleSkip}
            disabled={loading}
          >
            {force ? 'Cancel' : 'Skip for now'}
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleLoad}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Demo Data'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DemoDataModalProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [force, setForce] = useState(false)
  const [checked, setChecked] = useState(false)

  const openDemoModal = useCallback((opts?: { force?: boolean }) => {
    setForce(opts?.force ?? false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!DEMO_MODE || authLoading || !user?.id || checked) return

    let cancelled = false
    request
      .get('/api/seed')
      .then((res) => {
        if (cancelled) return
        const empty = res.data?.empty
        const dismissed = localStorage.getItem(DISMISS_KEY)
        if (empty && !dismissed) {
          setForce(false)
          setOpen(true)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading, checked])

  if (!DEMO_MODE) {
    return <>{children}</>
  }

  return (
    <DemoDataModalContext.Provider value={{ openDemoModal }}>
      {children}
      <DemoDataModal open={open} onOpenChange={setOpen} force={force} />
    </DemoDataModalContext.Provider>
  )
}
