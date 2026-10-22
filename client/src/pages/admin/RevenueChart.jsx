import { useEffect, useRef, useState } from 'react'
import { formatCompactWon, formatNumber, formatPrice } from '@/utils/format'
import styles from './Admin.module.css'

const HEIGHT = 240
const MARGIN = { top: 12, right: 8, bottom: 28, left: 52 }
const MAX_BAR_WIDTH = 24
const RADIUS = 4

// 눈금을 깔끔한 숫자로 (예: 0 / 50만 / 100만 / 150만)
function niceMax(value) {
  if (value <= 0) return 1
  const step = 10 ** Math.floor(Math.log10(value))
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * step >= value)
  return nice * step
}

// 위쪽 모서리만 둥근 막대 (아래는 기준선에 붙어 있음)
function barPath(x, y, width, height) {
  const r = Math.min(RADIUS, width / 2, height)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

const shortDate = (key) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`

function RevenueChart({ data }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(null)

  // 컨테이너 너비에 맞춰 다시 그림 (반응형)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(wrapRef.current)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const max = niceMax(Math.max(...data.map((d) => d.revenue)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const band = data.length ? plotWidth / data.length : 0
  const barWidth = Math.max(Math.min(MAX_BAR_WIDTH, band - 2), 1)
  const labelEvery = Math.ceil(data.length / Math.max(Math.floor(plotWidth / 56), 1))
  const y = (value) => MARGIN.top + plotHeight - (value / max) * plotHeight

  const activeDay = active !== null ? data[active] : null
  const tooltipLeft = activeDay ? MARGIN.left + band * active + band / 2 : 0

  return (
    <div ref={wrapRef} className={styles.chart} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="일별 매출 막대 차트. 자세한 값은 표로 보기에서 확인할 수 있습니다.">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? styles.chartBaseline : styles.chartGrid}
              />
              <text x={MARGIN.left - 8} y={y(tick)} className={styles.chartTick} textAnchor="end" dominantBaseline="middle">
                {formatCompactWon(tick)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = MARGIN.left + band * i + (band - barWidth) / 2
            const barHeight = (d.revenue / max) * plotHeight
            return (
              <g key={d.date}>
                {barHeight > 0 && (
                  <path
                    d={barPath(x, y(d.revenue), barWidth, barHeight)}
                    className={styles.chartBar}
                    data-active={active === i || undefined}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x + barWidth / 2} y={HEIGHT - 8} className={styles.chartTick} textAnchor="middle">
                    {shortDate(d.date)}
                  </text>
                )}
                {/* 막대보다 넓은 마우스 영역 (막대가 낮거나 0이어도 쉽게 hover) */}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onTouchStart={() => setActive(i)}
                />
              </g>
            )
          })}
        </svg>
      )}

      {activeDay && (
        <div
          className={styles.tooltip}
          style={{ left: Math.min(Math.max(tooltipLeft, 80), width - 80), top: Math.max(y(activeDay.revenue) - 8, 0) }}
          role="status"
        >
          <strong>{activeDay.date}</strong>
          <span>매출 {formatPrice(activeDay.revenue)}</span>
          <span>주문 {formatNumber(activeDay.orders)}건</span>
        </div>
      )}
    </div>
  )
}

export default RevenueChart
