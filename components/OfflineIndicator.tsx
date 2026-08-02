'use client'

import { CloudOff, CloudUpload, RefreshCw } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'
import { Button } from '@/components/ui/button'

export default function OfflineIndicator() {
  const { online, pendingCount, syncing, syncNow } = useOffline()

  if (online && pendingCount === 0) return null

  return (
    <div
      className={`sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2 text-sm safe-area-top ${
        online
          ? 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
          : 'bg-gray-800 text-gray-100'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {online ? <CloudUpload className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
        <span className="truncate">
          {!online
            ? pendingCount > 0
              ? `Offline — ${pendingCount} change${pendingCount === 1 ? '' : 's'} saved locally`
              : 'Offline — changes save locally and sync when you reconnect'
            : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`}
        </span>
      </div>
      {online && pendingCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={syncNow}
          disabled={syncing}
          className="h-8 shrink-0"
        >
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync now
        </Button>
      )}
    </div>
  )
}
