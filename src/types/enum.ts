export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  POSTPONED: 'postponed',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY]

export const MEMO_PARSE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type MemoParseStatus =
  (typeof MEMO_PARSE_STATUS)[keyof typeof MEMO_PARSE_STATUS]

export const MEMO_TYPE = {
  QUICK: 'quick',
  MEETING: 'meeting',
  GENERAL: 'general',
} as const

export type MemoType = (typeof MEMO_TYPE)[keyof typeof MEMO_TYPE]

export const MEMO_SOURCE_TYPE = {
  MANUAL: 'manual',
  VOICE: 'voice',
  IMPORTED: 'imported',
} as const

export type MemoSourceType =
  (typeof MEMO_SOURCE_TYPE)[keyof typeof MEMO_SOURCE_TYPE]

export const SCHEDULE_TYPE = {
  PERSONAL: 'personal',
  MEETING: 'meeting',
  FIELDWORK: 'fieldwork',
  DEADLINE: 'deadline',
  OTHER: 'other',
} as const

export type ScheduleType = (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE]

export const AI_DETECTED_TYPE = {
  SCHEDULE: 'schedule',
  TASK: 'task',
  NOTE: 'note',
  MIXED: 'mixed',
} as const

export type AiDetectedType =
  (typeof AI_DETECTED_TYPE)[keyof typeof AI_DETECTED_TYPE]

export const AI_RESULT_STATUS = {
  SUGGESTED: 'suggested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type AiResultStatus =
  (typeof AI_RESULT_STATUS)[keyof typeof AI_RESULT_STATUS]

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100,
} as const
