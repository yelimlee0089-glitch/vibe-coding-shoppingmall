import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProduct, getProducts } from '@/api/products'
import ProductGrid from '@/components/ProductGrid'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { formatPrice } from '@/utils/format'
import styles from './ProductDetailPage.module.css'

const RELATED_COUNT = 4
// 서버 장바구니와 같은 한도
const MAX_QUANTITY = 99

function ProductDetail({ id }) {
  const location = useLocation()
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [error, setError] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [sizeError, setSizeError] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const changeQuantity = (next) => setQuantity(Math.min(Math.max(next, 1), MAX_QUANTITY))
  // 직접 입력: 숫자만 받고, 비우면 입력 중으로 보고 칸을 벗어날 때 1로 맞춤
  const handleQuantityInput = (event) => {
    const digits = event.target.value.replace(/\D/g, '')
    setQuantity(digits === '' ? '' : Math.min(Number(digits), MAX_QUANTITY))
  }

  // 목록에서 넘어왔으면 그 목록(페이지·카테고리 유지)으로, 아니면 전체 상품으로
  const backTo = location.state?.from ?? '/shop'

  useEffect(() => {
    let cancelled = false
    window.scrollTo({ top: 0 })

    getProduct(id)
      .then(async (data) => {
        if (cancelled) return
        setProduct(data)
        // 같은 카테고리의 다른 상품
        if (data.category) {
          const result = await getProducts({ category: data.category, limit: RELATED_COUNT + 1 })
          if (!cancelled) setRelated(result.products.filter((p) => p._id !== data._id).slice(0, RELATED_COUNT))
        }
      })
      .catch((err) => !cancelled && setError(err.message))

    return () => {
      cancelled = true
    }
  }, [id])

  const handleAddToCart = async () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      setSizeError(true)
      return
    }
    // 장바구니는 회원 전용: 로그인 후 이 상품 페이지로 돌아옴
    if (!user) {
      toast.show('로그인 후 장바구니에 담을 수 있습니다')
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setIsAdding(true)
    try {
      const count = Number(quantity) || 1
      await addItem({ productId: product._id, size: selectedSize, quantity: count })
      const detail = [selectedSize, `${count}개`].filter(Boolean).join(' · ')
      toast.show(`장바구니에 담았습니다 (${detail})`)
      setQuantity(1)
    } catch (err) {
      toast.show(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  if (error) {
    return (
      <section className={styles.message}>
        <p>{error === '상품을 찾을 수 없습니다.' || error.startsWith('잘못된') ? '상품을 찾을 수 없습니다.' : error}</p>
        <Link to="/shop" className={styles.textLink}>
          상품 목록으로
        </Link>
      </section>
    )
  }

  if (!product) return <p className={styles.message}>불러오는 중...</p>

  const [title, color] = product.name.split('_')
  const hasSizes = product.sizes?.length > 0

  return (
    <>
      <article className={styles.detail}>
        <div className={styles.media}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className={styles.image} />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}
        </div>

        <div className={styles.info}>
          <nav className={styles.breadcrumb} aria-label="위치">
            <Link to={backTo}>← Back</Link>
            {product.category && (
              <>
                <span aria-hidden="true">/</span>
                <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
              </>
            )}
          </nav>

          <h1 className={styles.name}>{`{${title.trim()}}`}</h1>
          {color && <p className={styles.color}>{color.trim()}</p>}
          <p className={styles.price}>{formatPrice(product.price)}</p>

          {product.description && <p className={styles.description}>{product.description}</p>}

          {hasSizes && (
            <fieldset className={styles.sizes} aria-describedby={sizeError ? 'size-error' : undefined}>
              <legend>Size</legend>
              <div className={styles.sizeOptions}>
                {product.sizes.map((size) => (
                  <label key={size} className={styles.sizeOption}>
                    <input
                      type="radio"
                      name="size"
                      value={size}
                      checked={selectedSize === size}
                      onChange={() => {
                        setSelectedSize(size)
                        setSizeError(false)
                      }}
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </div>
              {sizeError && (
                <p id="size-error" className={styles.sizeError} role="alert">
                  사이즈를 선택해 주세요.
                </p>
              )}
            </fieldset>
          )}

          <div className={styles.quantityRow}>
            <span className={styles.label} id="quantity-label">
              Quantity
            </span>
            <div className={styles.stepper} role="group" aria-labelledby="quantity-label">
              <button
                type="button"
                aria-label="수량 줄이기"
                disabled={Number(quantity) <= 1}
                onClick={() => changeQuantity(Number(quantity) - 1)}
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="수량"
                value={quantity}
                onChange={handleQuantityInput}
                onBlur={() => changeQuantity(Number(quantity) || 1)}
              />
              <button
                type="button"
                aria-label="수량 늘리기"
                disabled={Number(quantity) >= MAX_QUANTITY}
                onClick={() => changeQuantity(Number(quantity) + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* 선택한 수량만큼의 금액 */}
          <p className={styles.total} aria-live="polite">
            <span>Total</span>
            <span>{formatPrice(product.price * (Number(quantity) || 1))}</span>
          </p>

          <button type="button" className={styles.addToCart} onClick={handleAddToCart} disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add to cart'}
          </button>
          <Link to="/cart" className={styles.viewCart}>
            View cart
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title" className={styles.relatedTitle}>
            {`More from ${product.category}`}
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  )
}

// 다른 상품으로 이동하면(관련 상품 클릭 등) key 가 바뀌어 선택한 사이즈 등 상태가 새로 시작됨
function ProductDetailPage() {
  const { id } = useParams()
  return <ProductDetail key={id} id={id} />
}

export default ProductDetailPage
