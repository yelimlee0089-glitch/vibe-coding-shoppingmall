import { useCallback, useEffect, useState } from 'react'
import { getOrders, updateOrderStatus } from '@/api/admin'
import { useToast } from '@/contexts/ToastContext'
import { ORDER_STATUS_LABELS, formatDateTime, formatNumber, formatPrice } from '@/utils/format'
import StatusBadge from './StatusBadge'
import styles from './Admin.module.css'

const STATUSES = Object.keys(ORDER_STATUS_LABELS)

// 새 주문은 주문번호(20261018-7K3QX2), 예전 주문은 ID 끝 6자리
const orderLabel = (order) => order.orderNumber ?? `#${order._id.slice(-6).toUpperCase()}`

function summarizeItems(items) {
  if (!items.length) return '-'
  const [first, ...rest] = items
  return rest.length ? `${first.name} 외 ${rest.length}건` : first.name
}

function OrdersPanel() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const load = useCallback(
    () =>
      getOrders({ status: status || undefined, limit: 100 })
        .then((result) => {
          setData(result)
          setError('')
        })
        .catch((err) => setError(err.message)),
    [status],
  )

  useEffect(() => {
    load()
  }, [load])

  const handleStatusChange = async (order, nextStatus) => {
    setUpdatingId(order._id)
    try {
      await updateOrderStatus(order._id, nextStatus)
      toast.show(`주문 상태를 '${ORDER_STATUS_LABELS[nextStatus]}'(으)로 변경했습니다`)
      await load()
    } catch (err) {
      toast.show(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const total = data ? Object.values(data.counts).reduce((sum, n) => sum + n, 0) : 0

  return (
    <section aria-labelledby="orders-title" className={styles.panel}>
      <h2 id="orders-title" className={styles.sectionTitle}>
        주문 관리
      </h2>

      <div className={styles.chips} role="group" aria-label="주문 상태 필터">
        <button type="button" className={styles.chip} aria-pressed={status === ''} onClick={() => setStatus('')}>
          전체 {data && formatNumber(total)}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.chip}
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
          >
            {ORDER_STATUS_LABELS[s]} {data && formatNumber(data.counts[s])}
          </button>
        ))}
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {data?.orders.length === 0 && <p className={styles.empty}>해당하는 주문이 없습니다.</p>}

      {data?.orders.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">주문일시</th>
                <th scope="col">주문번호</th>
                <th scope="col">고객</th>
                <th scope="col">상품</th>
                <th scope="col" className={styles.alignRight}>금액</th>
                <th scope="col">상태</th>
                <th scope="col">상태 변경</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order._id}>
                  <td className={styles.nowrap}>{formatDateTime(order.createdAt)}</td>
                  <td className={`${styles.mono} ${styles.nowrap}`}>{orderLabel(order)}</td>
                  <td>
                    {order.user?.name ?? '탈퇴 회원'}
                    {order.user && <span className={styles.subText}>{order.user.email}</span>}
                  </td>
                  <td>{summarizeItems(order.items)}</td>
                  <td className={`${styles.alignRight} ${styles.number}`}>{formatPrice(order.totalAmount)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <select
                      className={styles.select}
                      value={order.status}
                      disabled={updatingId === order._id}
                      aria-label={`주문 ${orderLabel(order)} 상태 변경`}
                      onChange={(event) => handleStatusChange(order, event.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default OrdersPanel
