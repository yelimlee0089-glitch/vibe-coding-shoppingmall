import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteProduct, getAllProducts } from '@/api/products'
import { useToast } from '@/contexts/ToastContext'
import { formatDate, formatNumber, formatPrice } from '@/utils/format'
import { NEW_PRODUCT_PATH } from './AdminPage'
import styles from './Admin.module.css'

const CATEGORIES = ['Apparel', 'Accessories', 'Meditation', 'Books&Journals']

const SORTS = {
  newest: { label: '최신 등록순', compare: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  priceAsc: { label: '가격 낮은순', compare: (a, b) => a.price - b.price },
  priceDesc: { label: '가격 높은순', compare: (a, b) => b.price - a.price },
  name: { label: '이름순', compare: (a, b) => a.name.localeCompare(b.name, 'ko') },
}

function ProductListPage() {
  const toast = useToast()
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    // 카테고리별 개수·검색·정렬을 한 화면에서 하므로 전체 상품을 모두 불러옴
    getAllProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
  }, [])

  // 카테고리별 개수 (필터 버튼에 표시)
  const counts = useMemo(() => {
    const result = Object.fromEntries(CATEGORIES.map((c) => [c, 0]))
    products?.forEach((p) => {
      if (p.category in result) result[p.category] += 1
    })
    return result
  }, [products])

  const visible = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => !category || p.category === category)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .sort(SORTS[sort].compare)
  }, [products, category, query, sort])

  const handleDelete = async (product) => {
    if (!window.confirm(`'${product.name}' 상품을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return
    setDeletingId(product._id)
    try {
      await deleteProduct(product._id)
      setProducts((prev) => prev.filter((p) => p._id !== product._id))
      toast.show(`'${product.name}' 상품을 삭제했습니다`)
    } catch (err) {
      toast.show(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <Link to="/admin" className={styles.backLink}>
          ← 관리자 대시보드
        </Link>
        <div className={styles.sectionHeader}>
          <h1 className={styles.pageTitle}>{'{등록 상품}'}</h1>
          <Link to={NEW_PRODUCT_PATH} className={styles.primaryButton}>
            + 새 상품 등록
          </Link>
        </div>
        <p className={styles.muted}>
          {products ? `전체 ${formatNumber(products.length)}개 상품` : '상품을 불러오는 중...'}
        </p>
      </div>

      <div className={styles.listToolbar}>
        <div className={styles.chips} role="group" aria-label="카테고리 필터">
          <button type="button" className={styles.chip} aria-pressed={!category} onClick={() => setCategory('')}>
            전체 {products && formatNumber(products.length)}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.chip}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c} {products && formatNumber(counts[c])}
            </button>
          ))}
        </div>
        <div className={styles.listControls}>
          <input
            type="search"
            className={styles.search}
            placeholder="상품명 또는 SKU 검색"
            aria-label="상품 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className={styles.select}
            aria-label="정렬"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {products?.length === 0 && (
        <div className={styles.emptyState}>
          <p>아직 등록한 상품이 없습니다.</p>
          <Link to={NEW_PRODUCT_PATH} className={styles.textButton}>
            첫 상품 등록하기
          </Link>
        </div>
      )}
      {products?.length > 0 && visible.length === 0 && (
        <p className={styles.empty}>조건에 맞는 상품이 없습니다.</p>
      )}

      {visible.length > 0 && (
        <ul className={styles.productGrid}>
          {visible.map((product) => (
            <li key={product._id} className={styles.productCard}>
              <div className={styles.productThumb}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.muted}>이미지 없음</span>
                )}
                <span className={styles.categoryTag}>{product.category ?? '미분류'}</span>
              </div>
              <div className={styles.productInfo}>
                <span className={styles.mono}>{product.sku ?? 'SKU 없음'}</span>
                <h2 className={styles.productName}>{product.name}</h2>
                <p className={styles.productPrice}>{formatPrice(product.price)}</p>
                {product.sizes?.length > 0 && (
                  <p className={styles.subText}>사이즈 {product.sizes.join(' / ')}</p>
                )}
                <div className={styles.productMeta}>
                  <span className={styles.subText}>{formatDate(product.createdAt)} 등록</span>
                  <span className={styles.cardActions}>
                    <Link
                      to={`/admin/products/${product._id}/edit`}
                      className={styles.textButton}
                      aria-label={`${product.name} 수정`}
                    >
                      수정
                    </Link>
                    <button
                    type="button"
                    className={styles.textButton}
                    disabled={deletingId === product._id}
                    onClick={() => handleDelete(product)}
                    aria-label={`${product.name} 삭제`}
                  >
                    {deletingId === product._id ? '삭제 중...' : '삭제'}
                    </button>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ProductListPage
