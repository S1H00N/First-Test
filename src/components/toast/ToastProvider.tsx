import {
  type PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ToastContext, type ToastInput, type ToastTone } from './ToastContext'
import './toast.css'

interface ToastItem {
  id: number
  tone: ToastTone
  title?: string
  message: string
  dedupeKey: string
  priority: number
  createdAt: number
}

const DEFAULT_TOAST_DURATION_MS = 3600
const DEDUPE_WINDOW_MS = 1800
const MAX_TOAST_COUNT = 4

const tonePriority: Record<ToastTone, number> = {
  error: 3,
  success: 2,
  info: 1,
}

let toastSequence = 0

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timerMapRef = useRef<Map<number, number>>(new Map())
  const recentToastMapRef = useRef<Map<string, number>>(new Map())

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toastItem) => toastItem.id !== id),
    )

    const timerId = timerMapRef.current.get(id)

    if (timerId) {
      window.clearTimeout(timerId)
      timerMapRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (input: ToastInput): number => {
      const now = Date.now()
      const toastId = ++toastSequence
      const tone = input.tone ?? 'info'
      const priority = input.priority ?? tonePriority[tone]
      const dedupeKey =
        input.dedupeKey ?? `${tone}:${input.title ?? ''}:${input.message}`

      Array.from(recentToastMapRef.current.entries()).forEach(([key, timestamp]) => {
        if (now - timestamp > DEDUPE_WINDOW_MS) {
          recentToastMapRef.current.delete(key)
        }
      })

      const lastShownAt = recentToastMapRef.current.get(dedupeKey)

      if (typeof lastShownAt === 'number' && now - lastShownAt < DEDUPE_WINDOW_MS) {
        return -1
      }

      recentToastMapRef.current.set(dedupeKey, now)

      const nextItem: ToastItem = {
        id: toastId,
        tone,
        title: input.title,
        message: input.message,
        dedupeKey,
        priority,
        createdAt: now,
      }

      setToasts((currentToasts) => {
        const merged = [...currentToasts, nextItem]

        if (merged.length <= MAX_TOAST_COUNT) {
          return merged
        }

        let removeIndex = 0

        for (let index = 1; index < merged.length; index += 1) {
          const target = merged[index]
          const candidate = merged[removeIndex]

          if (target.priority < candidate.priority) {
            removeIndex = index
            continue
          }

          if (
            target.priority === candidate.priority &&
            target.createdAt < candidate.createdAt
          ) {
            removeIndex = index
          }
        }

        const removedToast = merged[removeIndex]
        const filtered = merged.filter((_, index) => index !== removeIndex)

        const removedTimerId = timerMapRef.current.get(removedToast.id)

        if (removedTimerId) {
          window.clearTimeout(removedTimerId)
          timerMapRef.current.delete(removedToast.id)
        }

        return filtered
      })

      const durationMs = input.durationMs ?? DEFAULT_TOAST_DURATION_MS
      const timerId = window.setTimeout(() => {
        dismissToast(toastId)
      }, durationMs)

      timerMapRef.current.set(toastId, timerId)

      return toastId
    },
    [dismissToast],
  )

  const contextValue = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className={`toast-item toast-${toastItem.tone}`}>
            <div>
              {toastItem.title ? <p className="toast-title">{toastItem.title}</p> : null}
              <p className="toast-message">{toastItem.message}</p>
            </div>
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => dismissToast(toastItem.id)}
              aria-label="토스트 닫기"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
