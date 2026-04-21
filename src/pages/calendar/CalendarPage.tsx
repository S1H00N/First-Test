import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  schedulesApi,
  type CreateSchedulePayload,
  type ScheduleView,
  type UpdateSchedulePayload,
} from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useApiError } from '../../hooks/useApiError'
import { SCHEDULE_TYPE } from '../../types/enum'
import type { Schedule, ScheduleType, VisibilityType } from '../../types/flowra'

interface ScheduleFormState {
  title: string
  description: string
  schedule_type: ScheduleType
  start_datetime: string
  end_datetime: string
  all_day: boolean
  location: string
  visibility: VisibilityType
}

const initialScheduleForm: ScheduleFormState = {
  title: '',
  description: '',
  schedule_type: SCHEDULE_TYPE.PERSONAL,
  start_datetime: '',
  end_datetime: '',
  all_day: false,
  location: '',
  visibility: 'private',
}

const scheduleViewValues: ScheduleView[] = ['month', 'week', 'day', 'list']

const normalizeScheduleView = (value: string | null): ScheduleView => {
  if (!value) {
    return 'month'
  }

  if (scheduleViewValues.includes(value as ScheduleView)) {
    return value as ScheduleView
  }

  return 'month'
}

const normalizeDateFilter = (value: string | null): string => {
  if (!value) {
    return ''
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
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

export function CalendarPage() {
  const { handleApiError } = useApiError()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView] = useState<ScheduleView>(() =>
    normalizeScheduleView(searchParams.get('view')),
  )
  const [startDateFilter, setStartDateFilter] = useState<string>(() =>
    normalizeDateFilter(searchParams.get('start_date')),
  )
  const [page, setPage] = useState<number>(1)
  const [size, setSize] = useState<number>(20)

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)
  const [form, setForm] = useState<ScheduleFormState>(initialScheduleForm)

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('일정 API를 조회해 주세요.')

  const fetchSchedules = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)

    try {
      // TODO(Calendar): GET /schedules
      const response = await schedulesApi.list({
        page,
        size,
        view,
        start_date: startDateFilter || undefined,
      })

      setSchedules(response.items)
      setMessage('일정 목록 조회 성공')
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '일정 목록 조회 실패',
        fallbackMessage: '일정 목록을 불러오는 중 오류가 발생했습니다.',
      })

      setLoadError(parsedError.message)
      setMessage(`일정 목록 조회 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }, [handleApiError, page, size, startDateFilter, view])

  const applyCalendarQuery = useCallback(
    (nextView: ScheduleView, nextStartDate: string): void => {
      const params = new URLSearchParams(searchParams)
      params.set('view', nextView)

      if (nextStartDate) {
        params.set('start_date', nextStartDate)
      } else {
        params.delete('start_date')
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchSchedules()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [fetchSchedules])

  const handleCreateSchedule = async (): Promise<void> => {
    const startDateTime = toIsoDateTime(form.start_datetime)

    if (!form.title.trim() || !startDateTime) {
      setMessage('title과 start_datetime은 필수입니다.')
      return
    }

    const payload: CreateSchedulePayload = {
      title: form.title.trim(),
      description: form.description || undefined,
      schedule_type: form.schedule_type,
      start_datetime: startDateTime,
      end_datetime: toIsoDateTime(form.end_datetime),
      all_day: form.all_day,
      location: form.location || undefined,
      visibility: form.visibility,
    }

    setLoading(true)

    try {
      // TODO(Calendar): POST /schedules
      await schedulesApi.create(payload)
      setMessage('일정 생성 성공')
      setForm(initialScheduleForm)
      await fetchSchedules()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '일정 생성 실패',
        fallbackMessage: '일정 생성 중 오류가 발생했습니다.',
      })
      setMessage(`일정 생성 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSchedule = async (): Promise<void> => {
    if (!selectedScheduleId) {
      setMessage('수정할 일정(schedule_id)을 선택해 주세요.')
      return
    }

    const payload: UpdateSchedulePayload = {
      title: form.title || undefined,
      description: form.description || undefined,
      schedule_type: form.schedule_type,
      start_datetime: toIsoDateTime(form.start_datetime),
      end_datetime: toIsoDateTime(form.end_datetime),
      all_day: form.all_day,
      location: form.location || undefined,
      visibility: form.visibility,
    }

    setLoading(true)

    try {
      // TODO(Calendar): PATCH /schedules/{scheduleId}
      await schedulesApi.update(selectedScheduleId, payload)
      setMessage(`일정 수정 성공 (schedule_id: ${selectedScheduleId})`)
      await fetchSchedules()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '일정 수정 실패',
        fallbackMessage: '일정 수정 중 오류가 발생했습니다.',
      })
      setMessage(`일정 수정 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: number): Promise<void> => {
    setLoading(true)

    try {
      // TODO(Calendar): DELETE /schedules/{scheduleId}
      await schedulesApi.remove(scheduleId)
      setMessage(`일정 삭제 성공 (schedule_id: ${scheduleId})`)
      if (selectedScheduleId === scheduleId) {
        setSelectedScheduleId(null)
      }
      await fetchSchedules()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '일정 삭제 실패',
        fallbackMessage: '일정 삭제 중 오류가 발생했습니다.',
      })
      setMessage(`일정 삭제 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section">
      <header className="page-header">
        <h2>Calendar</h2>
        <p>캘린더 뷰 기반 일정 CRUD API 연결 화면입니다.</p>
      </header>

      <article className="panel">
        <h3>일정 조회 필터</h3>
        <div className="inline-field">
          <label>
            view
            <select
              value={view}
              onChange={(event) => {
                const nextView = event.target.value as ScheduleView
                setView(nextView)
                applyCalendarQuery(nextView, startDateFilter)
              }}
            >
              <option value="month">month</option>
              <option value="week">week</option>
              <option value="day">day</option>
              <option value="list">list</option>
            </select>
          </label>

          <label>
            start_date
            <input
              type="date"
              value={startDateFilter}
              onChange={(event) => {
                const nextStartDate = normalizeDateFilter(event.target.value)
                setStartDateFilter(nextStartDate)
                applyCalendarQuery(view, nextStartDate)
              }}
            />
          </label>

          <label>
            page
            <input
              type="number"
              min={1}
              value={page}
              onChange={(event) => {
                const nextPage = Number(event.target.value)
                setPage(Number.isFinite(nextPage) ? Math.max(1, nextPage) : 1)
              }}
            />
          </label>

          <label>
            size
            <input
              type="number"
              min={1}
              max={100}
              value={size}
              onChange={(event) => {
                const nextSize = Number(event.target.value)
                const normalized = Number.isFinite(nextSize)
                  ? Math.min(Math.max(1, nextSize), 100)
                  : 20
                setSize(normalized)
              }}
            />
          </label>

          <button type="button" className="secondary" onClick={() => void fetchSchedules()}>
            GET /schedules
          </button>
        </div>
        <p className="helper-text">{loading ? '요청 중...' : message}</p>
        <p className="helper-text">
          적용 필터: view={view}
          {startDateFilter ? `, start_date=${startDateFilter}` : ''}
        </p>
      </article>

      <section className="grid-2">
        <article className="panel">
          <h3>일정 생성 / 수정 폼</h3>
          <div className="form-grid">
            <label>
              title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>

            <label>
              description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <label>
              schedule_type
              <select
                value={form.schedule_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    schedule_type: event.target.value as ScheduleType,
                  }))
                }
              >
                {Object.values(SCHEDULE_TYPE).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              start_datetime
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_datetime: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              end_datetime
              <input
                type="datetime-local"
                value={form.end_datetime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_datetime: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              location
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
              />
            </label>

            <label>
              visibility
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    visibility: event.target.value as VisibilityType,
                  }))
                }
              >
                <option value="private">private</option>
                <option value="company">company</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={(event) =>
                  setForm((current) => ({ ...current, all_day: event.target.checked }))
                }
              />
              all_day
            </label>

            <div className="action-row">
              <button type="button" onClick={() => void handleCreateSchedule()}>
                POST /schedules
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void handleUpdateSchedule()}
              >
                PATCH /schedules/{'{scheduleId}'}
              </button>
            </div>
          </div>
        </article>

        <article className="panel">
          <h3>일정 목록</h3>

          {loading && schedules.length === 0 ? (
            <LoadingState
              title="일정 목록 로딩 중"
              description="캘린더 일정을 조회하고 있습니다."
            />
          ) : null}

          {!loading && loadError && schedules.length === 0 ? (
            <ErrorState description={loadError} onRetry={() => void fetchSchedules()} />
          ) : null}

          {!loading && !loadError && schedules.length === 0 ? (
            <EmptyState description="아직 등록된 일정이 없습니다." />
          ) : null}

          {schedules.length > 0 ? (
            <ul className="list">
              {schedules.map((schedule) => (
                <li key={schedule.schedule_id}>
                  <div className="list-head">
                    <strong>
                      #{schedule.schedule_id} {schedule.title}
                    </strong>
                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setSelectedScheduleId(schedule.schedule_id)
                          setForm((current) => ({
                            ...current,
                            title: schedule.title,
                            description: schedule.description ?? '',
                            schedule_type: schedule.schedule_type,
                            start_datetime: toDateTimeLocalValue(schedule.start_datetime),
                            end_datetime: toDateTimeLocalValue(schedule.end_datetime),
                            location: schedule.location ?? '',
                            all_day: schedule.all_day,
                            visibility: schedule.visibility,
                          }))
                        }}
                      >
                        수정 대상 선택
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void handleDeleteSchedule(schedule.schedule_id)}
                      >
                        DELETE /schedules/{'{scheduleId}'}
                      </button>
                    </div>
                  </div>
                  <p className="helper-text">
                    {schedule.start_datetime} - {schedule.end_datetime ?? 'N/A'}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="helper-text">
            선택된 schedule_id: {selectedScheduleId ?? '없음'}
          </p>
        </article>
      </section>
    </section>
  )
}
