import axios from 'axios'
import { useCallback } from 'react'

import { useToast } from '../components/toast'
import type { ApiErrorResponse, FlowraErrorCode } from '../types/flowra'

const flowraErrorMessageMap: Partial<Record<FlowraErrorCode, string>> = {
  UNAUTHORIZED: '로그인이 필요하거나 인증 정보가 올바르지 않습니다. 다시 로그인해 주세요.',
  DUPLICATE_RESOURCE: '이미 존재하는 리소스입니다. 이메일 등 중복 여부를 확인해 주세요.',
  VALIDATION_ERROR: '입력값 형식이 올바르지 않습니다. 각 필드를 다시 확인해 주세요.',
  TOKEN_EXPIRED: '인증 토큰이 만료되었습니다. 다시 로그인해 주세요.',
  TOKEN_INVALID: '유효하지 않은 인증 토큰입니다. 다시 로그인해 주세요.',
  FORBIDDEN: '해당 작업에 대한 권한이 없습니다.',
  NOT_FOUND: '요청한 대상을 찾을 수 없습니다.',
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

interface ApiErrorHandleOptions {
  title?: string
  fallbackMessage?: string
  showToast?: boolean
  dedupeKey?: string
}

interface ParsedApiError {
  code?: FlowraErrorCode
  message: string
  details?: Record<string, unknown>
}

const parseValidationMessage = (details?: Record<string, unknown>): string => {
  const fieldName =
    typeof details?.field === 'string' && details.field.trim().length > 0
      ? details.field
      : null

  if (!fieldName) {
    return flowraErrorMessageMap.VALIDATION_ERROR as string
  }

  return `${fieldName} 입력값을 확인해 주세요.`
}

export function useApiError() {
  const { showToast } = useToast()

  const handleApiError = useCallback(
    (error: unknown, options?: ApiErrorHandleOptions): ParsedApiError => {
      let code: FlowraErrorCode | undefined
      let apiMessage: string | undefined
      let details: Record<string, unknown> | undefined

      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        code = error.response?.data?.error?.code
        apiMessage = error.response?.data?.message ?? error.message
        details = error.response?.data?.error?.details
      } else if (error instanceof Error) {
        apiMessage = error.message
      }

      let mappedMessage: string | undefined

      if (code === 'VALIDATION_ERROR') {
        mappedMessage = parseValidationMessage(details)
      } else if (code) {
        mappedMessage = flowraErrorMessageMap[code]
      }

      const message =
        mappedMessage || apiMessage || options?.fallbackMessage || '요청 처리 중 오류가 발생했습니다.'

      if (options?.showToast !== false) {
        const dedupeKey =
          options?.dedupeKey || `flowra-error:${code ?? 'UNKNOWN'}`

        showToast({
          tone: 'error',
          title: options?.title ?? '요청 실패',
          message,
          dedupeKey,
          priority: 3,
        })
      }

      return {
        code,
        message,
        details,
      }
    },
    [showToast],
  )

  return {
    handleApiError,
  }
}
