import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder } from '@/api/orders'
import { CUSTOMER_ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, formatDateTime, formatPrice } from '@/utils/format'
import styles from './OrderCompletePage.module.css'

// variant: 'complete' = 결제 직후 완료 화면, 'detail' = 내 주문 목록에서 들어온 주문 상세
function OrderCompletePage({ variant = 'complete' }) {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <section className={styles.page}>
        <p className={styles.muted}>{error}</p>
        <Link to="/shop" className={styles.secondaryButton}>
          쇼핑하러 가기
        </Link>
      </section>
    )
  }
  if (!order) return <p className={`${styles.page} ${styles.muted}`}>불러오는 중...</p>

  const { shipping, payment } = order
  const isJustPaid = variant === 'complete' && order.status === 'paid'

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{isJustPaid ? '{Thank you}' : '{Order}'}</h1>
        <p className={styles.lead}>
          {isJustPaid ? '주문이 완료되었습니다.' : `주문 상태: ${CUSTOMER_ORDER_STATUS_LABELS[order.status]}`}
        </p>
        <p className={styles.orderNumber}>
          주문번호 <strong>{order.orderNumber}</strong>
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>주문 상품</h2>
        <ul className={styles.items}>
          {order.items.map((item, index) => (
            <li key={`${item.product}-${item.size}-${index}`} className={styles.item}>
              <div className={styles.thumb}>{item.imageUrl && <img src={item.imageUrl} alt="" />}</div>
              <div className={styles.itemInfo}>
                <span>{item.name.split('_')[0]}</span>
                <span className={styles.muted}>
                  {[item.name.split('_')[1], item.size && `Size ${item.size}`, `${item.quantity}개`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <span className={styles.number}>{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <dl className={styles.rows}>
          <div>
            <dt>상품 금액</dt>
            <dd>{formatPrice(order.itemsTotal)}</dd>
          </div>
          <div>
            <dt>배송비</dt>
            <dd>{order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}</dd>
          </div>
          <div className={styles.totalRow}>
            <dt>총 결제 금액</dt>
            <dd>{formatPrice(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>배송·결제 정보</h2>
        <dl className={styles.rows}>
          <div>
            <dt>받는 분</dt>
            <dd>
              {shipping.recipientName} · {shipping.phone}
            </dd>
          </div>
          <div>
            <dt>주소</dt>
            <dd>
              ({shipping.postalCode}) {shipping.address1} {shipping.address2}
            </dd>
          </div>
          {shipping.memo && (
            <div>
              <dt>요청사항</dt>
              <dd>{shipping.memo}</dd>
            </div>
          )}
          {shipping.trackingNumber && (
            <div>
              <dt>송장번호</dt>
              <dd>
                {shipping.courier} {shipping.trackingNumber}
              </dd>
            </div>
          )}
          <div>
            <dt>결제 수단</dt>
            <dd>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</dd>
          </div>
          <div>
            <dt>주문 일시</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.actions}>
        <Link to="/orders" className={styles.secondaryButton}>
          주문 목록 보기
        </Link>
        <Link to="/shop" className={styles.primaryButton}>
          쇼핑 계속하기
        </Link>
      </div>
    </section>
  )
}

export default OrderCompletePage
