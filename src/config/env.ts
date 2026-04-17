const fallbackBaseUrl = 'https://flowra.xenon54.co.kr/api/v1'

const normalizeProtocolForSecureContext = (url: string): string => {
  if (typeof window === 'undefined') {
    return url
  }

  if (window.location.protocol !== 'https:') {
    return url
  }

  if (!url.startsWith('http://')) {
    return url
  }

  return `https://${url.slice('http://'.length)}`
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || fallbackBaseUrl
const secureAwareBaseUrl = normalizeProtocolForSecureContext(rawBaseUrl)

export const API_BASE_URL = secureAwareBaseUrl.endsWith('/')
  ? secureAwareBaseUrl.slice(0, -1)
  : secureAwareBaseUrl
