import { useContext } from 'react'

import { AuthContext } from './AuthContext'

export function useAuth() {
  const contextValue = useContext(AuthContext)

  if (!contextValue) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return contextValue
}
