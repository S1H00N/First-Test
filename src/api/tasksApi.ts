import { httpClient, unwrapData } from '../lib/httpClient'
import type {
  PageQuery,
  PaginatedData,
  SortOrder,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types/flowra'

export type TaskSortField = 'created_at' | 'due_datetime' | 'priority'

export interface TaskListQuery extends PageQuery {
  status?: string
  priority?: string
  due_from?: string
  due_to?: string
  category_id?: number
  schedule_id?: number
  sort_by?: TaskSortField
  sort_order?: SortOrder
}

export interface CreateTaskPayload {
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  due_datetime?: string
  category_id?: number
  schedule_id?: number
  location?: string
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>

export interface CompleteTaskResult {
  task_id: number
  status: TaskStatus
  completed_at: string
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus
}

export const tasksApi = {
  list: (query?: TaskListQuery) =>
    unwrapData<PaginatedData<Task>>(
      httpClient.get('/tasks', {
        params: query,
      }),
    ),

  getById: (taskId: number) => unwrapData<Task>(httpClient.get(`/tasks/${taskId}`)),

  create: (payload: CreateTaskPayload) =>
    unwrapData<Task>(httpClient.post('/tasks', payload)),

  update: (taskId: number, payload: UpdateTaskPayload) =>
    unwrapData<Task>(httpClient.patch(`/tasks/${taskId}`, payload)),

  complete: (taskId: number) =>
    unwrapData<CompleteTaskResult>(httpClient.patch(`/tasks/${taskId}/complete`)),

  changeStatus: (taskId: number, payload: UpdateTaskStatusPayload) =>
    unwrapData<Task>(httpClient.patch(`/tasks/${taskId}/status`, payload)),

  remove: (taskId: number) => unwrapData<null>(httpClient.delete(`/tasks/${taskId}`)),
}
