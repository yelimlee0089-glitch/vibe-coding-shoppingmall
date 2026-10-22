import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/contexts/ToastContext'
import { calculateShippingFee, formatNumber, formatPrice } from '@/utils/format'
import styles from './CartPage.module.css'

const MAX_QUANTITY = 99

function CartItem({ item, onChangeQuantity, onRemove, isBusy }) {
  const { product, size, quantity, subtotal } = item
  const [title, color] = product.name.split('_')

  return (
    <li className={styles.item}>
      <Link to={`/products/${product._id}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
        {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
      </Link>

      <div className={styles.itemInfo}>
        <Link to={`/products/${product._id}`} className={styles.itemName}>
          {title.trim()}
        </Link>
        <p className={styles.itemMeta}>
          {[color?.trim(), size && `Size ${size}`].filter(Boolean).join(' · ') || product.category}
        </p>
        <p className={styles.itemMeta}>{formatPrice(product.price)}</p>

        <div className={styles.itemActions}>
          <div className={styles.stepper} role="group" aria-label={`${product.name} 수량`}>
            <button
              type="button"
              aria-label="수량 줄이기"
              disabled={isBusy || quantity <= 1}
              onClick={() => onChangeQuantity(item, quantity - 1)}
            >
              −
            </button>
            <span aria-live="polite">{quantity}</span>
            <button
              type="button"
              aria-label="수량 늘리기"
              disabled={isBusy || quantity >= MAX_QUANTITY}
              onClick={() => onChangeQuantity(item, quantity + 1)}
            >
              +
            </button>
          </div>
          <button type="button" className={styles.remove} disabled={isBusy} onClick={() => onRemove(item)}>
            Remove
          </button>
        </div>
      </div>

      <p className={styles.subtotal}>{formatPrice(subtotal)}</p>
    </li>
  )
}

function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, clear } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState(null)

  // 한 번에 한 항목씩 처리 (버튼 연타로 수량이 어긋나지 않도록)
  const run = async (id, action) => {
    setBusyId(id)
    try {
      await action()
    } catch (err) {
      toast.show(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleChangeQuantity = (item, quantity) => run(item._id, () => updateQuantity(item._id, quantity))
  const handleRemove = (item) =>
    run(item._id, async () => {
      await removeItem(item._id)
      toast.show(`'${item.product.name}'을(를) 장바구니에서 뺐습니다`)
    })
  const handleClear = () => {
    if (!window.confirm('장바구니를 모두 비울까요?')) return
    run('all', clear)
  }
  const handleCheckout = () => navigate('/checkout')
  const shippingFee = calculateShippingFee(cart.totalAmount)

  const isEmpty = cart.items.length === 0

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{'{Cart}'}</h1>
        {!isEmpty && (
          <button type="button" className={styles.clear} onClick={handleClear} disabled={busyId !== null}>
            Clear all
          </button>
        )}
      </div>

      {isLoading && isEmpty && <p className={styles.muted}>불러오는 중...</p>}

      {!isLoading && isEmpty && (
        <div className={styles.empty}>
          <p>장바구니가 비어 있습니다.</p>
          <Link to="/shop" className={styles.primaryButton}>
            쇼핑하러 가기
          </Link>
        </div>
      )}

      {!isEmpty && (
        <div className={styles.layout}>
          <ul className={styles.list}>
            {cart.items.map((item) => (
              <CartItem
                key={item._id}
                item={item}
                isBusy={busyId === item._id || busyId === 'all'}
                onChangeQuantity={handleChangeQuantity}
                onRemove={handleRemove}
              />
            ))}
          </ul>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={styles.summaryTitle}>
              Order summary
            </h2>
            <dl className={styles.summaryRows}>
              <div>
                <dt>상품 수</dt>
                <dd>{formatNumber(cart.totalQuantity)}개</dd>
              </div>
              <div>
                <dt>상품 금액</dt>
                <dd>{formatPrice(cart.totalAmount)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>총 결제 금액</dt>
                <dd>{formatPrice(cart.totalAmount + shippingFee)}</dd>
              </div>
            </dl>
            <button type="button" className={styles.primaryButton} onClick={handleCheckout}>
              Checkout
            </button>
            <Link to="/shop" className={styles.continue}>
              쇼핑 계속하기
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}

export default CartPage
