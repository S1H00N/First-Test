import './states.css'

interface EmptyStateProps {
  title?: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title = '아직 데이터가 없습니다',
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="state-card state-empty">
      <div className="state-icon" aria-hidden="true">
        ☐
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="state-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
