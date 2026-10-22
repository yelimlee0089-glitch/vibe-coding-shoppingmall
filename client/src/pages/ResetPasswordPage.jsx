import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import FormField from '@/components/auth/FormField'
import styles from '@/components/auth/AuthForm.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

// 메일의 재설정 링크(/reset-password?token=...)로 들어오는 페이지
function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const { user, logout } = useAuth()
  const [form, setForm] = useState({ password: '', passwordConfirm: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.password) nextErrors.password = '새 비밀번호를 입력해 주세요.'
    if (form.passwordConfirm !== form.password) nextErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const { message } = await resetPassword(token, form.password)
      // 비밀번호가 바뀌면 기존 로그인은 모두 무효 → 화면의 로그인 상태도 정리
      if (user) await logout().catch(() => {})
      toast.show(message)
      navigate('/login', { replace: true })
    } catch (err) {
      setSubmitError(err.message)
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.description}>재설정 링크가 올바르지 않습니다. 메일의 링크를 다시 눌러 주세요.</p>
          <Link to="/forgot-password" className={styles.submit}>
            재설정 링크 다시 받기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.description}>새로 사용할 비밀번호를 입력해 주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="password"
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <FormField
            id="passwordConfirm"
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={handleChange}
            error={errors.passwordConfirm}
          />

          {submitError && (
            <div className={styles.submitError} role="alert">
              <p className={styles.alertText}>{submitError}</p>
              <Link to="/forgot-password" className={styles.alertLink}>
                재설정 링크 다시 받기
              </Link>
            </div>
          )}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ResetPasswordPage
