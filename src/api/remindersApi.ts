import { httpClient, unwrapData } from '../lib/httpClient'
import type { Reminder, ReminderType } from '../types/flowra'

export interface ReminderListQuery {
  target_type?: 'schedule' | 'task'
  target_id?: number
}

export interface ReminderListData {
  items: Reminder[]
}

export interface CreateReminderPayload {
  target_type: 'schedule' | 'task'
  target_id: number
  remind_at: string
  reminder_type: ReminderType
}

export const remindersApi = {
  list: (query?: ReminderListQuery) =>
    unwrapData<ReminderListData>(
      httpClient.get('/reminders', {
        params: query,
      }),
    ),

  create: (payload: CreateReminderPayload) =>
    unwrapData<Reminder>(httpClient.post('/reminders', payload)),

  remove: (reminderId: number) =>
    unwrapData<null>(httpClient.delete(`/reminders/${reminderId}`)),
}
