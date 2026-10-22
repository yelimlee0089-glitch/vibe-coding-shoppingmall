import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '@/api/auth'
import FormField from '@/components/auth/FormField'
import styles from '@/components/auth/AuthForm.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentMessage, setSentMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) return setError('이메일을 입력해 주세요.')
    if (!EMAIL_PATTERN.test(value)) return setError('올바른 이메일 형식이 아닙니다.')

    setIsSubmitting(true)
    setSubmitError('')
    try {
      const { message } = await requestPasswordReset(value)
      setSentMessage(message)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sentMessage) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.description}>{sentMessage}</p>
          <p className={styles.description}>
            메일이 오지 않으면 스팸함을 확인하거나, 1분 뒤 다시 요청해 주세요. 링크는 30분 동안 유효합니다.
          </p>
          <Link to="/login" className={styles.submit}>
            로그인으로 돌아가기
          </Link>
          <button type="button" className={`${styles.secondary} ${styles.spaced}`} onClick={() => setSentMessage('')}>
            다시 요청하기
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.description}>가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="이메일"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            error={error}
          />

          {submitError && (
            <p className={styles.submitError} role="alert">
              {submitError}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? '보내는 중...' : '재설정 링크 받기'}
          </button>
        </form>

        <p className={styles.divider}>비밀번호가 기억나셨나요?</p>
        <Link to="/login" className={styles.secondary}>
          로그인
        </Link>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
