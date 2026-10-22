import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { payOrder } from '@/api/orders'
import { useCart } from '@/contexts/CartContext'
import styles from './OrderCompletePage.module.css'

// 모바일 결제 후 돌아오는 페이지: /orders/:id/payment-result?imp_uid=...&imp_success=true
// (PC 는 결제창 콜백에서 바로 처리하므로 이 페이지를 거치지 않음)
function PaymentResultPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useCart()
  const [error, setError] = useState('')

  const impUid = searchParams.get('imp_uid')
  const failed =
    searchParams.get('imp_success') === 'false' || searchParams.get('error_code') || !impUid
  const failMessage = searchParams.get('error_msg') || '결제가 완료되지 않았습니다.'

  useEffect(() => {
    if (failed) return
    let cancelled = false
    // 서버가 포트원에 결제 내역을 조회해서 검증
    payOrder(id, impUid)
      .then(async () => {
        if (cancelled) return
        await refresh()
        navigate(`/orders/${id}/complete`, { replace: true })
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [failed, id, impUid, navigate, refresh])

  const message = failed ? failMessage : error
  if (!message) return <p className={`${styles.page} ${styles.muted}`}>결제를 확인하는 중...</p>

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{'{Payment}'}</h1>
        <p className={styles.lead}>{message}</p>
        <p className={styles.orderNumber}>장바구니 상품은 그대로 남아 있습니다.</p>
      </div>
      <div className={styles.actions}>
        <Link to="/checkout" className={styles.primaryButton}>
          다시 결제하기
        </Link>
      </div>
    </section>
  )
}

export default PaymentResultPage
