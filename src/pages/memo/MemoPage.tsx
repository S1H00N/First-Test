import { type FormEvent, useCallback, useEffect, useState } from 'react'

import {
  applyMemoSchedule,
  applyMemoTask,
  createMemo,
  getMemoById,
  getMemoParseResult,
  getMemos,
  requestMemoParse,
  type ApplySchedulePayload,
  type ApplyTaskPayload,
  type GetMemosParams,
  type MemoDetail,
  type MemoListItem,
  type MemoParseResultResponse,
  type PaginationMeta,
} from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useToast } from '../../components/toast'
import { useApiError } from '../../hooks/useApiError'
import {
  MEMO_PARSE_STATUS,
  MEMO_SOURCE_TYPE,
  MEMO_TYPE,
  PAGINATION,
  TASK_PRIORITY,
  type MemoParseStatus,
  type MemoSourceType,
  type MemoType,
  type TaskPriority,
} from '../../types/enum'
import './MemoPage.css'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

const parseStatusLabelMap: Record<MemoParseStatus, string> = {
  [MEMO_PARSE_STATUS.PENDING]: '대기 중',
  [MEMO_PARSE_STATUS.PROCESSING]: '분석 중',
  [MEMO_PARSE_STATUS.COMPLETED]: '완료',
  [MEMO_PARSE_STATUS.FAILED]: '실패',
}

type MessageTone = 'info' | 'success' | 'error'

interface ScheduleOverrideFormState {
  override_title: string
  override_start_datetime: string
  override_end_datetime: string
  override_location: string
  override_category_id: string
}

interface TaskOverrideFormState {
  override_title: string
  override_priority: TaskPriority
  override_due_datetime: string
  override_category_id: string
}

const initialScheduleOverrideForm: ScheduleOverrideFormState = {
  override_title: '',
  override_start_datetime: '',
  override_end_datetime: '',
  override_location: '',
  override_category_id: '',
}

const initialTaskOverrideForm: TaskOverrideFormState = {
  override_title: '',
  override_priority: TASK_PRIORITY.MEDIUM,
  override_due_datetime: '',
  override_category_id: '',
}

const defaultPagination: PaginationMeta = {
  page: PAGINATION.DEFAULT_PAGE,
  size: PAGINATION.DEFAULT_SIZE,
  total_items: 0,
  total_pages: 1,
  has_next: false,
}

const toDateTimeLocalValue = (isoDateTime: string | null): string => {
  if (!isoDateTime) {
    return ''
  }

  const parsedDate = new Date(isoDateTime)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const offsetMilliseconds = parsedDate.getTimezoneOffset() * 60_000
  return new Date(parsedDate.getTime() - offsetMilliseconds)
    .toISOString()
    .slice(0, 16)
}

const toIsoDateTime = (localDateTime: string): string | undefined => {
  if (!localDateTime) {
    return undefined
  }

  const parsedDate = new Date(localDateTime)

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined
  }

  return parsedDate.toISOString()
}

const toOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeListQuery = (page: number, size: number): GetMemosParams => ({
  page,
  size: Math.min(size, PAGINATION.MAX_SIZE),
})

export function MemoPage() {
  const { handleApiError } = useApiError()
  const { showToast } = useToast()

  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [size, setSize] = useState<number>(PAGINATION.DEFAULT_SIZE)

  const [memoItems, setMemoItems] = useState<MemoListItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination)
  const [listError, setListError] = useState<string | null>(null)

  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null)
  const [selectedMemo, setSelectedMemo] = useState<MemoDetail | null>(null)
  const [parseResult, setParseResult] = useState<MemoParseResultResponse | null>(null)

  const [rawText, setRawText] = useState('')
  const [memoType, setMemoType] = useState<MemoType>(MEMO_TYPE.QUICK)
  const [sourceType, setSourceType] = useState<MemoSourceType>(MEMO_SOURCE_TYPE.MANUAL)

  const [scheduleOverrideForm, setScheduleOverrideForm] =
    useState<ScheduleOverrideFormState>(initialScheduleOverrideForm)
  const [taskOverrideForm, setTaskOverrideForm] =
    useState<TaskOverrideFormState>(initialTaskOverrideForm)

  const [listLoading, setListLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [messageTone, setMessageTone] = useState<MessageTone>('info')
  const [message, setMessage] = useState('메모 목록을 조회해 주세요.')

  const setStatusMessage = (tone: MessageTone, text: string): void => {
    setMessageTone(tone)
    setMessage(text)
  }

  const loadMemoList = useCallback(
    async (targetPage: number, targetSize: number): Promise<void> => {
      setListLoading(true)
      setListError(null)

      try {
        const response = await getMemos(normalizeListQuery(targetPage, targetSize))
        setMemoItems(response.items)
        setPagination(response.pagination)
      } catch (error) {
        const parsedError = handleApiError(error, {
          title: '메모 목록 조회 실패',
          fallbackMessage: '메모 목록 조회 중 오류가 발생했습니다.',
        })

        setListError(parsedError.message)
        setStatusMessage('error', `메모 목록 조회 실패: ${parsedError.message}`)
      } finally {
        setListLoading(false)
      }
    },
    [handleApiError],
  )

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadMemoList(page, size)
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [loadMemoList, page, size])

  const applySuggestedForms = (result: MemoParseResultResponse): void => {
    const suggestedSchedule = result.result?.suggested_schedule
    const suggestedTask = result.result?.suggested_task

    setScheduleOverrideForm({
      override_title: suggestedSchedule?.title ?? '',
      override_start_datetime: toDateTimeLocalValue(
        suggestedSchedule?.start_datetime ?? null,
      ),
      override_end_datetime: toDateTimeLocalValue(
        suggestedSchedule?.end_datetime ?? null,
      ),
      override_location: suggestedSchedule?.location ?? '',
      override_category_id:
        typeof suggestedSchedule?.category_id === 'number'
          ? String(suggestedSchedule.category_id)
          : '',
    })

    setTaskOverrideForm({
      override_title: suggestedTask?.title ?? '',
      override_priority: suggestedTask?.priority ?? TASK_PRIORITY.MEDIUM,
      override_due_datetime: toDateTimeLocalValue(suggestedTask?.due_datetime ?? null),
      override_category_id:
        typeof suggestedTask?.category_id === 'number'
          ? String(suggestedTask.category_id)
          : '',
    })
  }

  const resetOverrideForms = (): void => {
    setScheduleOverrideForm(initialScheduleOverrideForm)
    setTaskOverrideForm(initialTaskOverrideForm)
  }

  const handleSelectMemo = async (memoId: number): Promise<void> => {
    setActionLoading(true)

    try {
      const detail = await getMemoById(memoId)
      setSelectedMemoId(memoId)
      setSelectedMemo(detail)
      setParseResult(null)
      resetOverrideForms()

      setStatusMessage('info', `메모 ${memoId} 상세를 조회했습니다.`)
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '메모 상세 조회 실패',
        fallbackMessage: '메모 상세 조회 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `메모 상세 조회 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateMemo = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const trimmedRawText = rawText.trim()

    if (!trimmedRawText) {
      setStatusMessage('error', '메모 내용을 입력해 주세요.')
      return
    }

    setActionLoading(true)

    try {
      const created = await createMemo({
        raw_text: trimmedRawText,
        memo_type: memoType,
        source_type: sourceType,
        auto_parse: true,
      })

      setRawText('')
      setPage(PAGINATION.DEFAULT_PAGE)
      await loadMemoList(PAGINATION.DEFAULT_PAGE, size)

      const detail = await getMemoById(created.memo_id)
      setSelectedMemoId(created.memo_id)
      setSelectedMemo(detail)
      setParseResult({
        memo_id: created.memo_id,
        parse_status: created.parse_status,
        result: null,
      })
      resetOverrideForms()

      setStatusMessage(
        'success',
        `메모 생성 완료 (memo_id: ${created.memo_id}, parse_status: ${created.parse_status})`,
      )
      showToast({
        tone: 'success',
        title: '메모 생성 성공',
        message: '자동 AI 파싱이 시작되었습니다.',
      })
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '메모 생성 실패',
        fallbackMessage: '메모 생성 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `메모 생성 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestParse = async (memoId: number): Promise<void> => {
    setActionLoading(true)

    try {
      const response = await requestMemoParse(memoId)

      setParseResult((current) => {
        if (!current || current.memo_id !== memoId) {
          return {
            memo_id: response.memo_id,
            parse_status: response.parse_status,
            result: null,
          }
        }

        return {
          ...current,
          parse_status: response.parse_status,
          result: null,
        }
      })

      await loadMemoList(page, size)

      if (selectedMemoId === memoId) {
        const detail = await getMemoById(memoId)
        setSelectedMemo(detail)
      }

      setStatusMessage('success', 'AI 재분석 요청을 전송했습니다. 결과를 다시 조회해 주세요.')
      showToast({
        tone: 'success',
        title: '재분석 요청 완료',
        message: `memo_id ${memoId}의 AI 파싱을 다시 요청했습니다.`,
      })
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: 'AI 재분석 요청 실패',
        fallbackMessage: 'AI 재분석 요청 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `AI 재분석 요청 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLoadParseResult = async (memoId: number): Promise<void> => {
    setActionLoading(true)

    try {
      const result = await getMemoParseResult(memoId)
      setParseResult(result)
      applySuggestedForms(result)

      setStatusMessage('success', 'AI 파싱 결과를 조회했습니다. 필요하면 값을 수정한 뒤 반영하세요.')

      if (selectedMemoId === memoId) {
        const detail = await getMemoById(memoId)
        setSelectedMemo(detail)
      }

      await loadMemoList(page, size)
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: 'AI 파싱 결과 조회 실패',
        fallbackMessage: 'AI 파싱 결과 조회 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `AI 파싱 결과 조회 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApplySchedule = async (): Promise<void> => {
    if (!selectedMemoId) {
      setStatusMessage('error', '먼저 메모를 선택해 주세요.')
      return
    }

    const payload: ApplySchedulePayload = {}
    const title = scheduleOverrideForm.override_title.trim()
    const location = scheduleOverrideForm.override_location.trim()
    const startDateTime = toIsoDateTime(scheduleOverrideForm.override_start_datetime)
    const endDateTime = toIsoDateTime(scheduleOverrideForm.override_end_datetime)
    const categoryId = toOptionalNumber(scheduleOverrideForm.override_category_id)

    if (title) payload.override_title = title
    if (location) payload.override_location = location
    if (startDateTime) payload.override_start_datetime = startDateTime
    if (endDateTime) payload.override_end_datetime = endDateTime
    if (typeof categoryId === 'number') payload.override_category_id = categoryId

    setActionLoading(true)

    try {
      const response = await applyMemoSchedule(selectedMemoId, payload)
      setStatusMessage('success', `일정 생성 완료 (schedule_id: ${response.schedule_id})`)
      showToast({
        tone: 'success',
        title: '일정 생성 성공',
        message: `schedule_id ${response.schedule_id}가 생성되었습니다.`,
      })
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '일정 생성 실패',
        fallbackMessage: 'AI 결과 일정 반영 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `일정 생성 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApplyTask = async (): Promise<void> => {
    if (!selectedMemoId) {
      setStatusMessage('error', '먼저 메모를 선택해 주세요.')
      return
    }

    const payload: ApplyTaskPayload = {}
    const title = taskOverrideForm.override_title.trim()
    const dueDateTime = toIsoDateTime(taskOverrideForm.override_due_datetime)
    const categoryId = toOptionalNumber(taskOverrideForm.override_category_id)

    if (title) payload.override_title = title
    if (dueDateTime) payload.override_due_datetime = dueDateTime
    if (typeof categoryId === 'number') payload.override_category_id = categoryId
    payload.override_priority = taskOverrideForm.override_priority

    setActionLoading(true)

    try {
      const response = await applyMemoTask(selectedMemoId, payload)
      setStatusMessage('success', `할 일 생성 완료 (task_id: ${response.task_id})`)
      showToast({
        tone: 'success',
        title: '할 일 생성 성공',
        message: `task_id ${response.task_id}가 생성되었습니다.`,
      })
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '할 일 생성 실패',
        fallbackMessage: 'AI 결과 할 일 반영 중 오류가 발생했습니다.',
      })
      setStatusMessage('error', `할 일 생성 실패: ${parsedError.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const currentMemoId = selectedMemoId
  const hasParseResult = Boolean(parseResult && parseResult.memo_id === currentMemoId)

  return (
    <div className="memo-page">
      <section className="memo-card memo-create-card">
        <h2>메모 생성</h2>
        <p className="helper">메모 생성 시 auto_parse는 기본적으로 true로 전송됩니다.</p>

        <form className="memo-create-form" onSubmit={handleCreateMemo}>
          <label>
            메모 내용
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="예: 내일 오후 2시에 팀플 회의, 발표자료 수정 필요"
              rows={4}
              required
            />
          </label>

          <div className="row">
            <label>
              memo_type
              <select
                value={memoType}
                onChange={(event) => setMemoType(event.target.value as MemoType)}
              >
                {Object.values(MEMO_TYPE).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              source_type
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as MemoSourceType)
                }
              >
                {Object.values(MEMO_SOURCE_TYPE).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button type="submit" disabled={actionLoading}>
            메모 저장 및 AI 파싱 시작
          </button>
        </form>
      </section>

      <section className="memo-card memo-list-card">
        <h2>메모 목록</h2>

        <div className="toolbar">
          <label>
            size
            <select
              value={size}
              onChange={(event) => {
                const nextSize = Number(event.target.value)
                setPage(PAGINATION.DEFAULT_PAGE)
                setSize(nextSize)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadMemoList(page, size)}
            disabled={listLoading}
          >
            새로고침
          </button>
        </div>

        {listLoading && memoItems.length === 0 ? (
          <LoadingState
            title="메모 목록 로딩 중"
            description="메모와 AI 파싱 상태를 조회하고 있습니다."
          />
        ) : null}

        {!listLoading && listError && memoItems.length === 0 ? (
          <ErrorState description={listError} onRetry={() => void loadMemoList(page, size)} />
        ) : null}

        {!listLoading && !listError && memoItems.length === 0 ? (
          <EmptyState description="아직 저장된 메모가 없습니다." />
        ) : null}

        {memoItems.length > 0 ? (
          <ul className="memo-list">
            {memoItems.map((memo) => (
              <li
                key={memo.memo_id}
                className={memo.memo_id === selectedMemoId ? 'active' : ''}
              >
                <div className="memo-item-head">
                  <strong>#{memo.memo_id}</strong>
                  <span className={`status-badge status-${memo.parse_status}`}>
                    {parseStatusLabelMap[memo.parse_status]}
                  </span>
                </div>

                <p>{memo.raw_text}</p>

                {memo.parse_status === MEMO_PARSE_STATUS.PROCESSING ? (
                  <div className="memo-processing-indicator" aria-live="polite">
                    <span className="processing-dot" aria-hidden="true" />
                    <div className="processing-bars" aria-hidden="true">
                      <span className="processing-bar" />
                      <span className="processing-bar short" />
                    </div>
                    <small>AI가 메모를 분석 중입니다...</small>
                  </div>
                ) : null}

                <div className="memo-item-actions">
                  <button
                    type="button"
                    onClick={() => void handleSelectMemo(memo.memo_id)}
                    disabled={actionLoading}
                  >
                    상세
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRequestParse(memo.memo_id)}
                    disabled={actionLoading}
                  >
                    재분석 요청
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLoadParseResult(memo.memo_id)}
                    disabled={actionLoading}
                  >
                    파싱 결과 조회
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="pagination">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || listLoading}
          >
            이전
          </button>
          <span>
            {pagination.page} / {Math.max(1, pagination.total_pages)}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.has_next || listLoading}
          >
            다음
          </button>
        </div>
      </section>

      <section className="memo-card memo-detail-card">
        <h2>메모 상세 및 AI 결과 반영</h2>

        <div className={`message message-${messageTone}`}>{message}</div>

        {!selectedMemo ? (
          <p className="helper">메모 목록에서 상세 버튼을 눌러 선택해 주세요.</p>
        ) : (
          <>
            <div className="memo-summary">
              <div>
                <span>memo_id</span>
                <strong>{selectedMemo.memo_id}</strong>
              </div>
              <div>
                <span>parse_status</span>
                <strong>{selectedMemo.parse_status}</strong>
              </div>
              <div>
                <span>parsed_at</span>
                <strong>{selectedMemo.parsed_at ?? '-'}</strong>
              </div>
            </div>

            <div className="detail-actions">
              <button
                type="button"
                onClick={() => void handleLoadParseResult(selectedMemo.memo_id)}
                disabled={actionLoading}
              >
                파싱 결과 다시 조회
              </button>
              <button
                type="button"
                onClick={() => void handleRequestParse(selectedMemo.memo_id)}
                disabled={actionLoading}
              >
                수동 재분석 요청
              </button>
            </div>

            {hasParseResult ? (
              <div className="parse-result-box">
                <p>
                  parse_status: <strong>{parseResult?.parse_status}</strong>
                </p>
                <p>
                  detected_type:{' '}
                  <strong>{parseResult?.result?.detected_type ?? 'none'}</strong>
                </p>
                <p>
                  confidence_score:{' '}
                  <strong>{parseResult?.result?.confidence_score ?? '-'}</strong>
                </p>
              </div>
            ) : (
              <p className="helper">파싱 결과 조회 버튼을 눌러 AI 제안을 확인하세요.</p>
            )}

            <div className="apply-grid">
              <article>
                <h3>일정 반영 폼</h3>
                <label>
                  override_title
                  <input
                    value={scheduleOverrideForm.override_title}
                    onChange={(event) =>
                      setScheduleOverrideForm((current) => ({
                        ...current,
                        override_title: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_start_datetime
                  <input
                    type="datetime-local"
                    value={scheduleOverrideForm.override_start_datetime}
                    onChange={(event) =>
                      setScheduleOverrideForm((current) => ({
                        ...current,
                        override_start_datetime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_end_datetime
                  <input
                    type="datetime-local"
                    value={scheduleOverrideForm.override_end_datetime}
                    onChange={(event) =>
                      setScheduleOverrideForm((current) => ({
                        ...current,
                        override_end_datetime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_location
                  <input
                    value={scheduleOverrideForm.override_location}
                    onChange={(event) =>
                      setScheduleOverrideForm((current) => ({
                        ...current,
                        override_location: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_category_id
                  <input
                    inputMode="numeric"
                    value={scheduleOverrideForm.override_category_id}
                    onChange={(event) =>
                      setScheduleOverrideForm((current) => ({
                        ...current,
                        override_category_id: event.target.value,
                      }))
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleApplySchedule()}
                  disabled={actionLoading || !selectedMemoId}
                >
                  일정 생성 적용
                </button>
              </article>

              <article>
                <h3>할 일 반영 폼</h3>
                <label>
                  override_title
                  <input
                    value={taskOverrideForm.override_title}
                    onChange={(event) =>
                      setTaskOverrideForm((current) => ({
                        ...current,
                        override_title: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_priority
                  <select
                    value={taskOverrideForm.override_priority}
                    onChange={(event) =>
                      setTaskOverrideForm((current) => ({
                        ...current,
                        override_priority: event.target.value as TaskPriority,
                      }))
                    }
                  >
                    {Object.values(TASK_PRIORITY).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  override_due_datetime
                  <input
                    type="datetime-local"
                    value={taskOverrideForm.override_due_datetime}
                    onChange={(event) =>
                      setTaskOverrideForm((current) => ({
                        ...current,
                        override_due_datetime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  override_category_id
                  <input
                    inputMode="numeric"
                    value={taskOverrideForm.override_category_id}
                    onChange={(event) =>
                      setTaskOverrideForm((current) => ({
                        ...current,
                        override_category_id: event.target.value,
                      }))
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleApplyTask()}
                  disabled={actionLoading || !selectedMemoId}
                >
                  할 일 생성 적용
                </button>
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
