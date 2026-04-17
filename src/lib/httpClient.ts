import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { notifyAuthFailure } from '../auth/authEvents'
import { API_BASE_URL } from '../config/env'
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/flowra'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from './tokenStorage'

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

type PendingRequest = {
  resolve: (token: string) => void
  reject: (reason?: unknown) => void
}

const AUTH_PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/signup',
  '/auth/social/login',
  '/auth/refresh',
]

const isPublicAuthEndpoint = (url?: string): boolean => {
  if (!url) {
    return false
  }

  return AUTH_PUBLIC_ENDPOINTS.some((path) => url.includes(path))
}

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let refreshQueue: PendingRequest[] = []

const flushRefreshQueue = (error: unknown | null, accessToken: string | null): void => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !accessToken) {
      reject(error)
      return
    }

    resolve(accessToken)
  })

  refreshQueue = []
}

const refreshAccessToken = async (
  refreshToken: string,
): Promise<RefreshTokenResponse> => {
  const response = await refreshClient.post<ApiSuccessResponse<RefreshTokenResponse>>(
    '/auth/refresh',
    {
      refresh_token: refreshToken,
    },
  )

  return response.data.data
}

httpClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryConfig | undefined
    const errorCode = error.response?.data?.error?.code
    const statusCode = error.response?.status

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const isPublicAuth = isPublicAuthEndpoint(originalRequest.url)

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthTokens()
      notifyAuthFailure('TOKEN_REFRESH_FAILED')
      return Promise.reject(error)
    }

    if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry && !isPublicAuth) {
      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        clearAuthTokens()
        notifyAuthFailure('TOKEN_EXPIRED')
        return Promise.reject(error)
      }

      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newAccessToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
              resolve(httpClient(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const newTokens = await refreshAccessToken(refreshToken)
        setAuthTokens(newTokens)

        flushRefreshQueue(null, newTokens.access_token)

        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`
        return httpClient(originalRequest)
      } catch (refreshError) {
        flushRefreshQueue(refreshError, null)
        clearAuthTokens()
        notifyAuthFailure('TOKEN_REFRESH_FAILED')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (!isPublicAuth && (errorCode === 'UNAUTHORIZED' || statusCode === 401)) {
      clearAuthTokens()
      notifyAuthFailure('UNAUTHORIZED')
    }

    if (!isPublicAuth && errorCode === 'TOKEN_INVALID') {
      clearAuthTokens()
      notifyAuthFailure('TOKEN_INVALID')
    }

    return Promise.reject(error)
  },
)

export const unwrapData = async <T>(
  request: Promise<AxiosResponse<ApiSuccessResponse<T>>>,
): Promise<T> => {
  const response = await request
  return response.data.data
}

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      '서버 요청 처리 중 오류가 발생했습니다.'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return undefined
  }

  return error.response?.data?.error?.code
}
