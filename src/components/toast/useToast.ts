import { useContext } from 'react'

import { ToastContext } from './ToastContext'

export function useToast() {
  const contextValue = useContext(ToastContext)

  if (!contextValue) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return contextValue
}
