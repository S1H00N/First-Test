import { useCallback, useEffect, useState } from 'react'

import { briefingsApi, usersApi } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useApiError } from '../../hooks/useApiError'
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

export function HomePage() {
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
            <article className="panel home-widget-panel">
              <div className="home-widget-head">
                <h3>오늘 일정</h3>
                <p className="home-widget-count">{todaySchedules.length}건</p>
              </div>

              {todaySchedules.length === 0 ? (
                <EmptyState description="오늘 예정된 일정이 없습니다." />
              ) : (
                <ul className="home-widget-list">
                  {schedulePreview.map((schedule) => (
                    <li key={schedule.schedule_id} className="home-widget-list-item">
                      <span className="home-widget-meta">
                        {formatScheduleTime(schedule.start_datetime)}
                      </span>
                      <strong>{schedule.title}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel home-widget-panel">
              <div className="home-widget-head">
                <h3>우선순위 높은 할 일</h3>
                <p className="home-widget-count">{priorityTasks.length}건</p>
              </div>

              {priorityTasks.length === 0 ? (
                <EmptyState description="우선순위 높은 할 일이 없습니다." />
              ) : (
                <ul className="home-widget-list">
                  {priorityTaskPreview.map((task) => (
                    <li key={task.task_id} className="home-widget-list-item">
                      <span className="home-widget-priority">{task.priority}</span>
                      <strong>{task.title}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel home-widget-panel home-widget-focus">
              <div className="home-widget-head">
                <h3>미완료 할 일</h3>
              </div>
              <p className="home-widget-big-number">{unfinishedTaskCount}</p>
              <p className="helper-text">오늘 기준 아직 완료하지 않은 할 일 수입니다.</p>
            </article>
          </section>
        </>
      ) : null}
    </section>
  )
}
