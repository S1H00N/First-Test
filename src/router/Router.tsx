import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '../auth'
import { API_BASE_URL } from '../api'
import { ToastProvider } from '../components/toast'
import { AuthPage } from '../pages/auth'
import { CalendarPage } from '../pages/calendar'
import { HomePage } from '../pages/home'
import { MemoPage } from '../pages/memo'
import { SettingsPage } from '../pages/settings'
import { TodoPage } from '../pages/todo'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'

const publicNavItems = [
  { to: '/auth/login', label: 'Login' },
  { to: '/auth/signup', label: 'Signup' },
] as const

const privateNavItems = [
  { to: '/home', label: 'Home' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/todo', label: 'Todo' },
  { to: '/memo', label: 'Memo' },
  { to: '/settings', label: 'Settings' },
] as const

function RouterContent() {
  const { isAuthenticated, signOut, user } = useAuth()

  const navItems = isAuthenticated ? privateNavItems : publicNavItems

  return (
    <div className="app-layout">
      <header className="app-topbar">
        <div className="brand-block">
          <p className="brand-kicker">Flowra P0 Routing</p>
          <p className="brand-title">Domain-Based Frontend Workspace</p>
          <p className="brand-copy">
            화면별 연결 API 규칙을 반영한 초기 라우팅 구조입니다. Base URL:
            {' '}
            {API_BASE_URL}
          </p>
          {isAuthenticated ? (
            <p className="helper-text">접속 사용자: {user?.name ?? user?.email ?? '인증됨'}</p>
          ) : null}
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <button type="button" className="app-nav-link" onClick={signOut}>
              Logout
            </button>
          ) : null}
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? '/home' : '/auth/login'} replace />}
          />

          <Route element={<PublicRoute />}>
            <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<AuthPage defaultTab="login" />} />
            <Route path="/auth/signup" element={<AuthPage defaultTab="signup" />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/memo" element={<MemoPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/home' : '/auth/login'} replace />}
          />
        </Routes>
      </main>
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <RouterContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
