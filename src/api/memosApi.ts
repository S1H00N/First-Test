import { httpClient, unwrapData } from '../lib/httpClient'
import type {
  AiParseResult,
  Memo,
  MemoParseStatus,
  MemoSourceType,
  MemoType,
  PageQuery,
  PaginatedData,
  TaskPriority,
} from '../types/flowra'

export interface MemoListQuery extends PageQuery {
  parse_status?: MemoParseStatus
  memo_type?: MemoType
}

export interface CreateMemoPayload {
  raw_text: string
  memo_type: MemoType
  source_type: MemoSourceType
  auto_parse?: boolean
}

export interface MemoCreateResult {
  memo_id: number
  parse_status: MemoParseStatus
  created_at: string
}

export interface UpdateMemoPayload {
  raw_text?: string
  memo_type?: MemoType
}

export interface ParseMemoResult {
  memo_id: number
  parse_status: MemoParseStatus
}

export interface ParseResultData {
  memo_id: number
  parse_status: MemoParseStatus
  result: AiParseResult | null
}

export interface ApplySchedulePayload {
  override_title?: string
  override_start_datetime?: string
  override_end_datetime?: string
  override_location?: string
  override_category_id?: number
}

export interface ApplyTaskPayload {
  override_title?: string
  override_priority?: TaskPriority
  override_due_datetime?: string
  override_category_id?: number
}

export interface ApplyScheduleResult {
  schedule_id: number
  source_memo_id: number
  source_ai_result_id: number
}

export interface ApplyTaskResult {
  task_id: number
  source_memo_id: number
  source_ai_result_id: number
}

export const memosApi = {
  list: (query?: MemoListQuery) =>
    unwrapData<PaginatedData<Memo>>(
      httpClient.get('/memos', {
        params: query,
      }),
    ),

  getById: (memoId: number) => unwrapData<Memo>(httpClient.get(`/memos/${memoId}`)),

  create: (payload: CreateMemoPayload) =>
    unwrapData<MemoCreateResult>(httpClient.post('/memos', payload)),

  update: (memoId: number, payload: UpdateMemoPayload) =>
    unwrapData<Memo>(httpClient.patch(`/memos/${memoId}`, payload)),

  remove: (memoId: number) => unwrapData<null>(httpClient.delete(`/memos/${memoId}`)),

  parse: (memoId: number) =>
    unwrapData<ParseMemoResult>(httpClient.post(`/memos/${memoId}/parse`)),

  getParseResult: (memoId: number) =>
    unwrapData<ParseResultData>(httpClient.get(`/memos/${memoId}/parse-result`)),

  applySchedule: (memoId: number, payload?: ApplySchedulePayload) =>
    unwrapData<ApplyScheduleResult>(
      httpClient.post(`/memos/${memoId}/apply/schedule`, payload),
    ),

  applyTask: (memoId: number, payload?: ApplyTaskPayload) =>
    unwrapData<ApplyTaskResult>(httpClient.post(`/memos/${memoId}/apply/task`, payload)),
}
