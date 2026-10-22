import { useState } from 'react'
import ImageUploadField from './ImageUploadField'
import { EMPTY_PRODUCT_FORM } from './productFormValues'
import styles from './Admin.module.css'

// 서버 Product 모델과 같은 값·규칙
const CATEGORIES = ['Apparel', 'Accessories', 'Meditation', 'Books&Journals']
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL']
const SKU_PATTERN = /^[A-Z0-9-]{3,32}$/

function validate(form) {
  const errors = {}
  const sku = form.sku.trim().toUpperCase()
  if (!sku) errors.sku = 'SKU를 입력해 주세요.'
  else if (!SKU_PATTERN.test(sku)) errors.sku = 'SKU는 영문, 숫자, 하이픈(-)으로 3~32자여야 합니다.'

  if (!form.name.trim()) errors.name = '상품명을 입력해 주세요.'

  if (form.price === '') errors.price = '가격을 입력해 주세요.'
  else if (!Number.isInteger(Number(form.price)) || Number(form.price) < 0)
    errors.price = '가격은 0 이상의 정수로 입력해 주세요.'

  if (!form.category) errors.category = '카테고리를 선택해 주세요.'

  if (!form.imageUrl) errors.imageUrl = '상품 이미지를 업로드해 주세요.'

  return errors
}

function toPayload(form) {
  return {
    sku: form.sku.trim().toUpperCase(),
    name: form.name.trim(),
    price: Number(form.price),
    category: form.category,
    sizes: form.sizes,
    imageUrl: form.imageUrl,
    imagePublicId: form.imagePublicId,
    description: form.description.trim(),
  }
}

/**
 * 상품 등록·수정 공통 폼
 * - onSubmit(payload): 서버 요청 (실패 시 에러를 던지면 폼에 표시)
 * - resetOnSuccess: 등록 페이지처럼 성공 후 폼을 비울지
 */
function ProductForm({ initialValues = EMPTY_PRODUCT_FORM, onSubmit, submitLabel, submittingLabel, resetOnSuccess, secondaryAction }) {
  const [form, setForm] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearError = (name) => {
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    clearError(name)
  }

  // 사이즈는 의류(Apparel)에만 해당하므로 다른 카테고리를 고르면 비움
  const handleCategoryChange = (event) => {
    const category = event.target.value
    setForm((prev) => ({ ...prev, category, sizes: category === 'Apparel' ? prev.sizes : [] }))
    clearError('category')
  }

  // 위젯 업로드가 끝나면 주소와 public_id 를 함께 저장 (미리보기는 imageUrl 로 표시)
  const handleImageChange = ({ imageUrl, imagePublicId }) => {
    setForm((prev) => ({ ...prev, imageUrl, imagePublicId }))
    clearError('imageUrl')
  }

  const toggleSize = (size) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : SIZE_OPTIONS.filter((s) => s === size || prev.sizes.includes(s)),
    }))
  }

  const reset = () => {
    setForm(initialValues)
    setErrors({})
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit(toPayload(form))
      if (resetOnSuccess) reset()
    } catch (err) {
      // SKU 중복(409)은 SKU 칸 아래에 바로 보여줌
      if (/sku/i.test(err.message)) setErrors((prev) => ({ ...prev, sku: '이미 등록된 SKU입니다.' }))
      else setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const field = (name) => ({
    id: `product-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `product-${name}-error` : undefined,
  })
  const fieldError = (name) =>
    errors[name] && (
      <p id={`product-${name}-error`} className={styles.fieldError}>
        {errors[name]}
      </p>
    )

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formCols}>
        <div className={styles.formRow}>
          <label htmlFor="product-sku">SKU (상품 ID)</label>
          <input
            {...field('sku')}
            placeholder="예: APP-JOG-001"
            autoCapitalize="characters"
            spellCheck={false}
            className={styles.uppercaseInput}
          />
          <p className={styles.hint}>영문·숫자·하이픈, 다른 상품과 겹치지 않게</p>
          {fieldError('sku')}
        </div>
        <div className={styles.formRow}>
          <label htmlFor="product-price">가격 (원)</label>
          <input {...field('price')} type="number" min="0" step="1000" inputMode="numeric" />
          {fieldError('price')}
        </div>
      </div>

      <div className={styles.formRow}>
        <label htmlFor="product-name">상품명</label>
        <input {...field('name')} placeholder="예: Wide jogger pants_Navy" />
        <p className={styles.hint}>이름 끝에 "_색상"을 붙이면 메인 화면에서 그 색으로 보여요.</p>
        {fieldError('name')}
      </div>

      <fieldset
        className={styles.fieldset}
        aria-invalid={Boolean(errors.category)}
        aria-describedby={errors.category ? 'product-category-error' : undefined}
      >
        <legend>카테고리</legend>
        <div className={styles.chips}>
          {CATEGORIES.map((category) => (
            <label key={category} className={styles.radioChip}>
              <input
                type="radio"
                name="category"
                value={category}
                checked={form.category === category}
                onChange={handleCategoryChange}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
        {fieldError('category')}
      </fieldset>

      {form.category === 'Apparel' && (
        <fieldset className={styles.fieldset}>
          <legend>
            사이즈 <span className={styles.muted}>(선택)</span>
          </legend>
          <div className={styles.chips}>
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                className={styles.chip}
                aria-pressed={form.sizes.includes(size)}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <ImageUploadField value={form.imageUrl} onChange={handleImageChange} error={errors.imageUrl} />

      <div className={styles.formRow}>
        <label htmlFor="product-description">
          상품 설명 <span className={styles.muted}>(선택)</span>
        </label>
        <textarea {...field('description')} rows={4} />
      </div>

      {submitError && (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      )}

      <div className={styles.formActions}>
        {secondaryAction ?? (
          <button type="button" className={styles.secondaryButton} onClick={reset}>
            초기화
          </button>
        )}
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default ProductForm
