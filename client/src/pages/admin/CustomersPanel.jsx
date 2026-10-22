import { useEffect, useState } from 'react'
import { getCustomers } from '@/api/admin'
import { formatDate, formatNumber, formatPrice } from '@/utils/format'
import styles from './Admin.module.css'

function CustomersPanel() {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState(null)
  const [error, setError] = useState('')

  // 입력이 멈추고 0.3초 뒤에 검색 (글자마다 요청하지 않도록)
  useEffect(() => {
    const timer = setTimeout(() => {
      getCustomers(query.trim())
        .then((data) => {
          setCustomers(data)
          setError('')
        })
        .catch((err) => setError(err.message))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <section aria-labelledby="customers-title" className={styles.panel}>
      <div className={styles.sectionHeader}>
        <h2 id="customers-title" className={styles.sectionTitle}>
          고객 관리
        </h2>
        {customers && <span className={styles.muted}>{formatNumber(customers.length)}명</span>}
      </div>

      <input
        type="search"
        className={styles.search}
        placeholder="이름 또는 이메일로 검색"
        aria-label="고객 검색"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {error && <p className={styles.error} role="alert">{error}</p>}
      {customers?.length === 0 && (
        <p className={styles.empty}>{query ? '검색 결과가 없습니다.' : '아직 가입한 고객이 없습니다.'}</p>
      )}

      {customers?.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">주소</th>
                <th scope="col">가입일</th>
                <th scope="col" className={styles.alignRight}>주문 수</th>
                <th scope="col" className={styles.alignRight}>구매 금액</th>
                <th scope="col">최근 주문</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td className={styles.nowrap}>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.address || <span className={styles.muted}>-</span>}</td>
                  <td className={styles.nowrap}>{formatDate(customer.createdAt)}</td>
                  <td className={`${styles.alignRight} ${styles.number}`}>{formatNumber(customer.orderCount)}</td>
                  <td className={`${styles.alignRight} ${styles.number}`}>{formatPrice(customer.totalSpent)}</td>
                  <td className={styles.nowrap}>{formatDate(customer.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default CustomersPanel
