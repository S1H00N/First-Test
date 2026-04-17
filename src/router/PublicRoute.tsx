import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../auth'
import { LoadingState } from '../components/states'

export function PublicRoute() {
  const { status } = useAuth()

  if (status === 'checking') {
    return (
      <LoadingState
        title="인증 확인 중"
        description="접근 가능한 화면을 판단하고 있습니다."
      />
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
