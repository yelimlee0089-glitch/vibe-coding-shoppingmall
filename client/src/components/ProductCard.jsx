import { Link, useLocation } from 'react-router-dom'
import styles from './ProductCard.module.css'

const formatPrice = (price) => `₩${price.toLocaleString('ko-KR')}`

function ProductCard({ product }) {
  const { _id, name, price, imageUrl, sizes = [] } = product
  const location = useLocation()

  return (
    <article className={styles.card}>
      {/* 카드 전체를 덮는 링크. 지금 보던 목록 주소를 넘겨서 상세 페이지의 '목록으로'가 같은 페이지로 돌아오게 함 */}
      <Link
        to={`/products/${_id}`}
        state={{ from: location.pathname + location.search }}
        className={styles.link}
        aria-label={name}
      />
      <div className={styles.media}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className={styles.image} />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.info}>
        <h2 className={styles.name}>{name}</h2>
        <div className={styles.meta}>
          <p className={styles.price}>{formatPrice(price)}</p>
          {sizes.length > 0 && (
            <p className={styles.sizes}>
              Available Size :
              {sizes.map((size) => (
                <span key={size}>{size}</span>
              ))}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

export default ProductCard
