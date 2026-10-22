import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUser } from '@/api/users'
import FormField from '@/components/auth/FormField'
import styles from '@/components/auth/AuthForm.module.css'

// 서버의 User 모델 / userController(CREATE_FIELDS)와 같은 필드·규칙 사용
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const initialForm = {
  email: '',
  name: '',
  password: '',
  passwordConfirm: '',
  address: '',
}

function validate(form) {
  const errors = {}
  if (!form.email.trim()) errors.email = '이메일은 필수입니다.'
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = '올바른 이메일 형식이 아닙니다.'

  if (!form.name.trim()) errors.name = '이름은 필수입니다.'

  if (!form.password) errors.password = '비밀번호는 필수입니다.'

  if (form.passwordConfirm !== form.password) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'

  return errors
}

function SignupPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const user = await createUser({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        address: form.address.trim(),
      })
      setCreatedUser(user)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdUser) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Welcome</h1>
          <p className={styles.description}>
            {createdUser.name}님, 회원가입이 완료되었습니다.
          </p>
          <Link to="/login" state={{ email: createdUser.email }} className={styles.submit}>
            로그인하기
          </Link>
          <Link to="/" className={`${styles.secondary} ${styles.spaced}`}>
            쇼핑 계속하기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.description}>회원 정보를 입력해 주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="이메일"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <FormField
            id="name"
            label="이름"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <FormField
            id="password"
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <FormField
            id="passwordConfirm"
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={handleChange}
            error={errors.passwordConfirm}
          />
          <FormField
            id="address"
            label="주소"
            optional
            autoComplete="street-address"
            value={form.address}
            onChange={handleChange}
          />

          {submitError && (
            <p className={styles.submitError} role="alert">
              {submitError}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className={styles.divider}>이미 회원이신가요?</p>
        <Link to="/login" className={styles.secondary}>
          로그인
        </Link>
      </div>
    </section>
  )
}

export default SignupPage
