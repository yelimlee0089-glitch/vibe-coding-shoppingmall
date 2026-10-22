import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createOrder, getPaymentConfig, payOrder } from '@/api/orders'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { PORTONE_PAY_METHODS, PORTONE_PG, requestPay, usePortone } from '@/hooks/usePortone'
import {
  FREE_SHIPPING_THRESHOLD,
  PAYMENT_METHOD_LABELS,
  calculateShippingFee,
  formatPrice,
} from '@/utils/format'
import styles from './CheckoutPage.module.css'

// 서버 Order 모델과 같은 규칙
const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/
const POSTAL_CODE_PATTERN = /^\d{5}$/
const MEMO_OPTIONS = ['', '문 앞에 놓아주세요', '경비실에 맡겨주세요', '배송 전 연락 부탁드립니다', '직접 입력']

function validate(form) {
  const errors = {}
  if (!form.recipientName.trim()) errors.recipientName = '받는 분 이름을 입력해 주세요.'
  if (!form.phone.trim()) errors.phone = '연락처를 입력해 주세요.'
  else if (!PHONE_PATTERN.test(form.phone.trim())) errors.phone = '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)'
  if (!form.postalCode.trim()) errors.postalCode = '우편번호를 입력해 주세요.'
  else if (!POSTAL_CODE_PATTERN.test(form.postalCode.trim())) errors.postalCode = '우편번호는 5자리 숫자입니다.'
  if (!form.address1.trim()) errors.address1 = '주소를 입력해 주세요.'
  if (form.memoOption === '직접 입력' && form.memo.length > 100) errors.memo = '100자까지 입력할 수 있습니다.'
  if (!form.paymentMethod) errors.paymentMethod = '결제 수단을 선택해 주세요.'
  return errors
}

// 결제창에 보일 주문명 (예: "Cork yoga mat 외 2건")
function orderName(order) {
  const [first, ...rest] = order.items
  const name = first.name.split('_')[0].trim()
  return rest.length ? `${name} 외 ${rest.length}건` : name
}

function Field({ id, label, error, optional, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (선택)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

function CheckoutPage() {
  const { user } = useAuth()
  const { cart, isLoading, refresh } = useCart()
  const navigate = useNavigate()
  // 포트원 결제 모듈 초기화 (IMP.init)
  const { IMP, isReady: isPortoneReady, error: portoneError } = usePortone()
  // 서버가 결제를 검증할 수 있는지에 따라 실제 결제창(portone) 또는 개발용 모의 결제(mock)
  const [paymentProvider, setPaymentProvider] = useState(null)

  useEffect(() => {
    getPaymentConfig()
      .then((config) => setPaymentProvider(config.provider))
      .catch(() => setPaymentProvider('unavailable'))
  }, [])

  const isRealPayment = paymentProvider === 'portone'
  // 실제 결제일 때는 현재 PG 채널에서 지원하는 결제수단만 선택 가능
  const isMethodAvailable = (method) => !isRealPayment || method in PORTONE_PAY_METHODS
  const [form, setForm] = useState({
    recipientName: user.name ?? '',
    phone: '',
    postalCode: '',
    address1: user.address ?? '',
    address2: '',
    memoOption: '',
    memo: '',
    paymentMethod: 'card',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 주문은 만들어졌는데 결제가 실패·취소된 경우, 다시 누르면 같은 주문으로 결제만 재시도 (주문 중복 방지)
  const [pendingOrder, setPendingOrder] = useState(null)

  if (isLoading) return <p className={styles.message}>불러오는 중...</p>
  // 장바구니가 비었으면 주문할 게 없으므로 장바구니로 (결제 직후 이동 중에는 제외)
  if (cart.items.length === 0 && !isSubmitting) return <Navigate to="/cart" replace />

  const itemsTotal = cart.totalAmount
  const shippingFee = calculateShippingFee(itemsTotal)
  const total = itemsTotal + shippingFee

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const field = (name) => ({
    id: `checkout-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `checkout-${name}-error` : undefined,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) {
      // 첫 번째 오류 칸으로 이동
      document.getElementById(`checkout-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    if (!isMethodAvailable(form.paymentMethod)) {
      setErrors({ paymentMethod: '지금은 사용할 수 없는 결제 수단입니다.' })
      return
    }
    if (paymentProvider === 'unavailable') {
      setSubmitError('결제 설정이 완료되지 않아 지금은 주문할 수 없습니다.')
      return
    }
    if (isRealPayment && !isPortoneReady) {
      setSubmitError(portoneError || '결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const memo = form.memoOption === '직접 입력' ? form.memo.trim() : form.memoOption
      const shipping = {
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        postalCode: form.postalCode.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
        memo,
      }
      // 1) 주문 생성 (상품·금액은 서버가 장바구니로 계산)
      const order = pendingOrder ?? (await createOrder({ shipping, paymentMethod: form.paymentMethod }))
      setPendingOrder(order)

      if (isRealPayment) {
        // 2) 포트원 결제창 (금액·주문번호는 서버가 만든 주문 값 그대로 사용)
        const { impUid } = await requestPay(IMP, {
          pg: PORTONE_PG,
          pay_method: PORTONE_PAY_METHODS[form.paymentMethod],
          merchant_uid: order.orderNumber,
          name: orderName(order),
          amount: order.totalAmount,
          buyer_email: user.email,
          buyer_name: shipping.recipientName,
          buyer_tel: shipping.phone,
          buyer_addr: `${shipping.address1} ${shipping.address2}`.trim(),
          buyer_postcode: shipping.postalCode,
          // 모바일은 결제 후 이 주소로 이동해서 검증을 이어감
          m_redirect_url: `${window.location.origin}/orders/${order._id}/payment-result`,
        })
        // 3) 서버가 포트원에 직접 결제 내역을 조회해 금액·주문번호를 검증한 뒤 결제 완료 처리
        await payOrder(order._id, impUid)
      } else {
        // 개발용 모의 결제
        await payOrder(order._id)
      }

      navigate(`/orders/${order._id}/complete`, { replace: true })
      // 결제한 상품은 서버에서 장바구니에서 빠지므로 다시 불러옴
      await refresh()
    } catch (err) {
      setSubmitError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <Link to="/cart" className={styles.backLink}>
        ← 장바구니
      </Link>
      <h1 className={styles.title}>{'{Checkout}'}</h1>

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.forms}>
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>배송 정보</legend>
            <div className={styles.cols}>
              <Field id="checkout-recipientName" label="받는 분" error={errors.recipientName}>
                <input {...field('recipientName')} autoComplete="name" />
              </Field>
              <Field id="checkout-phone" label="연락처" error={errors.phone}>
                <input {...field('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" />
              </Field>
            </div>
            <div className={styles.postalRow}>
              <Field id="checkout-postalCode" label="우편번호" error={errors.postalCode}>
                <input
                  {...field('postalCode')}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="5자리"
                />
              </Field>
            </div>
            <Field id="checkout-address1" label="주소" error={errors.address1}>
              <input {...field('address1')} autoComplete="address-line1" placeholder="도로명 주소" />
            </Field>
            <Field id="checkout-address2" label="상세 주소" optional>
              <input {...field('address2')} autoComplete="address-line2" placeholder="동·호수" />
            </Field>
            <Field id="checkout-memoOption" label="배송 요청사항" optional>
              <select {...field('memoOption')}>
                {MEMO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option || '선택 안 함'}
                  </option>
                ))}
              </select>
            </Field>
            {form.memoOption === '직접 입력' && (
              <Field id="checkout-memo" label="요청사항 입력" error={errors.memo}>
                <input {...field('memo')} maxLength={100} />
              </Field>
            )}
          </fieldset>

          <fieldset
            className={styles.section}
            aria-describedby={errors.paymentMethod ? 'checkout-paymentMethod-error' : undefined}
          >
            <legend className={styles.sectionTitle}>결제 수단</legend>
            <div className={styles.methods}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => {
                const available = isMethodAvailable(value)
                return (
                  <label key={value} className={styles.method} data-disabled={!available || undefined}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={value}
                      checked={form.paymentMethod === value}
                      onChange={handleChange}
                      disabled={!available}
                    />
                    <span>
                      {label}
                      {!available && <small className={styles.methodNote}>준비 중</small>}
                    </span>
                  </label>
                )
              })}
            </div>
            {errors.paymentMethod && (
              <p id="checkout-paymentMethod-error" className={styles.fieldError}>
                {errors.paymentMethod}
              </p>
            )}
            <p className={styles.notice} data-payment-provider={paymentProvider ?? 'loading'}>
              {isRealPayment
                ? 'KG이니시스 테스트 결제입니다. 테스트 결제도 실제 승인되며 당일 자동 취소됩니다.'
                : paymentProvider === 'mock'
                  ? '개발용 모의 결제입니다. 결제창 없이 바로 결제 완료됩니다.'
                  : ''}
              {isRealPayment && portoneError && ` (결제 모듈 오류: ${portoneError})`}
            </p>
          </fieldset>
        </div>

        <aside className={styles.summary} aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title" className={styles.sectionTitle}>
            주문 상품 {cart.totalQuantity}개
          </h2>
          <ul className={styles.items}>
            {cart.items.map((item) => (
              <li key={item._id} className={styles.item}>
                <div className={styles.thumb}>
                  {item.product.imageUrl && <img src={item.product.imageUrl} alt="" loading="lazy" />}
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.product.name.split('_')[0]}</span>
                  <span className={styles.muted}>
                    {[item.product.name.split('_')[1], item.size && `Size ${item.size}`, `${item.quantity}개`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <span className={styles.itemPrice}>{formatPrice(item.subtotal)}</span>
              </li>
            ))}
          </ul>

          <dl className={styles.amounts}>
            <div>
              <dt>상품 금액</dt>
              <dd>{formatPrice(itemsTotal)}</dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</dd>
            </div>
            {shippingFee > 0 && (
              <p className={styles.freeShippingHint}>
                {formatPrice(FREE_SHIPPING_THRESHOLD - itemsTotal)} 더 담으면 무료배송
              </p>
            )}
            <div className={styles.totalRow}>
              <dt>총 결제 금액</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          {submitError && (
            <p className={styles.submitError} role="alert">
              {submitError}
            </p>
          )}

          <button type="submit" className={styles.payButton} disabled={isSubmitting}>
            {isSubmitting ? '결제 중...' : `${formatPrice(total)} 결제하기`}
          </button>
        </aside>
      </form>
    </section>
  )
}

export default CheckoutPage
