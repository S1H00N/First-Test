import './states.css'

interface ErrorStateProps {
  title?: string
  description: string
  retryLabel?: string
  onRetry?: () => void
}

export function ErrorState({
  title = '문제가 발생했습니다',
  description,
  retryLabel = '다시 시도',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-card state-error" role="alert">
      <div className="state-icon" aria-hidden="true">
        !
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
      {onRetry ? (
        <button type="button" className="state-action" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
