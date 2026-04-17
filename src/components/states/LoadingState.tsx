import './states.css'

interface LoadingStateProps {
  title?: string
  description?: string
}

export function LoadingState({
  title = '불러오는 중',
  description = '데이터를 가져오고 있습니다.',
}: LoadingStateProps) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  )
}
