import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import FormField from '@/components/auth/FormField'
import styles from '@/components/auth/AuthForm.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

function validate(form) {
  const errors = {}
  if (!form.email.trim()) errors.email = '이메일을 입력해 주세요.'
  if (!form.password) errors.password = '비밀번호를 입력해 주세요.'
  return errors
}

function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const toast = useToast()
  const location = useLocation()
  // 로그인이 필요한 페이지에서 넘어왔다면 그 페이지로, 아니면 홈으로
  const redirectTo = location.state?.from ?? '/'
  // 회원가입 직후 넘어온 경우 이메일을 미리 채워 줌
  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    if (submitError) setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      // 성공하면 user 가 채워지고, 아래 <Navigate> 가 이동을 처리함
      const loggedInUser = await login({ email: form.email.trim(), password: form.password })
      toast.show(`${loggedInUser.name}님 환영합니다`)
    } catch (err) {
      setSubmitError(err.message)
      setForm((prev) => ({ ...prev, password: '' }))
      setIsSubmitting(false)
    }
  }

  // 로그인 상태 확인이 끝나기 전에는 폼이 깜빡이지 않도록 아무것도 그리지 않음
  if (isLoading) return null
  // 이미 로그인했거나 방금 로그인에 성공한 경우
  if (user) return <Navigate to={redirectTo} replace />

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.description}>이메일과 비밀번호로 로그인해 주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="이메일"
            type="email"
            autoComplete="email"
            autoFocus={!form.email}
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <FormField
            id="password"
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus={Boolean(form.email)}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            action={
              <button
                type="button"
                className={styles.inputAction}
                aria-pressed={showPassword}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            }
          />

          {submitError && (
            <p className={styles.submitError} role="alert">
              {submitError}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
          <Link to="/forgot-password" className={styles.forgotLink}>
            비밀번호를 잊으셨나요?
          </Link>
        </form>

        <p className={styles.divider}>아직 회원이 아니신가요?</p>
        <Link to="/signup" className={styles.secondary}>
          회원가입
        </Link>
      </div>
    </section>
  )
}

export default LoginPage
