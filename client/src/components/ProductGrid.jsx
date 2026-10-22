import ProductCard from './ProductCard'
import styles from './ProductGrid.module.css'

function ProductGrid({ products }) {
  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product._id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export default ProductGrid
