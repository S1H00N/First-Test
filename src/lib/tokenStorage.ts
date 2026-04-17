const ACCESS_TOKEN_KEY = 'flowra.accessToken'
const REFRESH_TOKEN_KEY = 'flowra.refreshToken'
const EXPIRES_AT_KEY = 'flowra.accessExpiresAt'

export interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_in?: number
}

const hasWindow = () => typeof window !== 'undefined'

const readStorageItem = (key: string): string | null => {
  if (!hasWindow()) {
    return null
  }

  return window.localStorage.getItem(key)
}

const writeStorageItem = (key: string, value: string): void => {
  if (!hasWindow()) {
    return
  }

  window.localStorage.setItem(key, value)
}

const removeStorageItem = (key: string): void => {
  if (!hasWindow()) {
    return
  }

  window.localStorage.removeItem(key)
}

export const getAccessToken = (): string | null => readStorageItem(ACCESS_TOKEN_KEY)

export const getRefreshToken = (): string | null =>
  readStorageItem(REFRESH_TOKEN_KEY)

export const getAccessTokenExpiresAt = (): number | null => {
  const rawValue = readStorageItem(EXPIRES_AT_KEY)

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? parsed : null
}

export const isAccessTokenExpired = (): boolean => {
  const expiresAt = getAccessTokenExpiresAt()

  if (!expiresAt) {
    return false
  }

  return Date.now() >= expiresAt
}

export const setAuthTokens = (tokens: StoredTokens): void => {
  writeStorageItem(ACCESS_TOKEN_KEY, tokens.access_token)
  writeStorageItem(REFRESH_TOKEN_KEY, tokens.refresh_token)

  if (typeof tokens.expires_in === 'number') {
    const expiresAt = Date.now() + tokens.expires_in * 1000
    writeStorageItem(EXPIRES_AT_KEY, String(expiresAt))
  }
}

export const clearAuthTokens = (): void => {
  removeStorageItem(ACCESS_TOKEN_KEY)
  removeStorageItem(REFRESH_TOKEN_KEY)
  removeStorageItem(EXPIRES_AT_KEY)
}
