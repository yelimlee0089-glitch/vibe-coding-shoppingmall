import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '@/api/products'
import styles from './HomePage.module.css'

// 상품이 화면을 지그재그로 지나가도록 가로 위치를 번갈아 배치 (화면 너비 대비 %)
const POSITIONS = [10, 56, 28, 66, 6, 42]

// 상품명 끝의 색상(예: "_Navy")으로 이미지가 없을 때 보여줄 색을 정함
const SWATCHES = {
  lime: '#c9d86a',
  navy: '#2e3b55',
  charcoal: '#4f5154',
  black: '#1f1f1f',
  oatmeal: '#e2d4bb',
  brown: '#6e4f3c',
  grey: '#a3a29d',
  gray: '#a3a29d',
  white: '#f7f5ef',
  multi: 'linear-gradient(135deg, #2e3b55 0%, #b24a3b 50%, #d9b44a 100%)',
}

// 밝은 색 위에는 어두운 글씨, 어두운 색 위에는 밝은 글씨
function isLight(color) {
  if (!color?.startsWith('#')) return false
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

const formatPrice = (price) => `₩${price.toLocaleString('ko-KR')}`

function splitName(name) {
  const [title, color] = name.split('_')
  return { title: title.trim(), color: color?.trim() }
}

function ProductVisual({ product }) {
  const { title, color } = splitName(product.name)
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={title} loading="lazy" className={styles.image} />
  }
  const swatch = SWATCHES[color?.toLowerCase()]
  return (
    <div
      className={`${styles.swatch} ${!swatch || isLight(swatch) ? styles.swatchLight : ''}`}
      style={{ background: swatch ?? 'var(--color-placeholder)' }}
      role="img"
      aria-label={title}
    >
      {color && <span className={styles.swatchLabel}>{color}</span>}
    </div>
  )
}

function FloatingProduct({ product, index }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const { title } = splitName(product.name)

  // 아래에서 들어올 때 서서히 나타나고, 헤더 쪽(화면 위 15%)에 닿으면 서서히 사라짐
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio > 0.35),
      { rootMargin: '-15% 0px 0px 0px', threshold: [0, 0.35, 0.6] },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <li
      ref={ref}
      className={`${styles.item} ${isVisible ? styles.visible : ''}`}
      style={{ '--x': `${POSITIONS[index % POSITIONS.length]}%` }}
    >
      <ProductVisual product={product} />
      <div className={styles.caption}>
        <p className={styles.name}>{`{${title}}`}</p>
        <p className={styles.meta}>
          {formatPrice(product.price)}
          {product.sizes?.length > 0 && <br />}
          {product.sizes?.join(' / ')}
        </p>
        <Link to={`/products/${product._id}`} className={styles.more}>
          View product
        </Link>
      </div>
    </li>
  )
}

function HomePage() {
  const [products, setProducts] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    // 메인 화면에는 최신 상품 12개만 띄움
    getProducts({ limit: 12 })
      .then((result) => setProducts(result.products))
      .catch(() => setProducts([]))
      .finally(() => setIsLoaded(true))
  }, [])

  // 조금이라도 스크롤하면 가운데 문구를 바꿈
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > window.innerHeight * 0.25)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isEmpty = isLoaded && products.length === 0

  return (
    <div className={styles.home}>
      {/* 화면에 고정된 배경 문구 */}
      <div className={styles.stage}>
        <p className={styles.headline}>
          {hasScrolled ? '{Selected pieces}' : '{ Nice to see you here }'}
        </p>
        <p className={`${styles.hint} ${hasScrolled || isEmpty ? styles.hidden : ''}`}>
          Scroll slowly, take your time.
        </p>
        {isEmpty && <p className={styles.empty}>새로운 상품을 준비하고 있습니다.</p>}

        <p className={styles.tagline}>
          Everyday pieces for a slower life.
          <br />
          Soft. Considered. Made to last.
          <br />
          Tops / Bottoms / Knit / Accessories
        </p>
        <span className={styles.mark} aria-hidden="true">
          LS<sup>®</sup>
        </span>
      </div>

      {/* 스크롤하면 위로 떠오르는 상품들 */}
      {products.length > 0 && (
        <ol className={styles.track} aria-label="추천 상품">
          {products.map((product, index) => (
            <FloatingProduct key={product._id} product={product} index={index} />
          ))}
        </ol>
      )}
    </div>
  )
}

export default HomePage
