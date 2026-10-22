import styles from './Pagination.module.css'

// 현재 페이지 주변만 보여주고 나머지는 … 으로 줄임 (예: 1 … 4 5 6 … 12)
function getPageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['gap-' + p, p] : [p]))
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className={styles.pagination} aria-label="페이지 이동">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </button>
      <ol>
        {getPageItems(page, totalPages).map((item) =>
          typeof item === 'string' ? (
            <li key={item} aria-hidden="true" className={styles.gap}>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`${item}페이지`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ol>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  )
}

export default Pagination
