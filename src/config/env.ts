const fallbackBaseUrl = 'http://flowra.xenon54.co.kr/api/v1'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || fallbackBaseUrl

export const API_BASE_URL = rawBaseUrl.endsWith('/')
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl
