import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { tasksApi } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useApiError } from '../../hooks/useApiError'
import { TASK_PRIORITY, TASK_STATUS } from '../../types/enum'
import type { Task, TaskPriority, TaskStatus } from '../../types/flowra'

const taskStatusValues = Object.values(TASK_STATUS) as TaskStatus[]
const taskPriorityValues = Object.values(TASK_PRIORITY) as TaskPriority[]

const normalizeCsvFilter = <T extends string>(
  rawValue: string | null,
  validValues: readonly T[],
): string => {
  if (!rawValue) {
    return ''
  }

  const validSet = new Set(validValues)
  const normalized = rawValue
    .split(',')
    .map((token) => token.trim())
    .filter((token): token is T => validSet.has(token as T))

  if (normalized.length === 0) {
    return ''
  }

  return Array.from(new Set(normalized)).join(',')
}

export function TodoPage() {
  const { handleApiError } = useApiError()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState<number>(1)
  const [size, setSize] = useState<number>(20)
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    normalizeCsvFilter(searchParams.get('status'), taskStatusValues),
  )
  const [priorityFilter, setPriorityFilter] = useState<string>(() =>
    normalizeCsvFilter(searchParams.get('priority'), taskPriorityValues),
  )

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('할 일 목록을 조회해 주세요.')

  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)

    try {
      // TODO(Todo): GET /tasks
      const response = await tasksApi.list({
        page,
        size,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      })

      setTasks(response.items)
      setMessage('할 일 목록 조회 성공')
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '할 일 목록 조회 실패',
        fallbackMessage: '할 일 목록을 불러오는 중 오류가 발생했습니다.',
      })
      setLoadError(parsedError.message)
      setMessage(`할 일 목록 조회 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }, [handleApiError, page, priorityFilter, size, statusFilter])

  const applyTodoQuery = useCallback(
    (nextStatusFilter: string, nextPriorityFilter: string): void => {
      const params = new URLSearchParams(searchParams)

      if (nextStatusFilter) {
        params.set('status', nextStatusFilter)
      } else {
        params.delete('status')
      }

      if (nextPriorityFilter) {
        params.set('priority', nextPriorityFilter)
      } else {
        params.delete('priority')
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchTasks()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [fetchTasks])

  const handleComplete = async (taskId: number): Promise<void> => {
    setLoading(true)

    try {
      // TODO(Todo): PATCH /tasks/{taskId}/complete
      await tasksApi.complete(taskId)
      setMessage(`할 일 완료 처리 성공 (task_id: ${taskId})`)
      await fetchTasks()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '할 일 완료 처리 실패',
        fallbackMessage: '완료 처리 중 오류가 발생했습니다.',
      })
      setMessage(`할 일 완료 처리 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (
    taskId: number,
    nextStatus: TaskStatus,
  ): Promise<void> => {
    setLoading(true)

    try {
      // TODO(Todo): PATCH /tasks/{taskId}/status
      await tasksApi.changeStatus(taskId, {
        status: nextStatus,
      })
      setMessage(`할 일 상태 변경 성공 (task_id: ${taskId}, status: ${nextStatus})`)
      await fetchTasks()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '할 일 상태 변경 실패',
        fallbackMessage: '할 일 상태 변경 중 오류가 발생했습니다.',
      })
      setMessage(`할 일 상태 변경 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section">
      <header className="page-header">
        <h2>Todo</h2>
        <p>목록 조회, 완료 처리, 상태 변경 API를 반영한 Todo 화면입니다.</p>
      </header>

      <article className="panel">
        <h3>조회 필터</h3>
        <div className="inline-field">
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

          <label>
            status
            <select
              value={statusFilter}
              onChange={(event) => {
                const nextStatusFilter = normalizeCsvFilter(
                  event.target.value,
                  taskStatusValues,
                )
                setStatusFilter(nextStatusFilter)
                applyTodoQuery(nextStatusFilter, priorityFilter)
              }}
            >
              <option value="">all</option>
              <option value="todo,in_progress">todo,in_progress</option>
              {Object.values(TASK_STATUS).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            priority
            <select
              value={priorityFilter}
              onChange={(event) => {
                const nextPriorityFilter = normalizeCsvFilter(
                  event.target.value,
                  taskPriorityValues,
                )
                setPriorityFilter(nextPriorityFilter)
                applyTodoQuery(statusFilter, nextPriorityFilter)
              }}
            >
              <option value="">all</option>
              <option value="urgent,high">urgent,high</option>
              {Object.values(TASK_PRIORITY).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="secondary" onClick={() => void fetchTasks()}>
            GET /tasks
          </button>
        </div>
        <p className="helper-text">{loading ? '요청 중...' : message}</p>
        <p className="helper-text">
          적용 필터: {statusFilter ? `status=${statusFilter}` : 'status=all'}
          {' / '}
          {priorityFilter ? `priority=${priorityFilter}` : 'priority=all'}
        </p>
      </article>

      <article className="panel">
        <h3>할 일 목록</h3>

        {loading && tasks.length === 0 ? (
          <LoadingState
            title="할 일 목록 로딩 중"
            description="등록된 할 일을 조회하고 있습니다."
          />
        ) : null}

        {!loading && loadError && tasks.length === 0 ? (
          <ErrorState description={loadError} onRetry={() => void fetchTasks()} />
        ) : null}

        {!loading && !loadError && tasks.length === 0 ? (
          <EmptyState description="할 일이 없습니다." />
        ) : null}

        {tasks.length > 0 ? (
          <ul className="list">
            {tasks.map((task) => (
              <li key={task.task_id}>
                <div className="list-head">
                  <strong>
                    #{task.task_id} {task.title}
                  </strong>
                  <span>{task.priority}</span>
                </div>
                <p className="helper-text">status: {task.status}</p>
                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => void handleComplete(task.task_id)}
                    disabled={loading}
                  >
                    PATCH /tasks/{'{taskId}'}/complete
                  </button>

                  <select
                    value={task.status}
                    onChange={(event) =>
                      void handleStatusChange(
                        task.task_id,
                        event.target.value as TaskStatus,
                      )
                    }
                    disabled={loading}
                  >
                    {Object.values(TASK_STATUS).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  )
}
