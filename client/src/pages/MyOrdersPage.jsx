import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cancelOrder, getMyOrders } from '@/api/orders'
import Pagination from '@/components/Pagination'
import { useToast } from '@/contexts/ToastContext'
import { CUSTOMER_ORDER_STATUS_LABELS, formatDate, formatPrice } from '@/utils/format'
import styles from './MyOrdersPage.module.css'

const PAGE_SIZE = 5
const TABS = [
  { id: 'all', label: '전체보기' },
  { id: 'processing', label: '상품처리중' },
  { id: 'shipped', label: '배송중' },
  { id: 'delivered', label: '배송완료' },
]
const EMPTY_MESSAGES = {
  all: '아직 주문한 상품이 없습니다.',
  processing: '처리 중인 주문이 없습니다.',
  shipped: '배송 중인 주문이 없습니다.',
  delivered: '배송 완료된 주문이 없습니다.',
}
// 발송 전까지만 취소 가능 (서버와 같은 규칙)
const CANCELLABLE = ['pending', 'paid']

const productTitle = (name) => name.split('_')[0].trim()

function OrderCard({ order, onCancel, isCancelling }) {
  const [first, ...rest] = order.items
  const { courier, trackingNumber } = order.shipping

  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.date}>{formatDate(order.createdAt)}</span>
          <span className={styles.orderNumber}>{order.orderNumber}</span>
        </div>
        <span className={styles.status} data-status={order.status}>
          {CUSTOMER_ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <Link to={`/orders/${order._id}`} className={styles.cardBody}>
        <div className={styles.thumb}>{first.imageUrl && <img src={first.imageUrl} alt="" loading="lazy" />}</div>
        <div className={styles.summary}>
          <span className={styles.productName}>
            {productTitle(first.name)}
            {rest.length > 0 && <span className={styles.muted}> 외 {rest.length}건</span>}
          </span>
          <span className={styles.muted}>
            {[first.size && `Size ${first.size}`, `${first.quantity}개`].filter(Boolean).join(' · ')}
          </span>
          {order.status === 'shipped' && trackingNumber && (
            <span className={styles.tracking}>
              {courier} {trackingNumber}
            </span>
          )}
        </div>
        <span className={styles.amount}>{formatPrice(order.totalAmount)}</span>
      </Link>

      <div className={styles.cardActions}>
        <Link to={`/orders/${order._id}`} className={styles.textButton}>
          주문 상세
        </Link>
        {CANCELLABLE.includes(order.status) && (
          <button type="button" className={styles.textButton} onClick={() => onCancel(order)} disabled={isCancelling}>
            {isCancelling ? '취소 중...' : '주문 취소'}
          </button>
        )}
      </div>
    </li>
  )
}

function MyOrdersPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'all'
  const page = Math.max(Number.parseInt(searchParams.get('page'), 10) || 1, 1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const load = useCallback(
    () =>
      getMyOrders({ tab, page, limit: PAGE_SIZE })
        .then((result) => {
          setData(result)
          setError('')
        })
        .catch((err) => setError(err.message)),
    [tab, page],
  )

  useEffect(() => {
    load()
  }, [load])

  const changeTab = (id) => setSearchParams(id === 'all' ? {} : { tab: id })
  const goToPage = (next) => {
    setSearchParams({ ...(tab !== 'all' && { tab }), ...(next > 1 && { page: String(next) }) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = async (order) => {
    const refundNote = order.status === 'paid' ? '\n결제한 금액은 환불됩니다.' : ''
    if (!window.confirm(`주문 ${order.orderNumber}을(를) 취소할까요?${refundNote}`)) return
    setCancellingId(order._id)
    try {
      await cancelOrder(order._id, '고객 요청')
      toast.show(order.status === 'paid' ? '주문을 취소하고 환불을 요청했습니다' : '주문을 취소했습니다')
      await load()
    } catch (err) {
      toast.show(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{'{My orders}'}</h1>

      <nav className={styles.tabs} aria-label="주문 상태">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.tab}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
            {data && <span className={styles.count}>{data.counts[item.id] ?? 0}</span>}
          </button>
        ))}
      </nav>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {!data && !error && <p className={styles.muted}>불러오는 중...</p>}

      {data?.orders.length === 0 && (
        <div className={styles.empty}>
          <p>{EMPTY_MESSAGES[tab]}</p>
          <Link to="/shop" className={styles.primaryButton}>
            쇼핑하러 가기
          </Link>
        </div>
      )}

      {data?.orders.length > 0 && (
        <ul className={styles.list}>
          {data.orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onCancel={handleCancel}
              isCancelling={cancellingId === order._id}
            />
          ))}
        </ul>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={goToPage} />
      )}
    </section>
  )
}

export default MyOrdersPage
