import { httpClient, unwrapData } from '../lib/httpClient'
import type { UserProfile } from '../types/flowra'

export interface UpdateMyProfilePayload {
  name?: string
  profile_image_url?: string | null
}

export const usersApi = {
  getMe: () => unwrapData<UserProfile>(httpClient.get('/users/me')),

  updateMe: (payload: UpdateMyProfilePayload) =>
    unwrapData<UserProfile>(httpClient.patch('/users/me', payload)),

  deleteMe: () => unwrapData<null>(httpClient.delete('/users/me')),
}
