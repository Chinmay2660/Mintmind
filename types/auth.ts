import type { ReactNode } from 'react'
import type { User } from './user'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

export interface AuthProviderProps {
  children: ReactNode
}
