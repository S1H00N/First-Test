import { httpClient, unwrapData } from '../lib/httpClient'
import type {
  PageQuery,
  PaginatedData,
  Schedule,
  ScheduleType,
  VisibilityType,
} from '../types/flowra'

export type ScheduleView = 'month' | 'week' | 'day' | 'list'

export interface ScheduleListQuery extends PageQuery {
  start_date?: string
  end_date?: string
  view?: ScheduleView
  category_id?: number
  schedule_type?: ScheduleType
}

export interface CreateSchedulePayload {
  title: string
  description?: string
  schedule_type: ScheduleType
  start_datetime: string
  end_datetime?: string
  all_day: boolean
  location?: string
  category_id?: number
  visibility: VisibilityType
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>

export const schedulesApi = {
  list: (query?: ScheduleListQuery) =>
    unwrapData<PaginatedData<Schedule>>(
      httpClient.get('/schedules', {
        params: query,
      }),
    ),

  getById: (scheduleId: number) =>
    unwrapData<Schedule>(httpClient.get(`/schedules/${scheduleId}`)),

  create: (payload: CreateSchedulePayload) =>
    unwrapData<Schedule>(httpClient.post('/schedules', payload)),

  update: (scheduleId: number, payload: UpdateSchedulePayload) =>
    unwrapData<Schedule>(httpClient.patch(`/schedules/${scheduleId}`, payload)),

  remove: (scheduleId: number) =>
    unwrapData<null>(httpClient.delete(`/schedules/${scheduleId}`)),
}
