import { useMemo, useState } from 'react'
import {
  type SubmitErrorHandler,
  type SubmitHandler,
  useForm,
  useWatch,
} from 'react-hook-form'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth'
import { authApi } from '../../api'
import { useToast } from '../../components/toast'
import { useApiError } from '../../hooks/useApiError'
import { setAuthTokens } from '../../lib/tokenStorage'
import type { FlowraErrorCode } from '../../types/flowra'

type AuthTab = 'login' | 'signup'

interface AuthPageProps {
  defaultTab: AuthTab
}

interface LoginFormValues {
  email: string
  password: string
}

interface SignupFormValues {
  email: string
  password: string
  name: string
}

interface RedirectState {
  from?: string
  logoutReason?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const resolveRedirectPath = (candidate?: string): string => {
  if (!candidate || !candidate.startsWith('/')) {
    return '/'
  }

  if (candidate.startsWith('/auth')) {
    return '/'
  }

  return candidate
}

const resolveSignupFieldFromDetails = (
  details?: Record<string, unknown>,
): keyof SignupFormValues | null => {
  const fieldName =
    typeof details?.field === 'string' ? details.field.toLowerCase().trim() : ''

  if (fieldName === 'email' || fieldName === 'password' || fieldName === 'name') {
    return fieldName
  }

  return null
}

const getSignupValidationMessage = (
  field: keyof SignupFormValues,
): string => {
  if (field === 'email') {
    return '올바른 이메일 형식을 입력해 주세요.'
  }

  if (field === 'password') {
    return '비밀번호는 8자 이상이어야 합니다.'
  }

  return '이름은 1자 이상 30자 이하로 입력해 주세요.'
}

const normalizeErrorMessage = (message: string | undefined): string | null =>
  typeof message === 'string' && message.length > 0 ? message : null

type PasswordStrengthLevel = 'idle' | 'weak' | 'medium' | 'strong'

interface PasswordStrengthState {
  level: PasswordStrengthLevel
  label: string
  width: string
  description: string
  hasMinLength: boolean
  hasLetter: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

const getPasswordStrengthState = (password: string): PasswordStrengthState => {
  const hasMinLength = password.length >= 8
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const combinationCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length

  if (password.length === 0) {
    return {
      level: 'idle',
      label: '미입력',
      width: '0%',
      description: '8자 이상 입력 후 영문, 숫자, 특수문자를 조합해 주세요.',
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecial,
    }
  }

  if (!hasMinLength || combinationCount === 1) {
    return {
      level: 'weak',
      label: '위험',
      width: '33%',
      description: !hasMinLength
        ? '비밀번호는 8자 이상이어야 합니다.'
        : '영문, 숫자, 특수문자 중 한 가지 유형을 더 조합해 주세요.',
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecial,
    }
  }

  if (combinationCount === 2) {
    return {
      level: 'medium',
      label: '보통',
      width: '66%',
      description: '좋습니다. 한 가지 유형을 더 조합하면 더 안전해집니다.',
      hasMinLength,
      hasLetter,
      hasNumber,
      hasSpecial,
    }
  }

  return {
    level: 'strong',
    label: '안전',
    width: '100%',
    description: '권장 조건을 충족한 안전한 비밀번호입니다.',
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  }
}

interface PasswordVisibilityIconProps {
  visible: boolean
}

function PasswordVisibilityIcon({ visible }: PasswordVisibilityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="password-toggle-icon"
    >
      <path
        d="M2.2 12c1.8-3.9 5.4-6.2 9.8-6.2S20 8.1 21.8 12c-1.8 3.9-5.4 6.2-9.8 6.2S4 15.9 2.2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {visible ? null : (
        <line
          x1="5"
          y1="5"
          x2="19"
          y2="19"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function AuthPage({ defaultTab }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false)
  const [isSignupPasswordVisible, setIsSignupPasswordVisible] = useState(false)

  const { clearLogoutReasonMessage, logoutReasonMessage, refreshAuth } = useAuth()
  const { handleApiError } = useApiError()
  const { showToast } = useToast()

  const redirectState = location.state as RedirectState | undefined
  const redirectTo = resolveRedirectPath(redirectState?.from)
  const bannerMessageFromState =
    typeof redirectState?.logoutReason === 'string' &&
    redirectState.logoutReason.trim().length > 0
      ? redirectState.logoutReason
      : null
  const authAlertBannerMessage = bannerMessageFromState || logoutReasonMessage

  const loginForm = useForm<LoginFormValues>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const signupForm = useForm<SignupFormValues>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  })

  const {
    register: registerLogin,
    handleSubmit: submitLogin,
    setError: setLoginError,
    clearErrors: clearLoginErrors,
    setFocus: setLoginFocus,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = loginForm

  const {
    register: registerSignup,
    handleSubmit: submitSignup,
    setError: setSignupError,
    clearErrors: clearSignupErrors,
    control: signupControl,
    setFocus: setSignupFocus,
    formState: { errors: signupErrors, isSubmitting: isSignupSubmitting },
  } = signupForm

  const signupPasswordValue =
    useWatch({
      control: signupControl,
      name: 'password',
    }) || ''

  const loginHelpText = useMemo(() => {
    if (redirectTo !== '/') {
      return '로그인 성공 후 이전에 보던 화면으로 자동 이동합니다.'
    }

    return '로그인 성공 후 홈 대시보드로 이동합니다.'
  }, [redirectTo])

  const signupPasswordStrength = useMemo(
    () => getPasswordStrengthState(signupPasswordValue),
    [signupPasswordValue],
  )

  const showAuthToast = (
    title: string,
    message: string,
    code?: FlowraErrorCode,
  ): void => {
    showToast({
      tone: 'error',
      title,
      message,
      dedupeKey: `${title}:${code ?? 'UNKNOWN'}`,
      priority: 3,
    })
  }

  const handleLoginInvalid: SubmitErrorHandler<LoginFormValues> = (errors) => {
    const firstInvalidField = (['email', 'password'] as const).find(
      (fieldName) => errors[fieldName],
    )

    if (firstInvalidField) {
      setLoginFocus(firstInvalidField)
    }
  }

  const handleSignupInvalid: SubmitErrorHandler<SignupFormValues> = (errors) => {
    const firstInvalidField = (['name', 'email', 'password'] as const).find(
      (fieldName) => errors[fieldName],
    )

    if (firstInvalidField) {
      setSignupFocus(firstInvalidField)
    }
  }

  const handleLogin: SubmitHandler<LoginFormValues> = async (values) => {
    clearLoginErrors('root.server')

    try {
      const session = await authApi.login({
        email: values.email.trim(),
        password: values.password,
      })

      setAuthTokens(session)
      await refreshAuth()
      clearLogoutReasonMessage()
      showToast({
        tone: 'success',
        title: '로그인 성공',
        message: '요청한 화면으로 이동합니다.',
      })

      navigate(redirectTo, { replace: true })
    } catch (error) {
      const parsed = handleApiError(error, {
        title: '로그인 실패',
        fallbackMessage: '로그인 처리 중 오류가 발생했습니다.',
        showToast: false,
        dedupeKey: 'auth-login',
      })

      const message =
        parsed.code === 'UNAUTHORIZED'
          ? '이메일 또는 비밀번호가 일치하지 않습니다.'
          : parsed.message

      setLoginError('root.server', {
        type: 'server',
        message,
      })
      setLoginFocus(parsed.code === 'UNAUTHORIZED' ? 'password' : 'email')
      showAuthToast('로그인 실패', message, parsed.code)
    }
  }

  const handleSignup: SubmitHandler<SignupFormValues> = async (values) => {
    clearSignupErrors('root.server')

    try {
      const result = await authApi.signup({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
      })

      showToast({
        tone: 'success',
        title: '회원가입 완료',
        message: `${result.name}님, 로그인 후 Flowra를 시작해 보세요.`,
      })

      navigate('/auth/login', { replace: true, state: redirectState })
    } catch (error) {
      const parsed = handleApiError(error, {
        title: '회원가입 실패',
        fallbackMessage: '회원가입 처리 중 오류가 발생했습니다.',
        showToast: false,
        dedupeKey: 'auth-signup',
      })

      let message = parsed.message

      if (parsed.code === 'DUPLICATE_RESOURCE') {
        message = '이미 사용 중인 이메일입니다. 다른 이메일로 시도해 주세요.'
        setSignupError('email', {
          type: 'server',
          message,
        })
        setSignupFocus('email')
      } else if (parsed.code === 'VALIDATION_ERROR') {
        const fieldName = resolveSignupFieldFromDetails(parsed.details)

        if (fieldName) {
          message = getSignupValidationMessage(fieldName)
          setSignupError(fieldName, {
            type: 'server',
            message,
          })
          setSignupFocus(fieldName)
        }
      }

      setSignupError('root.server', {
        type: 'server',
        message,
      })
      showAuthToast('회원가입 실패', message, parsed.code)
    }
  }

  const loginServerError = normalizeErrorMessage(loginErrors.root?.server?.message)
  const signupServerError = normalizeErrorMessage(signupErrors.root?.server?.message)

  return (
    <section className="page-section auth-page">
      <header className="page-header">
        <h2>환영합니다</h2>
        <p>Flowra 계정으로 로그인하거나 새 계정을 만들어 바로 업무를 시작해 보세요.</p>
      </header>

      {defaultTab === 'login' && authAlertBannerMessage ? (
        <article className="panel auth-alert-banner" role="alert" aria-live="polite">
          <div className="auth-alert-icon" aria-hidden="true">
            !
          </div>
          <div>
            <h3>로그인이 필요합니다</h3>
            <p>{authAlertBannerMessage}</p>
          </div>
        </article>
      ) : null}

      <article className="panel auth-tabs-panel">
        <div className="auth-tab-row">
          <NavLink
            to="/auth/login"
            state={redirectState}
            className={({ isActive }) => `auth-tab-link${isActive ? ' active' : ''}`}
          >
            로그인
          </NavLink>
          <NavLink
            to="/auth/signup"
            state={redirectState}
            className={({ isActive }) => `auth-tab-link${isActive ? ' active' : ''}`}
          >
            회원가입
          </NavLink>
        </div>
      </article>

      <article className="panel auth-form-panel">
        {defaultTab === 'login' ? (
          <>
            <div className="auth-form-header">
              <h3>일반 로그인</h3>
              <p className="helper-text">이메일과 비밀번호로 안전하게 로그인하세요.</p>
              <p className="helper-text auth-redirect-hint">{loginHelpText}</p>
            </div>

            <form
              className="form-grid auth-form"
              onSubmit={submitLogin(handleLogin, handleLoginInvalid)}
              noValidate
            >
              <label className="auth-field">
                <span className="field-label">이메일</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={loginErrors.email ? 'true' : 'false'}
                  className={loginErrors.email ? 'input-error' : ''}
                  {...registerLogin('email', {
                    required: '이메일을 입력해 주세요.',
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: '올바른 이메일 형식을 입력해 주세요.',
                    },
                  })}
                />
                {loginErrors.email?.message ? (
                  <p className="field-error" role="alert">
                    {loginErrors.email.message}
                  </p>
                ) : null}
              </label>

              <label className="auth-field">
                <span className="field-label">비밀번호</span>
                <div className="password-input-wrap">
                  <input
                    type={isLoginPasswordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="8자 이상 입력"
                    aria-invalid={loginErrors.password ? 'true' : 'false'}
                    className={loginErrors.password ? 'input-error' : ''}
                    {...registerLogin('password', {
                      required: '비밀번호를 입력해 주세요.',
                      minLength: {
                        value: 8,
                        message: '비밀번호는 8자 이상이어야 합니다.',
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    aria-label={
                      isLoginPasswordVisible
                        ? '비밀번호 숨기기'
                        : '비밀번호 표시하기'
                    }
                    aria-pressed={isLoginPasswordVisible}
                    onClick={() => setIsLoginPasswordVisible((prev) => !prev)}
                  >
                    <PasswordVisibilityIcon visible={isLoginPasswordVisible} />
                  </button>
                </div>
                {loginErrors.password?.message ? (
                  <p className="field-error" role="alert">
                    {loginErrors.password.message}
                  </p>
                ) : null}
              </label>

              {loginServerError ? (
                <p className="form-error-banner" role="alert">
                  {loginServerError}
                </p>
              ) : null}

              <button type="submit" disabled={isLoginSubmitting} className="auth-submit-button">
                {isLoginSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-form-header">
              <h3>회원가입</h3>
              <p className="helper-text">
                이메일, 비밀번호, 이름 정보를 입력해 Flowra 계정을 만드세요.
              </p>
            </div>

            <form
              className="form-grid auth-form"
              onSubmit={submitSignup(handleSignup, handleSignupInvalid)}
              noValidate
            >
              <label className="auth-field">
                <span className="field-label">이름</span>
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={30}
                  placeholder="이름을 입력해 주세요"
                  aria-invalid={signupErrors.name ? 'true' : 'false'}
                  className={signupErrors.name ? 'input-error' : ''}
                  {...registerSignup('name', {
                    required: '이름을 입력해 주세요.',
                    validate: (value) => {
                      const trimmedLength = value.trim().length

                      if (trimmedLength < 1) {
                        return '이름을 입력해 주세요.'
                      }

                      if (trimmedLength > 30) {
                        return '이름은 30자 이하로 입력해 주세요.'
                      }

                      return true
                    },
                  })}
                />
                {signupErrors.name?.message ? (
                  <p className="field-error" role="alert">
                    {signupErrors.name.message}
                  </p>
                ) : null}
              </label>

              <label className="auth-field">
                <span className="field-label">이메일</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={signupErrors.email ? 'true' : 'false'}
                  className={signupErrors.email ? 'input-error' : ''}
                  {...registerSignup('email', {
                    required: '이메일을 입력해 주세요.',
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: '올바른 이메일 형식을 입력해 주세요.',
                    },
                  })}
                />
                {signupErrors.email?.message ? (
                  <p className="field-error" role="alert">
                    {signupErrors.email.message}
                  </p>
                ) : null}
              </label>

              <label className="auth-field">
                <span className="field-label">비밀번호</span>
                <div className="password-input-wrap">
                  <input
                    type={isSignupPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="8자 이상 입력"
                    aria-invalid={signupErrors.password ? 'true' : 'false'}
                    className={signupErrors.password ? 'input-error' : ''}
                    {...registerSignup('password', {
                      required: '비밀번호를 입력해 주세요.',
                      minLength: {
                        value: 8,
                        message: '비밀번호는 8자 이상이어야 합니다.',
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    aria-label={
                      isSignupPasswordVisible
                        ? '비밀번호 숨기기'
                        : '비밀번호 표시하기'
                    }
                    aria-pressed={isSignupPasswordVisible}
                    onClick={() => setIsSignupPasswordVisible((prev) => !prev)}
                  >
                    <PasswordVisibilityIcon visible={isSignupPasswordVisible} />
                  </button>
                </div>

                <div
                  className={`password-strength password-strength-${signupPasswordStrength.level}`}
                  aria-live="polite"
                >
                  <div className="password-strength-track" role="presentation">
                    <span
                      className="password-strength-fill"
                      style={{ width: signupPasswordStrength.width }}
                    />
                  </div>
                  <p className="password-strength-label">
                    비밀번호 강도: {signupPasswordStrength.label}
                  </p>
                  <p className="password-strength-description">
                    {signupPasswordStrength.description}
                  </p>
                  <div className="password-condition-list" aria-label="비밀번호 조건">
                    <span className={signupPasswordStrength.hasMinLength ? 'met' : ''}>
                      8자 이상
                    </span>
                    <span className={signupPasswordStrength.hasLetter ? 'met' : ''}>영문</span>
                    <span className={signupPasswordStrength.hasNumber ? 'met' : ''}>숫자</span>
                    <span className={signupPasswordStrength.hasSpecial ? 'met' : ''}>
                      특수문자
                    </span>
                  </div>
                </div>

                {signupErrors.password?.message ? (
                  <p className="field-error" role="alert">
                    {signupErrors.password.message}
                  </p>
                ) : null}
              </label>

              {signupServerError ? (
                <p className="form-error-banner" role="alert">
                  {signupServerError}
                </p>
              ) : null}

              <button type="submit" disabled={isSignupSubmitting} className="auth-submit-button">
                {isSignupSubmitting ? '가입 처리 중...' : '회원가입'}
              </button>
            </form>
          </>
        )}
      </article>
    </section>
  )
}
