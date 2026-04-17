import { createContext } from 'react'

import type { UserProfile } from '../types/flowra'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: UserProfile | null
  isAuthenticated: boolean
  logoutReasonMessage: string | null
  refreshAuth: () => Promise<void>
  clearLogoutReasonMessage: () => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
