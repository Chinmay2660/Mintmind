'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWealth } from '@/lib/wealth/WealthContext'
import { getSyncStatus, subscribeSync, syncNow } from '@/lib/wealth/sync'
import { agoLabel } from '@/lib/market/freshness'

/** Says where the data is: on this device, and whether it has reached the server. Sample data never syncs. */
export function SyncStatus() {
  const { db, isDemo } = useWealth()
  const [s, setS] = useState<{ pending: number; error: string | null; lastSyncedAt: number | null }>({ pending: 0, error: null, lastSyncedAt: null })
  const [busy, setBusy] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!db || isDemo) return
    setS(getSyncStatus(db))
    const off = subscribeSync(db, setS)
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => { off(); clearInterval(t) }
  }, [db, isDemo])

  if (isDemo) return <p className="text-sm text-muted-foreground">Sample data stays in this browser and is never sent to a server. Clearing site data removes it.</p>

  const last = s.lastSyncedAt ? agoLabel(new Date(s.lastSyncedAt).toISOString()) : ''
  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-start gap-2">
        {s.error ? <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden /> : <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        <span>
          {s.error
            ? 'Saved on this device. Not synced yet, we will keep trying.'
            : s.pending > 0
              ? `Saved on this device. ${s.pending} ${s.pending === 1 ? 'change' : 'changes'} waiting to sync.`
              : last ? `Saved on this device and synced ${last}.` : 'Saved on this device. Waiting for the first sync.'}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">Signed in, your records are also stored on our server so your other devices stay in step. If you clear this browser, signing in again brings them back. Vault items are encrypted on your device first.</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await syncNow(db) } finally { setBusy(false) } }}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Sync now
      </Button>
    </div>
  )
}
