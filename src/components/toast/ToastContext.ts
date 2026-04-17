import { createContext } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastInput {
  tone?: ToastTone
  title?: string
  message: string
  durationMs?: number
  dedupeKey?: string
  priority?: number
}

export interface ToastContextValue {
  showToast: (input: ToastInput) => number
  dismissToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
