export type AuthFailureReason =
  | 'UNAUTHORIZED'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REFRESH_FAILED'
  | 'UNKNOWN'

const SESSION_EXPIRED_MESSAGE =
  '보안을 위해 로그아웃 되었습니다. 다시 로그인해 주세요.'
const INVALID_AUTH_MESSAGE = '유효하지 않은 인증 정보입니다. 다시 로그인해 주세요.'

const authFailureReasonMessageMap: Record<AuthFailureReason, string> = {
  TOKEN_EXPIRED: SESSION_EXPIRED_MESSAGE,
  TOKEN_REFRESH_FAILED: SESSION_EXPIRED_MESSAGE,
  TOKEN_INVALID: INVALID_AUTH_MESSAGE,
  UNAUTHORIZED: INVALID_AUTH_MESSAGE,
  UNKNOWN: INVALID_AUTH_MESSAGE,
}

export const getAuthFailureReasonMessage = (
  reason: AuthFailureReason,
): string => authFailureReasonMessageMap[reason]

type AuthFailureListener = (reason: AuthFailureReason) => void

const authFailureListeners = new Set<AuthFailureListener>()

export const subscribeAuthFailure = (
  listener: AuthFailureListener,
): (() => void) => {
  authFailureListeners.add(listener)

  return () => {
    authFailureListeners.delete(listener)
  }
}

export const notifyAuthFailure = (reason: AuthFailureReason): void => {
  authFailureListeners.forEach((listener) => {
    listener(reason)
  })
}
