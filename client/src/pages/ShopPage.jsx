import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '@/api/products'
import FilterPanel from '@/components/FilterPanel'
import Pagination from '@/components/Pagination'
import ProductGrid from '@/components/ProductGrid'
import styles from './ShopPage.module.css'

const PAGE_SIZE = 4
const SORTS = ['newest', 'price-asc', 'price-desc']
// 서버 Product 모델의 카테고리와 같은 값
const CATEGORIES = ['Apparel', 'Accessories', 'Meditation', 'Books&Journals']
const TABS = [{ value: '', label: 'All products' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]

function ShopPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const tabsRef = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  // 페이지·정렬·사이즈를 주소에 저장 (새로고침·뒤로가기·링크 공유에도 유지)
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number.parseInt(searchParams.get('page'), 10) || 1, 1)
  const sort = SORTS.includes(searchParams.get('sort')) ? searchParams.get('sort') : 'newest'
  const category = CATEGORIES.includes(searchParams.get('category')) ? searchParams.get('category') : ''
  // 사이즈는 의류에만 있어서 전체·Apparel 에서만 사이즈 필터를 씀
  const canFilterSizes = !category || category === 'Apparel'
  const sizesParam = canFilterSizes ? (searchParams.get('sizes') ?? '') : ''
  const selectedSizes = sizesParam ? sizesParam.split(',') : []

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      const isDefault =
        value === '' || (key === 'page' && value === 1) || (key === 'sort' && value === 'newest')
      if (isDefault) next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  useEffect(() => {
    let cancelled = false
    getProducts({
      page,
      limit: PAGE_SIZE,
      sort,
      category: category || undefined,
      sizes: sizesParam || undefined,
    })
      .then((result) => {
        if (cancelled) return
        // 상품이 줄어서 지금 페이지가 비었으면 마지막 페이지로
        const { totalPages } = result.pagination
        if (result.products.length === 0 && page > totalPages) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              if (totalPages > 1) next.set('page', totalPages)
              else next.delete('page')
              return next
            },
            { replace: true },
          )
          return
        }
        setData(result)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [page, sort, category, sizesParam, setSearchParams])

  // 모바일에서 탭 줄이 잘려도 선택한 카테고리가 보이도록 가로로 스크롤
  useEffect(() => {
    const nav = tabsRef.current
    const active = nav?.querySelector('[aria-current="page"]')
    if (!nav || !active) return

    const ensureVisible = () => {
      const left = active.offsetLeft - nav.offsetLeft
      const right = left + active.offsetWidth
      // 왼쪽으로 잘렸으면 탭 시작에, 오른쪽으로 잘렸으면 탭 끝에 맞춤
      if (left < nav.scrollLeft) nav.scrollLeft = left
      else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = right - nav.clientWidth
    }

    // 상품 수 "(N)"가 붙거나 웹폰트가 늦게 적용되면 탭 너비가 바뀌므로 크기 변화도 감시
    const observer = new ResizeObserver(ensureVisible)
    observer.observe(active)
    return () => observer.disconnect()
  }, [category])

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 카테고리를 바꾸면 1페이지부터, 사이즈가 없는 카테고리면 사이즈 필터도 해제
  const changeCategory = (value) => {
    const keepSizes = !value || value === 'Apparel'
    updateParams({ category: value, page: 1, ...(keepSizes ? {} : { sizes: '' }) })
  }

  // 정렬·필터가 바뀌면 1페이지부터
  const changeSort = (value) => updateParams({ sort: value, page: 1 })
  const toggleSize = (size) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size]
    updateParams({ sizes: next.join(','), page: 1 })
  }
  const resetFilters = () => updateParams({ sort: 'newest', sizes: '', page: 1 })

  const products = data?.products ?? []
  const pagination = data?.pagination

  return (
    <>
      <div className={styles.toolbar}>
        <h1 className={styles.visuallyHidden}>Wellness Shop · {category || 'All products'}</h1>
        <nav ref={tabsRef} className={styles.tabs} aria-label="카테고리">
          {TABS.map((tab) => {
            const isActive = tab.value === category
            return (
              <button
                key={tab.label}
                type="button"
                className={styles.tab}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => changeCategory(tab.value)}
              >
                {tab.label}
                {/* 지금 보고 있는 카테고리의 상품 수 */}
                {isActive && pagination && <span className={styles.count}> ({pagination.total})</span>}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          className={styles.filterButton}
          aria-expanded={isFilterOpen}
          aria-controls="filter-panel"
          onClick={() => setIsFilterOpen((open) => !open)}
        >
          Filter <span aria-hidden="true">{isFilterOpen ? '−' : '+'}</span>
        </button>
      </div>
      <FilterPanel
        isOpen={isFilterOpen}
        showSizes={canFilterSizes}
        sort={sort}
        onSortChange={changeSort}
        selectedSizes={selectedSizes}
        onToggleSize={toggleSize}
        onReset={resetFilters}
      />

      {!data && !error && <p className={styles.status}>불러오는 중...</p>}
      {error && <p className={`${styles.status} ${styles.error}`}>상품을 불러오지 못했습니다: {error}</p>}
      {data && products.length === 0 && (
        <p className={styles.status}>
          {category && !sizesParam ? `${category} 카테고리에 등록된 상품이 없습니다.` : '조건에 맞는 상품이 없습니다.'}
        </p>
      )}
      {products.length > 0 && <ProductGrid products={products} />}
      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={goToPage} />
      )}
    </>
  )
}

export default ShopPage
