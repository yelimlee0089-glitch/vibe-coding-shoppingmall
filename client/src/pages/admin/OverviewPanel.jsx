import { useEffect, useState } from 'react'
import { getOrders, getStats } from '@/api/admin'
import { formatDateTime, formatNumber, formatPrice } from '@/utils/format'
import StatusBadge from './StatusBadge'
import styles from './Admin.module.css'

const TASKS = [
  {
    id: 'products',
    title: '새 상품 등록',
    description: '상품명, 가격, 사이즈, 이미지를 입력해 새 상품을 올립니다.',
  },
  {
    id: 'productList',
    title: '등록 상품 보기',
    description: '등록한 상품을 한눈에 보고, 카테고리별로 찾거나 삭제합니다.',
    hint: (counts, stats) => stats && `등록 상품 ${formatNumber(stats.totalProducts)}개`,
  },
  {
    id: 'orders',
    title: '주문 관리',
    description: '주문을 확인하고 결제·배송 상태를 바꿉니다.',
    hint: (counts) => counts && `처리 대기 ${formatNumber(counts.pending + counts.paid)}건`,
  },
  {
    id: 'sales',
    title: '매출 분석',
    description: '기간별 매출 추이와 많이 팔린 상품을 확인합니다.',
  },
  {
    id: 'customers',
    title: '고객 관리',
    description: '고객을 검색하고 주문 수와 구매 금액을 확인합니다.',
  },
]

function OverviewPanel({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getStats(), getOrders({ limit: 5 })])
      .then(([statsData, ordersData]) => {
        setStats(statsData)
        setRecent(ordersData)
      })
      .catch((err) => setError(err.message))
  }, [])

  const tiles = [
    { label: '총 주문 수', value: stats && `${formatNumber(stats.totalOrders)}건` },
    { label: '총 상품 수', value: stats && `${formatNumber(stats.totalProducts)}개` },
    { label: '총 고객 수', value: stats && `${formatNumber(stats.totalCustomers)}명` },
    { label: '총 매출', value: stats && formatPrice(stats.totalRevenue), note: '취소 주문 제외' },
  ]

  return (
    <div className={styles.stack}>
      {error && <p className={styles.error} role="alert">{error}</p>}

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className={styles.sectionTitle}>
          관리자 대시보드
        </h2>
        <dl className={styles.statGrid}>
          {tiles.map((tile) => (
            <div key={tile.label} className={styles.statTile}>
              <dt className={styles.statLabel}>{tile.label}</dt>
              <dd className={styles.statValue}>{tile.value ?? <span className={styles.skeleton} />}</dd>
              {tile.note && <dd className={styles.statNote}>{tile.note}</dd>}
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className={styles.sectionTitle}>
          작업 대시보드
        </h2>
        <div className={styles.taskGrid}>
          {TASKS.map((task) => (
            <button
              key={task.id}
              type="button"
              className={styles.taskCard}
              onClick={() => onNavigate(task.id)}
            >
              <span className={styles.taskTitle}>{`{${task.title}}`}</span>
              <span className={styles.taskDescription}>{task.description}</span>
              <span className={styles.taskFooter}>
                <span>{task.hint?.(recent?.counts, stats)}</span>
                <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-title">
        <div className={styles.sectionHeader}>
          <h2 id="recent-title" className={styles.sectionTitle}>
            최근 주문
          </h2>
          <button type="button" className={styles.textButton} onClick={() => onNavigate('orders')}>
            전체 보기
          </button>
        </div>
        {recent?.orders.length === 0 && <p className={styles.empty}>아직 주문이 없습니다.</p>}
        {recent?.orders.length > 0 && (
          <ul className={styles.recentList}>
            {recent.orders.map((order) => (
              <li key={order._id} className={styles.recentItem}>
                <span className={styles.muted}>{formatDateTime(order.createdAt)}</span>
                <span>{order.user?.name ?? '탈퇴 회원'}</span>
                <span className={styles.number}>{formatPrice(order.totalAmount)}</span>
                <StatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default OverviewPanel
