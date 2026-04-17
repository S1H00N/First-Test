import { httpClient, unwrapData } from '../lib/httpClient'
import type { AuthTokens, AuthUser, LoginType } from '../types/flowra'

export interface SignupPayload {
  email: string
  password: string
  name: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SocialLoginPayload {
  provider: Exclude<LoginType, 'local'>
  provider_access_token: string
}

export interface SignupResult {
  user_id: number
  email: string
  name: string
  login_type: LoginType
  created_at: string
}

export interface AuthSession extends AuthTokens {
  user: AuthUser
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    unwrapData<SignupResult>(httpClient.post('/auth/signup', payload)),

  login: (payload: LoginPayload) =>
    unwrapData<AuthSession>(httpClient.post('/auth/login', payload)),

  socialLogin: (payload: SocialLoginPayload) =>
    unwrapData<AuthSession>(httpClient.post('/auth/social/login', payload)),

  refresh: (refresh_token: string) =>
    unwrapData<AuthTokens>(httpClient.post('/auth/refresh', { refresh_token })),

  logout: (refresh_token: string) =>
    unwrapData<null>(httpClient.post('/auth/logout', { refresh_token })),
}
