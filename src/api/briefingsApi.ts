import { httpClient, unwrapData } from '../lib/httpClient'
import type { TodayBriefing } from '../types/flowra'

export const briefingsApi = {
  getToday: () => unwrapData<TodayBriefing>(httpClient.get('/briefings/today')),
}
