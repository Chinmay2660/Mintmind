'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { LogOut, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function UserProfile() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  if (loading || !user) {
    return (
      <div className="flex items-center gap-2 p-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="hidden lg:block text-sm font-medium text-muted-foreground">
          {loading ? 'Loading...' : 'Guest'}
        </span>
      </div>
    )
  }

  const displayName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
  const fullName = user.name || user.email?.split('@')[0] || 'User'

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="rounded-full border-2 border-primary/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <span className="hidden lg:block text-sm font-medium text-foreground">
              {displayName}
            </span>
          </motion.button>
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
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={signOut}
            className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
