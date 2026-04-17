import apiClient from './axios'
import {
  type AiDetectedType,
  type AiResultStatus,
  type MemoParseStatus,
  type MemoSourceType,
  type MemoType,
  PAGINATION,
  type TaskPriority,
} from '../types/enum'

interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface PaginationMeta {
  page: number
  size: number
  total_items: number
  total_pages: number
  has_next: boolean
}

export interface PaginatedData<T> {
  items: T[]
  pagination: PaginationMeta
}

export interface MemoListItem {
  memo_id: number
  raw_text: string
  memo_type: MemoType
  source_type: MemoSourceType
  parse_status: MemoParseStatus
  parsed_at: string | null
  created_at: string
}

export interface MemoDetail extends MemoListItem {
  parse_error_message: string | null
  updated_at: string
}

export interface GetMemosParams {
  parse_status?: MemoParseStatus
  memo_type?: MemoType
  page?: number
  size?: number
}

export interface CreateMemoPayload {
  raw_text: string
  memo_type: MemoType
  source_type: MemoSourceType
  auto_parse?: boolean
}

export interface CreateMemoResponse {
  memo_id: number
  parse_status: MemoParseStatus
  created_at: string
}

export interface SuggestedSchedule {
  title: string
  description: string | null
  start_datetime: string | null
  end_datetime: string | null
  location: string | null
  category_id: number | null
}

export interface SuggestedTask {
  title: string
  description: string | null
  priority: TaskPriority
  due_datetime: string | null
  category_id: number | null
}

export interface MemoAiResult {
  ai_result_id: number
  detected_type: AiDetectedType
  suggested_schedule: SuggestedSchedule | null
  suggested_task: SuggestedTask | null
  confidence_score: number
  status: AiResultStatus
  created_at: string
}

export interface MemoParseResultResponse {
  memo_id: number
  parse_status: MemoParseStatus
  result: MemoAiResult | null
}

export interface RequestMemoParseResponse {
  memo_id: number
  parse_status: MemoParseStatus
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

export interface ApplyScheduleResponse {
  schedule_id: number
  source_memo_id: number
  source_ai_result_id: number
}

export interface ApplyTaskResponse {
  task_id: number
  source_memo_id: number
  source_ai_result_id: number
}

const normalizePaginationParams = (params?: GetMemosParams): Required<
  Pick<GetMemosParams, 'page' | 'size'>
> => {
  const page = params?.page ?? PAGINATION.DEFAULT_PAGE
  const rawSize = params?.size ?? PAGINATION.DEFAULT_SIZE

  return {
    page,
    size: Math.min(rawSize, PAGINATION.MAX_SIZE),
  }
}

export const getMemos = async (
  params?: GetMemosParams,
): Promise<PaginatedData<MemoListItem>> => {
  const paging = normalizePaginationParams(params)

  const response = await apiClient.get<ApiSuccessResponse<PaginatedData<MemoListItem>>>(
    '/memos',
    {
      params: {
        ...params,
        ...paging,
      },
    },
  )

  return response.data.data
}

export const getMemoById = async (memoId: number): Promise<MemoDetail> => {
  const response = await apiClient.get<ApiSuccessResponse<MemoDetail>>(
    `/memos/${memoId}`,
  )

  return response.data.data
}

export const createMemo = async (
  payload: CreateMemoPayload,
): Promise<CreateMemoResponse> => {
  const response = await apiClient.post<ApiSuccessResponse<CreateMemoResponse>>(
    '/memos',
    payload,
  )

  return response.data.data
}

export const getMemoParseResult = async (
  memoId: number,
): Promise<MemoParseResultResponse> => {
  const response = await apiClient.get<ApiSuccessResponse<MemoParseResultResponse>>(
    `/memos/${memoId}/parse-result`,
  )

  return response.data.data
}

export const requestMemoParse = async (
  memoId: number,
): Promise<RequestMemoParseResponse> => {
  const response =
    await apiClient.post<ApiSuccessResponse<RequestMemoParseResponse>>(
      `/memos/${memoId}/parse`,
    )

  return response.data.data
}

export const applyMemoSchedule = async (
  memoId: number,
  payload?: ApplySchedulePayload,
): Promise<ApplyScheduleResponse> => {
  const response = await apiClient.post<ApiSuccessResponse<ApplyScheduleResponse>>(
    `/memos/${memoId}/apply/schedule`,
    payload,
  )

  return response.data.data
}

export const applyMemoTask = async (
  memoId: number,
  payload?: ApplyTaskPayload,
): Promise<ApplyTaskResponse> => {
  const response = await apiClient.post<ApiSuccessResponse<ApplyTaskResponse>>(
    `/memos/${memoId}/apply/task`,
    payload,
  )

  return response.data.data
}
