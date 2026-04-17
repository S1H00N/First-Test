export type FlowraErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE_RESOURCE'
  | 'VALIDATION_ERROR'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'AI_PROCESSING_FAILED'
  | 'INTERNAL_SERVER_ERROR'
  | (string & {})

export type LoginType = 'local' | 'google' | 'naver'
export type CategoryType = 'task' | 'schedule' | 'memo'
export type ScheduleType =
  | 'personal'
  | 'meeting'
  | 'fieldwork'
  | 'deadline'
  | 'other'
export type VisibilityType = 'private' | 'company'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'postponed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type MemoParseStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MemoType = 'quick' | 'meeting' | 'general'
export type MemoSourceType = 'manual' | 'voice' | 'imported'

export type ParseDetectedType = 'schedule' | 'task' | 'note' | 'mixed'
export type ParseResultStatus = 'suggested' | 'approved' | 'rejected'
export type ReminderType = 'push' | 'in_app' | 'email'

export type SortOrder = 'asc' | 'desc'

export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  message: string
  error: {
    code: FlowraErrorCode
    details?: Record<string, unknown>
  }
}

export interface Pagination {
  page: number
  size: number
  total_items: number
  total_pages: number
  has_next: boolean
}

export interface PaginatedData<T> {
  items: T[]
  pagination: Pagination
}

export interface PageQuery {
  page?: number
  size?: number
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface AuthUser {
  user_id: number
  email: string
  name: string
  login_type: LoginType
}

export interface UserProfile {
  user_id: number
  email: string
  name: string
  profile_image_url: string | null
  login_type: LoginType
  created_at: string
  updated_at?: string
}

export interface Category {
  category_id: number
  name: string
  color: string
  type: CategoryType
}

export interface Schedule {
  schedule_id: number
  title: string
  description: string | null
  schedule_type: ScheduleType
  start_datetime: string
  end_datetime: string | null
  all_day: boolean
  location: string | null
  category_id: number | null
  visibility: VisibilityType
  created_at: string
  updated_at?: string
}

export interface Task {
  task_id: number
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_datetime: string | null
  category_id: number | null
  schedule_id: number | null
  location: string | null
  created_at: string
  updated_at?: string
  completed_at?: string | null
}

export interface Memo {
  memo_id: number
  raw_text: string
  memo_type: MemoType
  source_type: MemoSourceType
  parse_status: MemoParseStatus
  parsed_at: string | null
  parse_error_message?: string | null
  created_at: string
  updated_at?: string
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

export interface AiParseResult {
  ai_result_id: number
  detected_type: ParseDetectedType
  suggested_schedule: SuggestedSchedule | null
  suggested_task: SuggestedTask | null
  confidence_score: number
  status: ParseResultStatus
  created_at: string
}

export interface Reminder {
  reminder_id: number
  target_type: 'schedule' | 'task'
  target_id: number
  remind_at: string
  reminder_type: ReminderType
  created_at: string
}

export interface TodayBriefing {
  date: string
  today_schedules: Array<{
    schedule_id: number
    title: string
    start_datetime: string
  }>
  priority_tasks: Array<{
    task_id: number
    title: string
    priority: TaskPriority
  }>
  unfinished_tasks: number
  ai_summary: string
}
