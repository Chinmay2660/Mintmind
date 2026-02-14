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

  // Always render something - show placeholder while loading or if no user
  if (loading || !user) {
    return (
      <div className="flex items-center gap-2 p-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <span className="hidden lg:block text-sm font-medium text-gray-400 dark:text-gray-500">
          {loading ? 'Loading...' : 'Guest'}
        </span>
      </div>
    )
  }

  // Use name field directly - it's the most reliable
  const displayName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
  const fullName = user.name || user.email?.split('@')[0] || 'User'

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
            <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">
              {displayName}
            </span>
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="cursor-pointer focus:bg-gray-50 dark:focus:bg-gray-800"
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
      
      {/* Standalone Logout Button (visible on mobile) */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={signOut}
        className="md:hidden p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors"
        aria-label="Sign Out"
      >
        <LogOut className="w-5 h-5" />
      </motion.button>
    </div>
  )
}

