import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { usersApi } from '../api'
import { clearAuthTokens, getAccessToken } from '../lib/tokenStorage'
import type { UserProfile } from '../types/flowra'
import { getAuthFailureReasonMessage, subscribeAuthFailure } from './authEvents'
import { AuthContext, type AuthStatus, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [logoutReasonMessage, setLogoutReasonMessage] = useState<string | null>(null)

  const refreshAuth = useCallback(async (): Promise<void> => {
    const accessToken = getAccessToken()

    if (!accessToken) {
      setUser(null)
      setLogoutReasonMessage(null)
      setStatus('unauthenticated')
      return
    }

    setStatus('checking')

    try {
      const me = await usersApi.getMe()
      setUser(me)
      setLogoutReasonMessage(null)
      setStatus('authenticated')
    } catch {
      clearAuthTokens()
      setUser(null)
      setLogoutReasonMessage(getAuthFailureReasonMessage('UNAUTHORIZED'))
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshAuth()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [refreshAuth])

  useEffect(() => {
    const unsubscribe = subscribeAuthFailure((reason) => {
      clearAuthTokens()
      setUser(null)
      setLogoutReasonMessage(getAuthFailureReasonMessage(reason))
      setStatus('unauthenticated')
    })

    return unsubscribe
  }, [])

  const clearLogoutReasonMessage = useCallback(() => {
    setLogoutReasonMessage(null)
  }, [])

  const signOut = useCallback(() => {
    clearAuthTokens()
    setUser(null)
    setLogoutReasonMessage(null)
    setStatus('unauthenticated')
  }, [])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      logoutReasonMessage,
      refreshAuth,
      clearLogoutReasonMessage,
      signOut,
    }),
    [clearLogoutReasonMessage, logoutReasonMessage, refreshAuth, signOut, status, user],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
