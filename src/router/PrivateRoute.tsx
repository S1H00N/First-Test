import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth'
import { LoadingState } from '../components/states'

export function PrivateRoute() {
  const { status, logoutReasonMessage } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <LoadingState
        title="인증 확인 중"
        description="사용자 인증 상태를 확인하고 있습니다."
      />
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          logoutReason: logoutReasonMessage,
        }}
      />
    )
  }

  return <Outlet />
}
