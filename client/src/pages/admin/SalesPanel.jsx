import { useEffect, useState } from 'react'
import { getSales } from '@/api/admin'
import { formatNumber, formatPrice } from '@/utils/format'
import RevenueChart from './RevenueChart'
import styles from './Admin.module.css'

const PERIODS = [7, 30, 90]

function SalesPanel() {
  const [days, setDays] = useState(30)
  const [sales, setSales] = useState(null)
  const [error, setError] = useState('')
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    getSales(days)
      .then((data) => {
        setSales(data)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [days])

  const topMax = Math.max(...(sales?.topProducts.map((p) => p.revenue) ?? [0]), 1)

  return (
    <section aria-labelledby="sales-title" className={styles.panel}>
      <div className={styles.sectionHeader}>
        <h2 id="sales-title" className={styles.sectionTitle}>
          매출 분석
        </h2>
        <div className={styles.chips} role="group" aria-label="기간 선택">
          {PERIODS.map((p) => (
            <button key={p} type="button" className={styles.chip} aria-pressed={days === p} onClick={() => setDays(p)}>
              최근 {p}일
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {sales && (
        <>
          <dl className={styles.statGrid}>
            <div className={styles.statTile}>
              <dt className={styles.statLabel}>기간 매출</dt>
              <dd className={styles.statValue}>{formatPrice(sales.revenue)}</dd>
            </div>
            <div className={styles.statTile}>
              <dt className={styles.statLabel}>주문 수</dt>
              <dd className={styles.statValue}>{formatNumber(sales.orderCount)}건</dd>
            </div>
            <div className={styles.statTile}>
              <dt className={styles.statLabel}>평균 주문 금액</dt>
              <dd className={styles.statValue}>{formatPrice(sales.averageOrderValue)}</dd>
            </div>
          </dl>

          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.cardTitle}>일별 매출</h3>
              <button
                type="button"
                className={styles.textButton}
                aria-pressed={showTable}
                onClick={() => setShowTable((v) => !v)}
              >
                {showTable ? '차트로 보기' : '표로 보기'}
              </button>
            </div>
            {sales.revenue === 0 && <p className={styles.empty}>이 기간에는 매출이 없습니다.</p>}
            {sales.revenue > 0 && !showTable && <RevenueChart data={sales.daily} />}
            {sales.revenue > 0 && showTable && (
              <div className={`${styles.tableWrap} ${styles.tableScroll}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">날짜</th>
                      <th scope="col" className={styles.alignRight}>매출</th>
                      <th scope="col" className={styles.alignRight}>주문 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sales.daily].reverse().map((d) => (
                      <tr key={d.date}>
                        <td className={styles.number}>{d.date}</td>
                        <td className={`${styles.alignRight} ${styles.number}`}>{formatPrice(d.revenue)}</td>
                        <td className={`${styles.alignRight} ${styles.number}`}>{formatNumber(d.orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>많이 팔린 상품 TOP 5</h3>
            {sales.topProducts.length === 0 ? (
              <p className={styles.empty}>이 기간에 판매된 상품이 없습니다.</p>
            ) : (
              <ol className={styles.rankList}>
                {sales.topProducts.map((product, index) => (
                  <li key={product.name} className={styles.rankItem}>
                    <div className={styles.rankLabel}>
                      <span className={styles.rankNumber}>{index + 1}</span>
                      <span>{product.name}</span>
                    </div>
                    <div className={styles.rankBarRow}>
                      {/* 막대 길이는 남은 공간(트랙) 기준 비율이라 화면 크기와 상관없이 비교 가능 */}
                      <span className={styles.rankTrack} aria-hidden="true">
                        <span
                          className={styles.rankBar}
                          style={{ width: `${(product.revenue / topMax) * 100}%` }}
                        />
                      </span>
                      <span className={`${styles.rankValue} ${styles.number}`}>
                        {formatPrice(product.revenue)} · {formatNumber(product.quantity)}개
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default SalesPanel
