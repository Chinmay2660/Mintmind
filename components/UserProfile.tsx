'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { LogOut, User, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

export default function UserProfile({
  compact = false,
  showName = false,
  tooltip = false,
}: {
  compact?: boolean
  showName?: boolean
  tooltip?: boolean
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  if (loading || !user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <span
          className={cn(
            'text-sm font-medium text-muted-foreground',
            showName ? 'block' : compact ? 'hidden' : 'hidden lg:block'
          )}
        >
          {loading ? 'Loading...' : 'Guest'}
        </span>
      </div>
    )
  }

  const displayName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
  const fullName = user.name || user.email?.split('@')[0] || 'User'

  const profileTrigger = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Tooltip content={fullName} side="right" disabled={!tooltip}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-white/40 dark:hover:bg-white/5',
              tooltip && 'justify-center'
            )}
          >
          {user.image ? (
            user.image.startsWith('data:') ? (
              <img
                src={user.image}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border-2 border-primary/20 object-cover"
              />
            ) : (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="rounded-full border-2 border-primary/20"
              />
            )
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
          )}
          <span
            className={cn(
              'text-sm font-medium text-foreground',
              showName ? 'block' : compact ? 'hidden' : 'hidden lg:block'
            )}
          >
            {displayName}
          </span>
          </motion.button>
        </Tooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/settings')}
          className="cursor-pointer focus:bg-white/40 dark:focus:bg-white/5"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex items-center gap-2">
      {profileTrigger}
    </div>
  )
}
