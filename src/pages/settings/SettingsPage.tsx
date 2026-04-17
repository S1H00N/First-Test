import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { categoriesApi, remindersApi } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/states'
import { useApiError } from '../../hooks/useApiError'
import type { Category, CategoryType, Reminder, ReminderType } from '../../types/flowra'

const categoryTypeOptions: CategoryType[] = ['task', 'schedule', 'memo']
const reminderTypeOptions: ReminderType[] = ['push', 'in_app', 'email']

const toIsoDateTime = (localDateTime: string): string | null => {
  if (!localDateTime) {
    return null
  }

  const parsedDate = new Date(localDateTime)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

export function SettingsPage() {
  const { handleApiError } = useApiError()

  const [categories, setCategories] = useState<Category[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#4F46E5')
  const [categoryType, setCategoryType] = useState<CategoryType>('task')

  const [targetType, setTargetType] = useState<'schedule' | 'task'>('task')
  const [targetId, setTargetId] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [reminderType, setReminderType] = useState<ReminderType>('push')

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('카테고리/알림 데이터를 조회해 주세요.')

  const loadSettingsData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setLoadError(null)

    try {
      // TODO(Settings): GET /categories
      // TODO(Settings): GET /reminders
      const [categoryResponse, reminderResponse] = await Promise.all([
        categoriesApi.list(),
        remindersApi.list(),
      ])

      setCategories(categoryResponse.items)
      setReminders(reminderResponse.items)
      setMessage('카테고리/알림 목록 조회 성공')
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '설정 데이터 조회 실패',
        fallbackMessage: '카테고리/알림 목록 조회 중 오류가 발생했습니다.',
      })

      setLoadError(parsedError.message)
      setMessage(`설정 데이터 조회 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }, [handleApiError])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSettingsData()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [loadSettingsData])

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setLoading(true)

    try {
      // TODO(Settings): POST /categories
      await categoriesApi.create({
        name: categoryName,
        color: categoryColor,
        type: categoryType,
      })

      setCategoryName('')
      setMessage('카테고리 생성 성공')
      await loadSettingsData()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '카테고리 생성 실패',
        fallbackMessage: '카테고리 생성 중 오류가 발생했습니다.',
      })
      setMessage(`카테고리 생성 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReminder = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const parsedTargetId = Number(targetId)
    const remindAtIso = toIsoDateTime(remindAt)

    if (!Number.isFinite(parsedTargetId) || !remindAtIso) {
      setMessage('target_id와 remind_at을 확인해 주세요.')
      return
    }

    setLoading(true)

    try {
      // TODO(Settings): POST /reminders
      await remindersApi.create({
        target_type: targetType,
        target_id: parsedTargetId,
        remind_at: remindAtIso,
        reminder_type: reminderType,
      })

      setMessage('알림 생성 성공')
      setTargetId('')
      setRemindAt('')
      await loadSettingsData()
    } catch (error) {
      const parsedError = handleApiError(error, {
        title: '알림 생성 실패',
        fallbackMessage: '알림 생성 중 오류가 발생했습니다.',
      })
      setMessage(`알림 생성 실패: ${parsedError.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section">
      <header className="page-header">
        <h2>Settings</h2>
        <p>카테고리와 알림 관리 API를 연결하는 설정 화면입니다.</p>
      </header>

      <p className="helper-text">{loading ? '요청 중...' : message}</p>

      {loading && categories.length === 0 && reminders.length === 0 ? (
        <LoadingState
          title="설정 데이터 로딩 중"
          description="카테고리 및 알림 목록을 조회하고 있습니다."
        />
      ) : null}

      {!loading && loadError && categories.length === 0 && reminders.length === 0 ? (
        <ErrorState description={loadError} onRetry={() => void loadSettingsData()} />
      ) : null}

      <section className="grid-2">
        <article className="panel">
          <h3>카테고리 관리</h3>
          <form className="form-grid" onSubmit={handleCreateCategory}>
            <label>
              name
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                required
              />
            </label>
            <label>
              color
              <input
                value={categoryColor}
                onChange={(event) => setCategoryColor(event.target.value)}
                required
              />
            </label>
            <label>
              type
              <select
                value={categoryType}
                onChange={(event) =>
                  setCategoryType(event.target.value as CategoryType)
                }
              >
                {categoryTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              POST /categories
            </button>
          </form>

          {categories.length === 0 ? (
            <EmptyState description="아직 등록된 카테고리가 없습니다." />
          ) : (
            <ul className="list">
              {categories.map((category) => (
                <li key={category.category_id}>
                  <div className="list-head">
                    <strong>#{category.category_id}</strong>
                    <span>{category.type}</span>
                  </div>
                  <p className="helper-text">
                    {category.name} / {category.color}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>알림 관리</h3>
          <form className="form-grid" onSubmit={handleCreateReminder}>
            <label>
              target_type
              <select
                value={targetType}
                onChange={(event) =>
                  setTargetType(event.target.value as 'schedule' | 'task')
                }
              >
                <option value="task">task</option>
                <option value="schedule">schedule</option>
              </select>
            </label>
            <label>
              target_id
              <input
                type="number"
                min={1}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                required
              />
            </label>
            <label>
              remind_at
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(event) => setRemindAt(event.target.value)}
                required
              />
            </label>
            <label>
              reminder_type
              <select
                value={reminderType}
                onChange={(event) =>
                  setReminderType(event.target.value as ReminderType)
                }
              >
                {reminderTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              POST /reminders
            </button>
          </form>

          {reminders.length === 0 ? (
            <EmptyState description="등록된 알림이 없습니다." />
          ) : (
            <ul className="list">
              {reminders.map((reminder) => (
                <li key={reminder.reminder_id}>
                  <div className="list-head">
                    <strong>#{reminder.reminder_id}</strong>
                    <span>{reminder.reminder_type}</span>
                  </div>
                  <p className="helper-text">
                    {reminder.target_type} / {reminder.target_id} / {reminder.remind_at}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <div className="action-row">
        <button type="button" className="secondary" onClick={() => void loadSettingsData()}>
          GET /categories + GET /reminders
        </button>
      </div>
    </section>
  )
}
