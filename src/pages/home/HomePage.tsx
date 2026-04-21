import { type KeyboardEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { briefingsApi, usersApi } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useApiError } from '../../hooks/useApiError'
import { TASK_PRIORITY, TASK_STATUS } from '../../types/enum'
import type { TodayBriefing, UserProfile } from '../../types/flowra'

const formatScheduleTime = (isoDateTime: string): string => {
  const parsed = new Date(isoDateTime)

  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime
  }

  return parsed.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toQueryDate = (isoDateTime?: string): string => {
  if (isoDateTime) {
    const parsed = new Date(isoDateTime)

    if (!Number.isNaN(parsed.getTime())) {
      const offsetMilliseconds = parsed.getTimezoneOffset() * 60_000
      return new Date(parsed.getTime() - offsetMilliseconds).toISOString().slice(0, 10)
    }

    const fallbackDate = isoDateTime.slice(0, 10)

    if (/^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
      return fallbackDate
    }
  }

  const now = new Date()
  const offsetMilliseconds = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10)
}

const todoStatusQuery = `${TASK_STATUS.TODO},${TASK_STATUS.IN_PROGRESS}`
const todoPriorityQuery = `${TASK_PRIORITY.URGENT},${TASK_PRIORITY.HIGH}`

export function HomePage() {
  const navigate = useNavigate()
  const { handleApiError } = useApiError()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [briefing, setBriefing] = useState<TodayBriefing | null>(null)

  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('대시보드 데이터를 조회해 주세요.')

  const loadDashboard = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)

    try {
      // 화면별 연결 API 규칙: Home 진입 시 users/me + briefings/today 병렬 호출
      const [me, todayBriefing] = await Promise.all([
        usersApi.getMe(),
        briefingsApi.getToday(),
      ])

      setProfile(me)
      setBriefing(todayBriefing)
      setStatusMessage('대시보드 데이터 조회 성공')
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '홈 대시보드 조회 실패',
        fallbackMessage: '홈 데이터를 불러오는 중 오류가 발생했습니다.',
      })

      setProfile(null)
      setBriefing(null)
      setLoadError(parsedError.message)
      setStatusMessage(`대시보드 데이터 조회 실패: ${parsedError.message}`)
    } finally {
      setHasLoaded(true)
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [loadDashboard])

  const showInitialSpinner = loading && !hasLoaded
  const todaySchedules = briefing?.today_schedules ?? []
  const priorityTasks = briefing?.priority_tasks ?? []
  const unfinishedTaskCount = briefing?.unfinished_tasks ?? 0
  const aiSummary = briefing?.ai_summary.trim() ?? ''
  const greetingName = profile?.name?.trim() || '사용자'

  const schedulePreview = todaySchedules.slice(0, 4)
  const priorityTaskPreview = priorityTasks.slice(0, 4)

  const goToCalendar = (): void => {
    const targetDate = toQueryDate(schedulePreview[0]?.start_datetime)
    navigate(`/calendar?start_date=${targetDate}&view=day`)
  }

  const goToCalendarByDate = (isoDateTime: string): void => {
    const targetDate = toQueryDate(isoDateTime)
    navigate(`/calendar?start_date=${targetDate}&view=day`)
  }

  const goToTodoByStatus = (): void => {
    navigate(`/todo?status=${encodeURIComponent(todoStatusQuery)}`)
  }

  const goToTodoByPriority = (): void => {
    navigate(`/todo?priority=${encodeURIComponent(todoPriorityQuery)}`)
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    move: () => void,
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    move()
  }

  return (
    <section className="page-section home-page">
      <header className="page-header">
        <h2>Home</h2>
        <p>홈 진입 시 내 정보와 오늘 브리핑을 병렬로 조회하는 대시보드입니다.</p>
      </header>

      <article className="panel">
        <h3>대시보드 상태</h3>
        <p className="helper-text">
          {loading
            ? '대시보드 데이터를 새로 불러오는 중입니다.'
            : statusMessage}
        </p>
        <div className="action-row">
          <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
            대시보드 새로고침
          </button>
        </div>
      </article>

      {showInitialSpinner ? (
        <LoadingState
          title="홈 데이터 로딩 중"
          description="내 정보와 오늘 브리핑을 병렬 조회 중입니다."
        />
      ) : null}

      {!loading && loadError ? (
        <ErrorState
          description={loadError}
          onRetry={() => void loadDashboard()}
        />
      ) : null}

      {!loading && !loadError && profile && briefing ? (
        <>
          <article className="panel home-hero-panel">
            <div className="home-greeting-block">
              <p className="home-kicker">{briefing.date} Daily Briefing</p>
              <h3 className="home-greeting-title">{greetingName}님, 안녕하세요!</h3>
              <p className="helper-text">
                오늘의 일정과 우선순위 할 일을 먼저 확인해 보세요.
              </p>
            </div>

            <aside className="home-ai-summary-card" aria-label="AI 요약">
              <p className="home-ai-summary-kicker">AI 요약</p>
              <p className="home-ai-summary-text">
                {aiSummary || '오늘의 AI 요약이 아직 준비되지 않았습니다.'}
              </p>
            </aside>
          </article>

          <section className="home-widget-grid" aria-label="홈 대시보드 위젯">
            <article
              className="panel home-widget-panel home-widget-link"
              role="button"
              tabIndex={0}
              onClick={goToCalendar}
              onKeyDown={(event) => handleCardKeyDown(event, goToCalendar)}
              aria-label="오늘 일정 전체 보기로 이동"
            >
              <div className="home-widget-head">
                <h3>오늘 일정</h3>
                <div className="home-widget-head-actions">
                  <p className="home-widget-count">{todaySchedules.length}건</p>
                  <button
                    type="button"
                    className="home-widget-link-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      goToCalendar()
                    }}
                  >
                    전체보기
                  </button>
                </div>
              </div>

              {todaySchedules.length === 0 ? (
                <EmptyState
                  description="오늘 예정된 일정이 없습니다."
                  actionLabel="캘린더 이동"
                  onAction={goToCalendar}
                />
              ) : (
                <ul className="home-widget-list">
                  {schedulePreview.map((schedule) => (
                    <li key={schedule.schedule_id} className="home-widget-list-item home-timeline-item">
                      <span className="home-widget-timeline-dot" aria-hidden="true" />
                      <button
                        type="button"
                        className="home-widget-row-button home-widget-timeline-content"
                        onClick={(event) => {
                          event.stopPropagation()
                          goToCalendarByDate(schedule.start_datetime)
                        }}
                      >
                        <span className="home-widget-meta">
                          {formatScheduleTime(schedule.start_datetime)}
                        </span>
                        <strong>{schedule.title}</strong>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article
              className="panel home-widget-panel home-widget-focus"
              aria-label="할 일 요약 위젯"
            >
              <div className="home-widget-head">
                <h3>우선순위 높은 할 일</h3>
                <div className="home-widget-head-actions">
                  <p className="home-widget-count">{priorityTasks.length}건</p>
                  <button
                    type="button"
                    className="home-widget-link-button"
                    onClick={goToTodoByPriority}
                  >
                    전체보기
                  </button>
                </div>
              </div>

              <div className="home-todo-stat-grid">
                <button
                  type="button"
                  className="home-todo-stat-card home-todo-stat-button"
                  onClick={goToTodoByStatus}
                >
                  <p>미완료 할 일</p>
                  <strong>{unfinishedTaskCount}건</strong>
                  <span>해야 할 일만 보기</span>
                </button>
                <button
                  type="button"
                  className="home-todo-stat-card home-todo-stat-button"
                  onClick={goToTodoByPriority}
                >
                  <p>우선순위 항목</p>
                  <strong>{priorityTasks.length}건</strong>
                  <span>중요 항목만 보기</span>
                </button>
              </div>

              {priorityTasks.length === 0 ? (
                <EmptyState
                  description="우선순위 높은 할 일이 없습니다."
                  actionLabel="TODO 이동"
                  onAction={goToTodoByPriority}
                />
              ) : (
                <ul className="home-widget-list">
                  {priorityTaskPreview.map((task) => (
                    <li key={task.task_id} className="home-widget-list-item">
                      <button
                        type="button"
                        className="home-widget-row-button"
                        onClick={goToTodoByPriority}
                      >
                        <span className="home-widget-priority">{task.priority}</span>
                        <strong>{task.title}</strong>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      ) : null}
    </section>
  )
}
